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
  Type
} from "lucide-react";

const EntityList = () => {
  const [entities, setEntities] = useState([]);
  const [expandedEntity, setExpandedEntity] = useState(null);
  const [editingEntity, setEditingEntity] = useState(null);
  const [editAttributes, setEditAttributes] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
        nullable: col.nullable === 'NO' ? 'required' : 'optional',
        action: 'keep' // 'keep', 'add', 'remove', 'rename'
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

  const filteredEntities = entities.filter(entity => 
    entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.columns.some(col => col.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full text-center">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="animate-spin text-teal-600 mb-4" size={40} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading Entities</h1>
            <p className="text-gray-600">Please wait while we fetch your data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="bg-white/20 p-3 rounded-xl mr-4">
                  <Database size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Entity Manager</h1>
                  <p className="text-teal-100">View and manage your database entities</p>
                </div>
              </div>
              <button 
                onClick={fetchEntities}
                className="flex items-center px-4 py-2.5 bg-gradient-to-b from-white/20 to-transparent text-black rounded-xl hover:bg-white/30 transition-all duration-200 backdrop-blur-sm"
              >
                <RefreshCw size={18} className="mr-2" />
                Refresh
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Search and Stats */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div className="relative mb-4 md:mb-0 md:w-1/3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search entities or columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"
                />
              </div>
              <div className="bg-teal-50 text-teal-700 px-4 py-2 rounded-xl font-medium">
                <span>{filteredEntities.length}</span> entities found
              </div>
            </div>

            {response && (
              <div className={`mb-6 p-4 rounded-xl ${
                response.type === "success" 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <div className="flex items-center">
                  {response.type === "success" 
                    ? <CheckCircle size={20} className="mr-2" /> 
                    : <AlertCircle size={20} className="mr-2" />
                  }
                  {response.message}
                </div>
              </div>
            )}

            {filteredEntities.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <List size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No entities found</p>
                <p className="text-gray-500 text-sm mt-2">Create your first entity to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEntities.map((entity) => (
                  <div key={entity.name} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                    <div className="p-5 flex justify-between items-center">
                      <div className="flex items-center">
                        <button 
                          onClick={() => toggleExpand(entity.name)}
                          className="mr-4 text-gray-500 hover:text-teal-600 transition-colors"
                        >
                          {expandedEntity === entity.name ? 
                            <ChevronDown size={20} /> : 
                            <ChevronRight size={20} />
                          }
                        </button>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{entity.name}</h3>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Columns size={14} className="mr-1" />
                            <span className="mr-4">{entity.columns?.length || 0} columns</span>
                            <span>{entity.row_count || 0} rows</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          className="p-2.5 bg-gradient-to-b from-teal-500 to-teal-400 text-white hover:bg-teal-600 rounded-xl transition-all duration-200"
                          onClick={() => startEditing(entity)}
                          title="Edit entity"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          className="p-2.5 bg-gradient-to-b from-red-500 to-red-400 text-white hover:bg-red-600 rounded-xl transition-all duration-200"
                          onClick={() => deleteEntity(entity.name)}
                          title="Delete entity"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {expandedEntity === entity.name && (
                      <div className="border-t border-gray-100 p-5 bg-gray-50">
                        <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                          <div className="bg-teal-50 p-2 rounded-lg mr-3">
                            <Columns size={18} className="text-teal-600" />
                          </div>
                          Attributes
                        </h4>
                        
                        {editingEntity === entity.name ? (
                          <div className="space-y-4">
                            {editAttributes.map((attr, index) => (
                              <div key={index} className={`p-4 rounded-xl ${
                                attr.action === 'remove' 
                                  ? 'bg-red-50 border border-red-200' 
                                  : 'bg-white border border-gray-200'
                              }`}>
                                {attr.action === 'remove' ? (
                                  <div className="flex justify-between items-center">
                                    <span className="text-red-800 font-medium">
                                      Column '{attr.originalName}' will be deleted
                                    </span>
                                    <button
                                      className="flex items-center text-sm text-red-600 hover:text-red-800 px-3 py-1.5 bg-red-100 rounded-lg"
                                      onClick={() => undoRemove(index)}
                                    >
                                      <Undo size={14} className="mr-1" />
                                      Undo
                                    </button>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                                    <div className="md:col-span-5">
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                      <input
                                        type="text"
                                        placeholder="Attribute name"
                                        value={attr.name}
                                        onChange={(e) => updateAttribute(index, "name", e.target.value)}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"
                                      />
                                      {attr.action === 'rename' && (
                                        <p className="text-xs text-teal-600 mt-1">
                                          Renaming from '{attr.originalName}'
                                        </p>
                                      )}
                                      {attr.action === 'add' && (
                                        <p className="text-xs text-green-600 mt-1">New column</p>
                                      )}
                                    </div>
                                    <div className="md:col-span-3">
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                      <select
                                        value={attr.datatype}
                                        onChange={(e) => updateAttribute(index, "datatype", e.target.value)}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"
                                      >
                                        <option value="text">String</option>
                                        <option value="int">Integer</option>
                                        <option value="bool">Boolean</option>
                                        <option value="float">Float</option>
                                        <option value="datetime">Date/Time</option>
                                      </select>
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Constraint</label>
                                      <select
                                        value={attr.nullable}
                                        onChange={(e) => updateAttribute(index, "nullable", e.target.value)}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200"
                                      >
                                        <option value="optional">Optional</option>
                                        <option value="required">Required</option>
                                      </select>
                                    </div>
                                    <div className="md:col-span-2 flex justify-end items-end">
                                      <button
                                        className="p-2.5 bg-gradient-to-b from-red-500 to-red-400 text-white hover:bg-red-600 rounded-lg transition-all duration-200 mt-6"
                                        onClick={() => removeAttribute(index)}
                                        title="Remove attribute"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 gap-3">
                              <button 
                                className="flex items-center px-4 py-2.5 bg-gradient-to-b from-teal-500 to-teal-400 text-white rounded-xl hover:bg-teal-600 transition-all duration-200 font-medium"
                                onClick={addAttribute}
                              >
                                <Plus size={16} className="mr-1" />
                                Add Attribute
                              </button>
                              <div className="flex space-x-2">
                                <button 
                                  className="flex items-center px-4 py-2.5 bg-gradient-to-b from-green-500 to-green-400 text-white rounded-xl hover:bg-green-600 transition-all duration-200 font-medium"
                                  onClick={saveChanges}
                                >
                                  <Save size={16} className="mr-1" />
                                  Save Changes
                                </button>
                                <button 
                                  className="flex items-center px-4 py-2.5 bg-gradient-to-b from-gray-200 to-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-all duration-200 font-medium"
                                  onClick={cancelEditing}
                                >
                                  <X size={16} className="mr-1" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {entity.columns?.map((column) => (
                                <div key={column.name} className="bg-white p-4 border border-gray-200 rounded-xl flex justify-between items-center">
                                  <div>
                                    <div className="flex items-center">
                                      <Type size={16} className="text-teal-500 mr-2" />
                                      <span className="font-medium text-gray-900">{column.name}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 ml-6">{column.type}</div>
                                  </div>
                                  <span className={`text-xs px-2.5 py-1.5 rounded-full flex items-center ${
                                    column.nullable === 'NO' 
                                      ? 'bg-red-100 text-red-800' 
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    <Shield size={12} className="mr-1" />
                                    {column.nullable === 'NO' ? 'Required' : 'Optional'}
                                  </span>
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-6">
                              <button 
                                className="flex items-center px-4 py-2.5 bg-gradient-to-b from-teal-500 to-teal-400 text-white rounded-xl hover:bg-teal-600 transition-all duration-200 font-medium"
                                onClick={() => startEditing(entity)}
                              >
                                <Edit3 size={16} className="mr-1" />
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
      </div>
    </div>
  );
};

export default EntityList;