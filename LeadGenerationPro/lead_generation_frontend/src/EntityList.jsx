import React, { useState, useEffect } from "react";
import "./EntityList.css";
const EntityList = () => {
  const [entities, setEntities] = useState([]);
  const [expandedEntity, setExpandedEntity] = useState(null);
  const [editingEntity, setEditingEntity] = useState(null);
  const [editAttributes, setEditAttributes] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://127.0.0.1:8000/entities");
      const data = await response.json();
      
      if (data.entities) {
        // Fetch detailed info for each entity to get column types and row counts
        const entitiesWithDetails = await Promise.all(
          data.entities.map(async (entity) => {
            const detailResponse = await fetchEntityInfo(entity.name);
            if (detailResponse) {
              return {
                name: entity.name,
                columns: detailResponse.columns,
                row_count: detailResponse.row_count
              };
            } else {
              // Fallback if detailed info fails
              return {
                name: entity.name,
                columns: entity.columns.map(col => ({ name: col, type: "unknown", nullable: "YES" })),
                row_count: 0
              };
            }
          })
        );
        setEntities(entitiesWithDetails);
      } else {
        setEntities([]);
      }
    } catch (error) {
      setResponse({ type: "error", message: "Failed to fetch entities" });
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntityInfo = async (entityName) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/entity-info/${entityName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        return data;
      }
    } catch (error) {
      console.error("Error fetching entity info:", error);
    }
    return null;
  };

  const toggleExpand = (entityName) => {
    setExpandedEntity(expandedEntity === entityName ? null : entityName);
    setEditingEntity(null);
  };

  const startEditing = (entity) => {
    setEditingEntity(entity.name);
    // Filter out id column and prepare for editing
    const editableAttrs = entity.columns
      .filter(col => col.name !== "id")
      .map(col => ({
        name: col.name,
        originalName: col.name, // Keep track of original name for renames
        datatype: mapSqlTypeToFormType(col.type),
        action: 'keep' // 'keep', 'add', 'remove', 'rename'
      }));
    setEditAttributes(editableAttrs);
  };

  const mapSqlTypeToFormType = (sqlType) => {
    if (sqlType.includes('character') || sqlType.includes('text')) return 'text';
    if (sqlType.includes('integer') || sqlType.includes('bigint')) return 'int';
    if (sqlType.includes('boolean')) return 'bool';
    if (sqlType.includes('numeric') || sqlType.includes('decimal')) return 'Float';
    if (sqlType.includes('timestamp') || sqlType.includes('date')) return 'Date';
    return 'text';
  };

  const addAttribute = () => {
    setEditAttributes([...editAttributes, { 
      name: "", 
      originalName: null, 
      datatype: "text", 
      action: 'add' 
    }]);
  };

  const updateAttribute = (index, field, value) => {
    const updated = [...editAttributes];
    updated[index][field] = value;
    
    // Track if this is a rename operation
    if (field === 'name' && updated[index].originalName && updated[index].originalName !== value) {
      updated[index].action = 'rename';
    } else if (field === 'name' && updated[index].originalName && updated[index].originalName === value) {
      updated[index].action = 'keep';
    }
    
    setEditAttributes(updated);
  };

  const removeAttribute = (index) => {
    const attr = editAttributes[index];
    
    // If it's an existing column, mark for deletion instead of removing from array
    if (attr.originalName) {
      const updated = [...editAttributes];
      updated[index].action = 'remove';
      setEditAttributes(updated);
    } else {
      // If it's a new attribute, remove from array
      setEditAttributes(editAttributes.filter((_, i) => i !== index));
    }
  };

  const undoRemove = (index) => {
    const updated = [...editAttributes];
    updated[index].action = 'keep';
    setEditAttributes(updated);
  };

  const saveChanges = async () => {
    if (!editingEntity) return;

    try {
      // Separate different types of operations
      const toAdd = editAttributes.filter(attr => attr.action === 'add' && attr.name.trim());
      const toRename = editAttributes.filter(attr => attr.action === 'rename' && attr.name.trim());
      const toRemove = editAttributes.filter(attr => attr.action === 'remove');

      let allSuccessful = true;
      let operations = [];

      // 1. Add new columns
      if (toAdd.length > 0) {
        const addPayload = {
          name: editingEntity,
          attributes: toAdd.map(attr => ({ name: attr.name, datatype: attr.datatype }))
        };

        const addResponse = await fetch(`http://127.0.0.1:8000/edit-entity/${editingEntity}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addPayload),
        });
        const addData = await addResponse.json();
        
        if (addData.success) {
          operations.push(`Added ${toAdd.length} column(s)`);
        } else {
          allSuccessful = false;
        }
      }

      // 2. Remove columns
      for (const attr of toRemove) {
        const removeResponse = await fetch(`http://127.0.0.1:8000/delete-column/${editingEntity}/${attr.originalName}`, {
          method: "DELETE"
        });
        const removeData = await removeResponse.json();
        
        if (removeData.success) {
          operations.push(`Removed column '${attr.originalName}'`);
        } else {
          allSuccessful = false;
        }
      }

      // 3. Rename columns (using ALTER TABLE RENAME COLUMN)
      for (const attr of toRename) {
        // Note: You'll need to add a rename endpoint to your backend
        const renameResponse = await fetch(`http://127.0.0.1:8000/rename-column/${editingEntity}/${attr.originalName}/${attr.name}`, {
          method: "PUT"
        });
        
        if (renameResponse.ok) {
          const renameData = await renameResponse.json();
          if (renameData.success) {
            operations.push(`Renamed '${attr.originalName}' to '${attr.name}'`);
          } else {
            allSuccessful = false;
          }
        } else {
          // If rename endpoint doesn't exist, show warning
          operations.push(`Warning: Rename not supported for '${attr.originalName}' to '${attr.name}'`);
        }
      }

      if (allSuccessful && operations.length > 0) {
        setResponse({ 
          type: "success", 
          message: `Entity updated successfully: ${operations.join(', ')}` 
        });
      } else if (operations.length > 0) {
        setResponse({ 
          type: "success", 
          message: `Partially updated: ${operations.join(', ')}` 
        });
      } else {
        setResponse({ type: "error", message: "No changes were made" });
      }

      setEditingEntity(null);
      fetchEntities(); // Refresh the list

    } catch (error) {
      setResponse({ type: "error", message: "Something went wrong during update!" });
    }

    setTimeout(() => setResponse(null), 7000);
  };

  const deleteEntity = async (entityName) => {
    if (!confirm(`Are you sure you want to delete entity "${entityName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/delete-entity/${entityName}`, {
        method: "DELETE"
      });
      const data = await response.json();

      if (data.success) {
        setResponse({ type: "success", message: data.message });
        setExpandedEntity(null);
        setEditingEntity(null);
        fetchEntities(); // Refresh the list
      } else {
        setResponse({ type: "error", message: "Failed to delete entity" });
      }
    } catch (error) {
      setResponse({ type: "error", message: "Something went wrong!" });
    }

    setTimeout(() => setResponse(null), 5000);
  };

  const cancelEditing = () => {
    setEditingEntity(null);
    setEditAttributes([]);
  };

  if (loading) {
    return (
      <div className="schema-wrapper">
        <div className="schema-card">
          <h1 className="schema-heading">Loading Entities...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="schema-wrapper">
      <div className="schema-card">
        <h1 className="schema-heading">List of Entities</h1>
        
        {response && (
          <div className={`response ${response.type}`}>
            {response.message}
          </div>
        )}

        {entities.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#e2e8f0', fontSize: '1.2rem', margin: '2rem 0' }}>
            No entities found. Create your first entity!
          </div>
        ) : (
          <div className="entities-container">
            {entities.map((entity) => (
              <div key={entity.name} className="entity-card">
                <div className="entity-header">
                  <div className="entity-info">
                    <h3 className="entity-name">{entity.name}</h3>
                    <span className="entity-stats">
                      {entity.columns?.length || 0} columns • {entity.row_count || 0} rows
                    </span>
                  </div>
                  <div className="entity-actions">
                    <button 
                      className="btn expand-btn"
                      onClick={() => toggleExpand(entity.name)}
                    >
                      {expandedEntity === entity.name ? "Collapse" : "Expand"}
                    </button>
                    <button 
                      className="btn remove-btn"
                      onClick={() => deleteEntity(entity.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {expandedEntity === entity.name && (
                  <div className="entity-details">
                    <h4 className="schema-subheading">Attributes</h4>
                    
                    {editingEntity === entity.name ? (
                      <div className="edit-form">
                        {editAttributes.map((attr, index) => (
                          <div key={index} className={`field-row ${attr.action === 'remove' ? 'marked-for-deletion' : ''}`}>
                            {attr.action === 'remove' ? (
                              <div className="deletion-notice">
                                <span className="deleted-text text-white bold">
                                  Column '{attr.originalName}' will be deleted
                                </span>
                                <button
                                  className="ms-3 btn undo-btn"
                                  onClick={() => undoRemove(index)}
                                >
                                  Undo
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="input-container">
                                  <input
                                    type="text"
                                    placeholder="Attribute name"
                                    value={attr.name}
                                    onChange={(e) => updateAttribute(index, "name", e.target.value)}
                                  />
                                  {attr.action === 'rename' && (
                                    <small className="rename-notice">
                                      Will rename from '{attr.originalName}'
                                    </small>
                                  )}
                                  {attr.action === 'add' && (
                                    <small className="add-notice">New column</small>
                                  )}
                                </div>
                                <select
                                  className="field-type-select"
                                  value={attr.datatype}
                                  onChange={(e) => updateAttribute(index, "datatype", e.target.value)}
                                >
                                  <option value="text">String</option>
                                  <option value="int">Integer</option>
                                  <option value="bool">Boolean</option>
                                  <option value="Float">Float</option>
                                  <option value="Date">Date</option>
                                </select>
                                <button
                                  className="btn remove-btn"
                                  onClick={() => removeAttribute(index)}
                                >
                                  {attr.originalName ? 'Delete' : 'Remove'}
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                        
                        <div className="edit-actions">
                          <button className="btn add-btn" onClick={addAttribute}>
                            + Add Attribute
                          </button>
                          <div className="button-group">
                            <button className="btn save-btn" onClick={saveChanges}>
                              Save Changes
                            </button>
                            <button className="btn cancel-btn" onClick={cancelEditing}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="attributes-list">
                        {entity.columns?.map((column) => (
                          <div key={column.name} className="attribute-item">
                            <span className="attr-name">{column.name}</span>
                            <span className="attr-type">{column.type}</span>
                            <span className={`attr-nullable ${column.nullable === 'NO' ? 'required' : ''}`}>
                              {column.nullable === 'NO' ? 'Required' : 'Optional'}
                            </span>
                          </div>
                        ))}
                        
                        <div className="view-actions">
                          <button 
                            className="btn save-btn"
                            onClick={() => startEditing(entity)}
                          >
                            Edit Entity
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      
    </div>
  );
};

export default EntityList;