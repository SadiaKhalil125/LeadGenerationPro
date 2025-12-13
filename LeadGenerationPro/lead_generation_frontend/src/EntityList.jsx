import React, { useState, useEffect } from "react";
import { 
  Database, 
  Edit3, 
  Trash2, 
  Plus, 
  Save, 
  X, 
  ChevronDown, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle, 
  Undo, 
  Columns, 
  List, 
  Search, 
  RefreshCw, 
  Shield, 
  Type,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API_BASE from "./api_base";
const EntityList = () => {
  const [entities, setEntities] = useState([]);
  const [expandedEntity, setExpandedEntity] = useState(null);
  const [editingEntity, setEditingEntity] = useState(null);
  const [editAttributes, setEditAttributes] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/entity/entities`, {
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.entities) {
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
      console.error("Error fetching entities:", error);
      setResponse({ type: "error", message: `Failed to fetch entities: ${error.message}` });
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntityInfo = async (entityName) => {
    try {
      const response = await fetch(`${API_BASE}/entity/entity-info/${entityName}`, {
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      
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
    const editableAttrs = entity.columns
      .filter(col => col.name !== "id")
      .map(col => ({
        name: col.name,
        originalName: col.name,
        datatype: mapSqlTypeToFormType(col.type),
        nullable: col.nullable === 'NO' ? 'required' : 'optional',
        action: 'keep'
      }));
    setEditAttributes(editableAttrs);
  };

  const mapSqlTypeToFormType = (sqlType) => {
    if (sqlType.includes('character') || sqlType.includes('text') || sqlType.includes('varchar')) return 'text';
    if (sqlType.includes('integer') || sqlType.includes('bigint') || sqlType.includes('int')) return 'int';
    if (sqlType.includes('boolean') || sqlType.includes('bool')) return 'bool';
    if (sqlType.includes('numeric') || sqlType.includes('decimal') || sqlType.includes('float') || sqlType.includes('real')) return 'float';
    if (sqlType.includes('timestamp') || sqlType.includes('date') || sqlType.includes('time')) return 'datetime';
    return 'text';
  };

  const addAttribute = () => {
    setEditAttributes([...editAttributes, { 
      name: "", 
      originalName: null, 
      datatype: "text", 
      nullable: "optional",
      action: 'add' 
    }]);
  };

  const updateAttribute = (index, field, value) => {
    const updated = [...editAttributes];
    updated[index][field] = value;
    
    if (field === 'name' && updated[index].originalName && updated[index].originalName !== value) {
      updated[index].action = 'rename';
    } else if (field === 'name' && updated[index].originalName && updated[index].originalName === value) {
      updated[index].action = 'keep';
    }
    
    setEditAttributes(updated);
  };

  const removeAttribute = (index) => {
    const attr = editAttributes[index];
    
    if (attr.originalName) {
      const updated = [...editAttributes];
      updated[index].action = 'remove';
      setEditAttributes(updated);
    } else {
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
      const toAdd = editAttributes.filter(attr => attr.action === 'add' && attr.name.trim());
      const toRename = editAttributes.filter(attr => attr.action === 'rename' && attr.name.trim());
      const toRemove = editAttributes.filter(attr => attr.action === 'remove');

      let allSuccessful = true;
      let operations = [];

      if (toAdd.length > 0) {
        const addPayload = {
          name: editingEntity,
          attributes: toAdd.map(attr => ({ name: attr.name, datatype: attr.datatype }))
        };

        const addResponse = await fetch(`${API_BASE}/entity/edit-entity/${editingEntity}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify(addPayload),
        });
        const addData = await addResponse.json();
        
        if (addData.success) {
          operations.push(`Added ${toAdd.length} column(s)`);
        } else {
          allSuccessful = false;
        }
      }

      for (const attr of toRemove) {
        const removeResponse = await fetch(`${API_BASE}/entity/delete-column/${editingEntity}/${attr.originalName}`, {
          method: "DELETE",
          headers: {
            "ngrok-skip-browser-warning": "true"
          }
        });
        const removeData = await removeResponse.json();
        
        if (removeData.success) {
          operations.push(`Removed column '${attr.originalName}'`);
        } else {
          allSuccessful = false;
        }
      }

      for (const attr of toRename) {
        const renameResponse = await fetch(`${API_BASE}/entity/rename-column/${editingEntity}/${attr.originalName}/${attr.name}`, {
          method: "PUT",
          headers: {
            "ngrok-skip-browser-warning": "true"
          }
        });
        
        if (renameResponse.ok) {
          const renameData = await renameResponse.json();
          if (renameData.success) {
            operations.push(`Renamed '${attr.originalName}' to '${attr.name}'`);
          } else {
            allSuccessful = false;
          }
        } else {
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
      fetchEntities();

    } catch (error) {
      console.error("Error saving changes:", error);
      setResponse({ type: "error", message: `Something went wrong during update: ${error.message}` });
    }

    setTimeout(() => setResponse(null), 7000);
  };

  const deleteEntity = async (entityName) => {
    if (!confirm(`Are you sure you want to delete entity "${entityName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/entity/delete-entity/${entityName}`, {
        method: "DELETE",
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      const data = await response.json();

      if (data.success) {
        setResponse({ type: "success", message: data.message });
        setExpandedEntity(null);
        setEditingEntity(null);
        fetchEntities();
      } else {
        setResponse({ type: "error", message: "Failed to delete entity" });
      }
    } catch (error) {
      console.error("Error deleting entity:", error);
      setResponse({ type: "error", message: `Something went wrong: ${error.message}` });
    }

    setTimeout(() => setResponse(null), 5000);
  };

  const cancelEditing = () => {
    setEditingEntity(null);
    setEditAttributes([]);
  };

  const filteredEntities = entities.filter(entity => 
    entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.columns.some(col => col.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#C7D8ED',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
           width: '40px',
           height: '40px',
           border: '4px solid #49A3C4',
           borderTop: '4px solid transparent',
           borderRadius: '50%',
           animation: 'spin 1s linear infinite'
        }} />
        <h1 style={{ fontSize: '24px', color: '#00364A', fontWeight: '700' }}>Loading Entities...</h1>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#C7D8ED',
      color: '#00364A',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: '40px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        backgroundColor: 'white',
        borderRadius: '25px',
        boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '40px 50px',
          borderBottom: '1px solid rgba(0, 54, 74, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#49A3C4',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Database size={28} />
            </div>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#00364A',
                margin: 0,
                lineHeight: '1.2'
              }}>Entity Manager</h1>
              <p style={{
                fontSize: '16px',
                color: '#00364A',
                opacity: 0.7,
                margin: '5px 0 0 0'
              }}>View and manage your database entities</p>
            </div>
          </div>
          <div
          style={{
          padding: '10px 10px',
          display: 'flex',
          justifyContent: 'right',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <button
             style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#00364A',
              borderRadius: '12px',
              border: '2px solid #00364A',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#00364A';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.color = '#00364A';
            }}
            onClick={() => navigate('/dashboard')}
          >
          <ArrowLeft size={18} />
            Dashboard
            </button>
          <button 
            onClick={fetchEntities}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#00364A',
              borderRadius: '12px',
              border: '2px solid #00364A',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#00364A';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.color = '#00364A';
            }}
          >
        
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
        </div>

        <div style={{ padding: '50px' }}>
          {/* Search and Stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <div style={{ position: 'relative', width: '40%' }}>
              <div style={{ position: 'absolute', top: '50%', left: '15px', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <Search size={18} color="#00364A" style={{ opacity: 0.5 }} />
              </div>
              <input
                type="text"
                placeholder="Search entities or columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 20px 14px 45px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: 'rgba(73, 163, 196, 0.15)',
                  color: '#00364A',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.3s'
                }}
                onFocus={(e) => {
                  e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.25)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.backgroundColor = 'rgba(73, 163, 196, 0.15)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <div style={{
              backgroundColor: 'rgba(73, 163, 196, 0.1)',
              color: '#00364A',
              padding: '10px 20px',
              borderRadius: '20px',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              <span>{filteredEntities.length}</span> entities found
            </div>
          </div>

          {response && (
            <div style={{
              marginBottom: '30px',
              padding: '20px 25px',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              backgroundColor: response.type === "success" ? '#E0F2FE' : '#FEF2F2',
              border: `2px solid ${response.type === "success" ? '#49A3C4' : '#EF4444'}`,
              color: '#00364A'
            }}>
              <div style={{ color: response.type === "success" ? '#49A3C4' : '#EF4444' }}>
                {response.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              </div>
              <span style={{ fontWeight: '500' }}>{response.message}</span>
            </div>
          )}

          {filteredEntities.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              backgroundColor: '#F8FBFF',
              borderRadius: '20px',
              border: '2px dashed rgba(0, 54, 74, 0.1)'
            }}>
              <List size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} />
              <p style={{ fontSize: '18px', fontWeight: '600', color: '#00364A', marginBottom: '5px' }}>No entities found</p>
              <p style={{ color: '#00364A', opacity: 0.6 }}>Create your first entity to get started</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredEntities.map((entity) => (
                <div key={entity.name} style={{
                  backgroundColor: 'white',
                  border: '2px solid rgba(0, 54, 74, 0.08)',
                  borderRadius: '20px',
                  boxShadow: '0 4px 15px rgba(0, 54, 74, 0.05)',
                  overflow: 'hidden',
                  transition: 'all 0.3s'
                }}>
                  {/* Entity Card Header */}
                  <div style={{
                    padding: '25px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '20px',
                    flexWrap: 'wrap'
                  }}>
                    {/* Left: Entity Info */}
                    <div style={{ display: 'flex', alignItems: 'center', flex: '1 1 300px', minWidth: 0 }}>
                      <button 
                        onClick={() => toggleExpand(entity.name)}
                        style={{
                          marginRight: '15px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: '#00364A',
                          opacity: 0.5,
                          transition: 'opacity 0.2s',
                          padding: '5px',
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '1'}
                        onMouseLeave={(e) => e.target.style.opacity = '0.5'}
                      >
                        {expandedEntity === entity.name ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                      </button>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ 
                          fontSize: '18px', 
                          fontWeight: '700', 
                          color: '#00364A', 
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {entity.name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#00364A', opacity: 0.6, marginTop: '5px' }}>
                          <Columns size={14} style={{ marginRight: '5px', flexShrink: 0 }} />
                          <span style={{ marginRight: '15px', whiteSpace: 'nowrap' }}>{entity.columns?.length || 0} columns</span>
                          <span style={{ whiteSpace: 'nowrap' }}>{entity.row_count || 0} rows</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                      <IconButton 
                        onClick={() => startEditing(entity)} 
                        icon={<Edit3 size={18} />} 
                        color="#49A3C4" 
                        title="Edit Entity"
                      />
                      <IconButton 
                        onClick={() => deleteEntity(entity.name)} 
                        icon={<Trash2 size={18} />} 
                        color="#EF4444" 
                        title="Delete Entity"
                      />
                    </div>
                  </div>

                  {/* Expanded Content (Attributes) */}
                  {expandedEntity === entity.name && (
                    <div style={{
                      borderTop: '1px solid rgba(0, 54, 74, 0.1)',
                      padding: '25px',
                      backgroundColor: '#F8FBFF'
                    }}>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#00364A',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <div style={{
                          padding: '6px',
                          backgroundColor: 'rgba(73, 163, 196, 0.15)',
                          borderRadius: '8px',
                          display: 'flex'
                        }}>
                          <Columns size={16} color="#49A3C4" />
                        </div>
                        Attributes
                      </h4>
                      
                      {editingEntity === entity.name ? (
                        /* Editing Mode */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          {editAttributes.map((attr, index) => (
                            <div key={index} style={{
                              padding: '20px',
                              borderRadius: '15px',
                              backgroundColor: attr.action === 'remove' ? '#FEF2F2' : 'white',
                              border: `1px solid ${attr.action === 'remove' ? '#FCA5A5' : 'rgba(0, 54, 74, 0.1)'}`
                            }}>
                              {attr.action === 'remove' ? (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ color: '#991B1B', fontWeight: '600' }}>
                                    Column '{attr.originalName}' will be deleted
                                  </span>
                                  <button
                                    onClick={() => undoRemove(index)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '8px 16px',
                                      backgroundColor: '#FECACA',
                                      color: '#991B1B',
                                      border: 'none',
                                      borderRadius: '10px',
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Undo size={14} /> Undo
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 0.5fr', gap: '20px', alignItems: 'start' }}>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#00364A', marginBottom: '5px' }}>Name</label>
                                    <input
                                      type="text"
                                      value={attr.name}
                                      onChange={(e) => updateAttribute(index, "name", e.target.value)}
                                      style={inputStyle}
                                    />
                                    {attr.action === 'rename' && <p style={{ fontSize: '11px', color: '#49A3C4', marginTop: '4px' }}>Renaming from '{attr.originalName}'</p>}
                                    {attr.action === 'add' && <p style={{ fontSize: '11px', color: '#059669', marginTop: '4px' }}>New column</p>}
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#00364A', marginBottom: '5px' }}>Type</label>
                                    <select
                                      value={attr.datatype}
                                      onChange={(e) => updateAttribute(index, "datatype", e.target.value)}
                                      style={inputStyle}
                                    >
                                      <option value="text">String</option>
                                      <option value="int">Integer</option>
                                      <option value="bool">Boolean</option>
                                      <option value="float">Float</option>
                                      <option value="datetime">Date/Time</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#00364A', marginBottom: '5px' }}>Constraint</label>
                                    <select
                                      value={attr.nullable}
                                      onChange={(e) => updateAttribute(index, "nullable", e.target.value)}
                                      style={inputStyle}
                                    >
                                      <option value="optional">Optional</option>
                                      <option value="required">Required</option>
                                    </select>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'end', height: '100%', paddingBottom: '2px' }}>
                                    <IconButton 
                                      onClick={() => removeAttribute(index)} 
                                      icon={<Trash2 size={16} />} 
                                      color="#EF4444" 
                                      title="Remove"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                            <StyledButton onClick={addAttribute} icon={<Plus size={16} />}>Add Attribute</StyledButton>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <StyledButton onClick={saveChanges} variant="success" icon={<Save size={16} />}>Save Changes</StyledButton>
                              <StyledButton onClick={cancelEditing} variant="secondary" icon={<X size={16} />}>Cancel</StyledButton>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                            {entity.columns?.map((column) => (
                              <div key={column.name} style={{
                                backgroundColor: 'white',
                                padding: '15px',
                                borderRadius: '12px',
                                border: '1px solid rgba(0, 54, 74, 0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                    <Type size={14} color="#49A3C4" style={{ marginRight: '8px' }} />
                                    <span style={{ fontWeight: '600', color: '#00364A' }}>{column.name}</span>
                                  </div>
                                  <span style={{ fontSize: '12px', color: '#00364A', opacity: 0.6, marginLeft: '22px' }}>{column.type}</span>
                                </div>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  padding: '4px 10px',
                                  borderRadius: '10px',
                                  backgroundColor: column.nullable === 'NO' ? '#FEE2E2' : '#ECFDF5',
                                  color: column.nullable === 'NO' ? '#991B1B' : '#065F46',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Shield size={10} />
                                  {column.nullable === 'NO' ? 'Required' : 'Optional'}
                                </span>
                              </div>
                            ))}
                          </div>
                          
                          <div style={{ marginTop: '25px' }}>
                            <StyledButton onClick={() => startEditing(entity)} icon={<Edit3 size={16} />}>Edit Entity</StyledButton>
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
    </div>
  );
};

// Helper Components

const IconButton = ({ onClick, icon, color, disabled, title }) => {
  const [hover, setHover] = useState(false);
  
  // Use a hex code to ensure background opacity logic works
  const effectiveColor = disabled ? '#cccccc' : color;
  
  const getBgColor = () => {
    if (disabled) return '#f5f5f5';
    // If hovering, add transparency to hex color, or fallback to gray
    if (hover) {
        if (effectiveColor.startsWith('#')) return `${effectiveColor}15`; 
        return '#f0f0f0';
    }
    return '#F8FBFF';
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '40px',
        minWidth: '40px',
        height: '40px',
        borderRadius: '10px',
        border: `1px solid ${disabled ? '#eee' : 'rgba(0,54,74,0.1)'}`,
        backgroundColor: getBgColor(),
        color: effectiveColor, // This text color is inherited by the Icon via currentColor
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        flexShrink: 0,
        padding: 0
      }}
    >
      {/* Icon renders here, inheriting text color */}
      {icon}
    </button>
  );
};
const StyledButton = ({ onClick, icon, children, variant = 'primary' }) => {
  const [hover, setHover] = useState(false);
  
  let bg = '#00364A';
  let color = 'white';
  let border = 'none';

  if (variant === 'secondary') {
    bg = 'white';
    color = '#00364A';
    border = '1px solid rgba(0, 54, 74, 0.2)';
  } else if (variant === 'success') {
    bg = '#059669';
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: hover ? (variant === 'secondary' ? '#F3F4F6' : (variant === 'success' ? '#047857' : '#004e66')) : bg,
        color: color,
        border: border,
        borderRadius: '10px',
        fontWeight: '600',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.3s'
      }}
    >
      {icon}
      {children}
    </button>
  );
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid rgba(0, 54, 74, 0.15)',
  backgroundColor: 'white',
  color: '#00364A',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box'
};

export default EntityList;