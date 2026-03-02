import React, { useState } from "react";
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
  Eye,
  ChevronLeft,
  ChevronRight as ChevronRightIcon2,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import API_BASE from "./api_base";
import Layout from "./components/Layout";

const EntityList = () => {
  const [expandedEntity, setExpandedEntity] = useState(null);
  const [editingEntity, setEditingEntity] = useState(null);
  const [editAttributes, setEditAttributes] = useState([]);
  const [response, setResponse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [exportLoading, setExportLoading] = useState({ csv: null, excel: null });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [navigatingDirection, setNavigatingDirection] = useState(null);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch entities list with pagination
  const { 
    data: entitiesData, 
    isLoading: isLoadingEntities,
    isFetching: isFetchingEntities 
  } = useQuery({
    queryKey: ['entities', currentPage, pageSize],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE}/entity/entities?page=${currentPage}&page_size=${pageSize}`,
        {
          headers: {
            "ngrok-skip-browser-warning": "true"
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        entities: data.entities || [],
        totalEntities: data.total_entities || 0
      };
    },
    refetchOnMount: true,
  });

  // Reset navigation direction when fetching completes
  React.useEffect(() => {
    if (!isFetchingEntities) {
      setNavigatingDirection(null);
    }
  }, [isFetchingEntities]);

  // Fetch entity details only when expanded (lazy loading)
  const { data: entityDetails } = useQuery({
    queryKey: ['entity-details', expandedEntity],
    queryFn: async () => {
      if (!expandedEntity) return null;

      const response = await fetch(`${API_BASE}/entity/entity-info/${expandedEntity}`, {
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return {
          name: expandedEntity,
          columns: data.columns,
          row_count: data.row_count
        };
      }
      return null;
    },
    enabled: !!expandedEntity,
  });

  const entities = entitiesData?.entities || [];
  const totalEntities = entitiesData?.totalEntities || 0;
  const totalPages = Math.ceil(totalEntities / pageSize);

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setNavigatingDirection('prev');
      setCurrentPage(p => p - 1);
      setExpandedEntity(null); // Collapse expanded entity when changing pages
      setEditingEntity(null);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setNavigatingDirection('next');
      setCurrentPage(p => p + 1);
      setExpandedEntity(null); // Collapse expanded entity when changing pages
      setEditingEntity(null);
    }
  };

  // CSV Export Handler
  const handleCSVExport = async (e, entityName) => {
    e.stopPropagation();
    setExportLoading(prev => ({ ...prev, csv: entityName }));

    try {
      const response = await fetch(`${API_BASE}/export/csv/${entityName}`, {
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityName}_export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setResponse({
        type: "success",
        message: `Successfully exported ${entityName} as CSV`
      });
    } catch (error) {
      console.error("CSV Export error:", error);
      setResponse({
        type: "error",
        message: `Failed to export ${entityName} as CSV: ${error.message}`
      });
    } finally {
      setExportLoading(prev => ({ ...prev, csv: null }));
    }

    setTimeout(() => setResponse(null), 5000);
  };

  // Excel Export Handler
  const handleExcelExport = async (e, entityName) => {
    e.stopPropagation();
    setExportLoading(prev => ({ ...prev, excel: entityName }));

    try {
      const response = await fetch(`${API_BASE}/export/excel/${entityName}`, {
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityName}_export.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setResponse({
        type: "success",
        message: `Successfully exported ${entityName} as Excel`
      });
    } catch (error) {
      console.error("Excel Export error:", error);
      setResponse({
        type: "error",
        message: `Failed to export ${entityName} as Excel: ${error.message}`
      });
    } finally {
      setExportLoading(prev => ({ ...prev, excel: null }));
    }

    setTimeout(() => setResponse(null), 5000);
  };

  const toggleExpand = (entityName) => {
    setExpandedEntity(expandedEntity === entityName ? null : entityName);
    setEditingEntity(null);
  };

  const startEditing = (entity) => {
    setEditingEntity(entity.name);
    const editableAttrs = entity.columns
      .filter(col => col.name !== "id" && col.name !== "modified_at")
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
      queryClient.invalidateQueries({ queryKey: ['entity-details', editingEntity] });

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
        // Refetch current page after deletion
        queryClient.invalidateQueries({ queryKey: ['entities', currentPage, pageSize] });
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

  // Filter entities based on search term (client-side filtering on current page)
  const filteredEntities = entities.filter(entity =>
    entity.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loading = isLoadingEntities;

  if (loading && !entitiesData) {
    return (
      <Layout pageTitle="Entity Manager">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: '20px',
          height: '50vh'
        }}>
          <Loader2 size={48} className="spin" style={{ color: '#00364A' }} />
          <h2 style={{ fontSize: '20px', color: '#00364A', fontWeight: '600' }}>Loading Entities...</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Entity Manager">
      <div style={{
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '25px',
        boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
        overflow: 'hidden'
      }}>
        {/* Header Actions */}
        <div style={{
          padding: '30px 40px',
          borderBottom: '1px solid rgba(0, 54, 74, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#49A3C4',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Database size={24} />
            </div>
            <div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#00364A',
                margin: 0
              }}>Entity Manager</h2>
              <p style={{
                fontSize: '14px',
                color: '#00364A',
                opacity: 0.6,
                margin: '4px 0 0 0'
              }}>View & manage your entities and their attributes</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#00364A',
                color: 'white',
                borderRadius: '10px',
                border: 'none',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#004e6b';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 54, 74, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#00364A';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
              onClick={() => navigate('/entityform')}
            >
              <Plus size={16} />
              Create Entity
            </button>
            <button
              onClick={() => {
                setCurrentPage(1);
                queryClient.invalidateQueries({ queryKey: ['entities', currentPage, pageSize] });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: 'white',
                color: '#00364A',
                borderRadius: '10px',
                border: '2px solid #00364A',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
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
              <RefreshCw size={16} className={isFetchingEntities ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div style={{ padding: '30px 40px' }}>
          {/* Search and Stats */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '25px',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '12px', 
                transform: 'translateY(-50%)', 
                pointerEvents: 'none',
                opacity: 0.5
              }}>
                <Search size={16} color="#00364A" />
              </div>
              <input
                type="text"
                placeholder="Search entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 54, 74, 0.1)',
                  backgroundColor: 'white',
                  color: '#00364A',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#49A3C4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(73, 163, 196, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 54, 74, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                backgroundColor: 'rgba(73, 163, 196, 0.1)',
                color: '#00364A',
                padding: '8px 16px',
                borderRadius: '20px',
                fontWeight: '600',
                fontSize: '13px'
              }}>
                <span>{totalEntities}</span> total entities • Page {currentPage} of {totalPages || 1}
              </div>
            </div>
          </div>

          {response && (
            <div style={{
              marginBottom: '20px',
              padding: '14px 20px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: response.type === "success" ? '#E0F2FE' : '#FEF2F2',
              border: `1px solid ${response.type === "success" ? '#49A3C4' : '#EF4444'}`,
              color: '#00364A',
              fontSize: '14px'
            }}>
              <div style={{ color: response.type === "success" ? '#49A3C4' : '#EF4444', flexShrink: 0 }}>
                {response.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              </div>
              <span style={{ fontWeight: '500' }}>{response.message}</span>
            </div>
          )}

          {isFetchingEntities && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '20px',
              backgroundColor: '#F8FBFF',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#00364A'
            }}>
              <Loader2 size={18} className="spin" />
              <span>Loading page {currentPage}...</span>
            </div>
          )}

          {filteredEntities.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 40px',
              backgroundColor: '#F8FBFF',
              borderRadius: '16px',
              border: '2px dashed rgba(0, 54, 74, 0.1)'
            }}>
              <Database size={48} style={{ color: '#49A3C4', marginBottom: '16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#00364A', marginBottom: '8px' }}>
                {searchTerm ? 'No matching entities found' : 'No entities yet'}
              </h3>
              <p style={{ fontSize: '14px', color: '#00364A', opacity: 0.6, marginBottom: '20px' }}>
                {searchTerm ? 'Try a different search term' : 'Create your first entity to get started'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => navigate('/entityform')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    backgroundColor: '#00364A',
                    color: 'white',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={16} />
                  Create Entity
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px' }}>
                {filteredEntities.map((entity) => (
                  <div key={entity.name} style={{
                    backgroundColor: 'white',
                    border: '1px solid rgba(0, 54, 74, 0.08)',
                    borderRadius: '16px',
                    boxShadow: '0 2px 8px rgba(0, 54, 74, 0.03)',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    opacity: isFetchingEntities ? 0.7 : 1
                  }}>
                    {/* Entity Card Header */}
                    <div style={{
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <button
                          onClick={() => toggleExpand(entity.name)}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            color: '#00364A',
                            opacity: 0.4,
                            transition: 'opacity 0.2s',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                          onMouseLeave={(e) => e.target.style.opacity = '0.4'}
                        >
                          {expandedEntity === entity.name ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
                        <Database size={20} color="#49A3C4" style={{ flexShrink: 0 }} />
                        <h3 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#00364A',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {entity.name}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/entity-data?entity=${entity.name}`);
                          }}
                          icon={<Eye size={16} />}
                          color="#8B5CF6"
                          title="View Entity Data"
                        />
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            if (expandedEntity !== entity.name) {
                              setExpandedEntity(entity.name);
                            }
                            setTimeout(() => {
                              if (entityDetails && entityDetails.name === entity.name) {
                                startEditing(entityDetails);
                              }
                            }, 100);
                          }}
                          icon={<Edit3 size={16} />}
                          color="#49A3C4"
                          title="Edit Entity"
                        />
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEntity(entity.name);
                          }}
                          icon={<Trash2 size={16} />}
                          color="#EF4444"
                          title="Delete Entity"
                        />
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedEntity === entity.name && (
                      <div style={{
                        borderTop: '1px solid rgba(0, 54, 74, 0.08)',
                        padding: '20px',
                        backgroundColor: '#F8FBFF'
                      }}>
                        {entityDetails ? (
                          <>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '12px', 
                              marginBottom: '16px' 
                            }}>
                              <Columns size={16} color="#49A3C4" />
                              <span style={{ 
                                fontSize: '14px', 
                                fontWeight: '600', 
                                color: '#00364A' 
                              }}>
                                Attributes ({entityDetails.columns?.length || 0})
                              </span>
                              <span style={{ 
                                fontSize: '13px', 
                                color: '#00364A', 
                                opacity: 0.6 
                              }}>
                                • {entityDetails.row_count || 0} rows
                              </span>
                            </div>

                            {editingEntity === entity.name ? (
                              /* Editing Mode */
                              <div>
                                {editAttributes.map((attr, index) => (
                                  <div key={index} style={{
                                    padding: '16px',
                                    marginBottom: '12px',
                                    borderRadius: '12px',
                                    backgroundColor: attr.action === 'remove' ? '#FEF2F2' : 'white',
                                    border: `1px solid ${attr.action === 'remove' ? '#FCA5A5' : 'rgba(0, 54, 74, 0.1)'}`
                                  }}>
                                    {attr.action === 'remove' ? (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#991B1B', fontSize: '14px', fontWeight: '500' }}>
                                          Column '{attr.originalName}' will be deleted
                                        </span>
                                        <button
                                          onClick={() => undoRemove(index)}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 12px',
                                            backgroundColor: '#FECACA',
                                            color: '#991B1B',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          <Undo size={14} /> Undo
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: '2fr 1.5fr 1fr auto', 
                                        gap: '16px', 
                                        alignItems: 'start' 
                                      }}>
                                        <div>
                                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#00364A', marginBottom: '4px', display: 'block' }}>Name</label>
                                          <input
                                            type="text"
                                            value={attr.name}
                                            onChange={(e) => updateAttribute(index, "name", e.target.value)}
                                            style={inputStyle}
                                          />
                                          {attr.action === 'rename' && (
                                            <p style={{ fontSize: '11px', color: '#49A3C4', marginTop: '4px' }}>
                                              Renaming from '{attr.originalName}'
                                            </p>
                                          )}
                                        </div>
                                        <div>
                                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#00364A', marginBottom: '4px', display: 'block' }}>Type</label>
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
                                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#00364A', marginBottom: '4px', display: 'block' }}>Constraint</label>
                                          <select
                                            value={attr.nullable}
                                            onChange={(e) => updateAttribute(index, "nullable", e.target.value)}
                                            style={inputStyle}
                                          >
                                            <option value="optional">Optional</option>
                                            <option value="required">Required</option>
                                          </select>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', height: '100%', marginTop: '20px' }}>
                                          <IconButton
                                            onClick={() => removeAttribute(index)}
                                            icon={<Trash2 size={14} />}
                                            color="#EF4444"
                                            title="Remove"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}

                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center', 
                                  marginTop: '16px' 
                                }}>
                                  <StyledButton onClick={addAttribute} icon={<Plus size={14} />} size="small">
                                    Add Attribute
                                  </StyledButton>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <StyledButton onClick={saveChanges} variant="success" icon={<Save size={14} />} size="small">
                                      Save
                                    </StyledButton>
                                    <StyledButton onClick={cancelEditing} variant="secondary" icon={<X size={14} />} size="small">
                                      Cancel
                                    </StyledButton>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* View Mode */
                              <div>
                                <div style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                                  gap: '12px',
                                  marginBottom: '16px'
                                }}>
                                  {entityDetails.columns?.filter(col => col.name !== 'modified_at').map((column) => (
                                    <div key={column.name} style={{
                                      backgroundColor: 'white',
                                      padding: '12px',
                                      borderRadius: '10px',
                                      border: '1px solid rgba(0, 54, 74, 0.08)',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                          <Type size={12} color="#49A3C4" />
                                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#00364A' }}>{column.name}</span>
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#00364A', opacity: 0.5, marginLeft: '18px' }}>
                                          {column.type}
                                        </span>
                                      </div>
                                      <span style={{
                                        fontSize: '10px',
                                        fontWeight: '600',
                                        padding: '3px 8px',
                                        borderRadius: '12px',
                                        backgroundColor: column.nullable === 'NO' ? '#FEE2E2' : '#ECFDF5',
                                        color: column.nullable === 'NO' ? '#991B1B' : '#065F46'
                                      }}>
                                        {column.nullable === 'NO' ? 'Required' : 'Optional'}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                <StyledButton 
                                  onClick={() => startEditing(entityDetails)} 
                                  icon={<Edit3 size={14} />}
                                  size="small"
                                >
                                  Edit Entity
                                </StyledButton>
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                            <Loader2 size={20} className="spin" style={{ color: '#49A3C4' }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '20px',
                  borderTop: '1px solid rgba(0, 54, 74, 0.1)'
                }}>
                  <div style={{ fontSize: '13px', color: '#00364A', opacity: 0.6 }}>
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalEntities)} of {totalEntities} entities
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <PaginationButton
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1 || isFetchingEntities}
                      icon={navigatingDirection === 'prev' ? <Loader2 size={16} className="spin" /> : <ChevronLeft size={16} />}
                    >
                      Previous
                    </PaginationButton>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => {
                              setNavigatingDirection('page');
                              setCurrentPage(pageNum);
                              setExpandedEntity(null);
                              setEditingEntity(null);
                            }}
                            disabled={isFetchingEntities}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: currentPage === pageNum ? '#00364A' : 'transparent',
                              color: currentPage === pageNum ? 'white' : '#00364A',
                              fontWeight: '600',
                              fontSize: '14px',
                              cursor: isFetchingEntities ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              opacity: isFetchingEntities ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (!isFetchingEntities && currentPage !== pageNum) {
                                e.target.style.backgroundColor = 'rgba(0, 54, 74, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentPage !== pageNum) {
                                e.target.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <PaginationButton
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages || isFetchingEntities}
                      icon={navigatingDirection === 'next' ? <Loader2 size={16} className="spin" /> : <ChevronRightIcon2 size={16} />}
                      iconPos="right"
                    >
                      Next
                    </PaginationButton>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

// Helper Components

const IconButton = ({ onClick, icon, color, disabled, title }) => {
  const [hover, setHover] = useState(false);

  const effectiveColor = disabled ? '#cccccc' : color;

  const getBgColor = () => {
    if (disabled) return '#f5f5f5';
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
        width: '34px',
        minWidth: '34px',
        height: '34px',
        borderRadius: '8px',
        border: `1px solid ${disabled ? '#eee' : 'rgba(0,54,74,0.1)'}`,
        backgroundColor: getBgColor(),
        color: effectiveColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        flexShrink: 0,
        padding: 0
      }}
    >
      {icon}
    </button>
  );
};

const StyledButton = ({ onClick, icon, children, variant = 'primary', size = 'medium' }) => {
  const [hover, setHover] = useState(false);

  const sizeStyles = {
    small: { padding: '8px 16px', fontSize: '13px' },
    medium: { padding: '10px 20px', fontSize: '14px' }
  };

  let bg = '#00364A';
  let color = 'white';
  let border = 'none';
  let hoverBg = '#004e66';

  if (variant === 'secondary') {
    bg = 'white';
    color = '#00364A';
    border = '1px solid rgba(0, 54, 74, 0.2)';
    hoverBg = '#F3F4F6';
  } else if (variant === 'success') {
    bg = '#059669';
    hoverBg = '#047857';
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: sizeStyles[size].padding,
        backgroundColor: hover ? hoverBg : bg,
        color: color,
        border: border,
        borderRadius: '8px',
        fontWeight: '600',
        fontSize: sizeStyles[size].fontSize,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      {icon}
      {children}
    </button>
  );
};

const PaginationButton = ({ onClick, disabled, icon, children, iconPos = "left" }) => {
  const [hover, setHover] = useState(false);
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: hover && !disabled ? '#F0F4F8' : 'white',
        color: disabled ? '#A0AEC0' : '#00364A',
        border: `1px solid ${disabled ? '#E2E8F0' : 'rgba(0, 54, 74, 0.2)'}`,
        borderRadius: '8px',
        fontWeight: '500',
        fontSize: '13px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        flexDirection: iconPos === 'right' ? 'row-reverse' : 'row'
      }}
    >
      {icon}
      {children}
    </button>
  );
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid rgba(0, 54, 74, 0.15)',
  backgroundColor: 'white',
  color: '#00364A',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box'
};

export default EntityList;