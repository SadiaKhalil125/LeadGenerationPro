import React, { useState, useEffect } from 'react';
import { 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  ExternalLink, 
  Plus, 
  Save, 
  X,
  Database,
  RefreshCw,
  CheckCircle,
  Loader2,
  Map,
  List,
  Calendar,
  Settings
} from 'lucide-react';
import API_BASE from "./api_base";
import { useNavigate } from 'react-router-dom';

const SourceManagement = () => {
  const [sources, setSources] = useState([]);
  const [expandedSource, setExpandedSource] = useState(null);
  const [editingSource, setEditingSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dependencies, setDependencies] = useState({});
  const [editForm, setEditForm] = useState({ name: '', url: '' });
  const [editPaginationType, setEditPaginationType] = useState('');
  const [editPaginationConfig, setEditPaginationConfig] = useState({});
  const [response, setResponse] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/source/sources`,{
        method: "GET",
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      if (!response.ok) throw new Error('Failed to fetch sources');
      const data = await response.json();
      setSources(data.sources || []);
    } catch (err) {
      setError(err.message);
      setResponse({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  const fetchDependencies = async (sourceId) => {
    try {
      // Fetch mappings that use this source
      const mappingsResponse = await fetch(`${API_BASE}/mapping/mappings`,{
        method: "GET",
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      if (mappingsResponse.ok) {
        const mappingsData = await mappingsResponse.json();
        const sourceMappings = mappingsData.mappings?.filter(m => m.source_id === sourceId) || [];
        
        // Fetch tasks that use this source
        const tasksResponse = await fetch(`${API_BASE}/task/tasks`);
        let sourceTasks = [];
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          sourceTasks = tasksData.tasks?.filter(t => t.source_id === sourceId) || [];
        }

        setDependencies(prev => ({
          ...prev,
          [sourceId]: {
            mappings: sourceMappings,
            tasks: sourceTasks
          }
        }));
      }
    } catch (err) {
      console.error('Failed to fetch dependencies:', err);
    }
  };

  const handleExpand = (sourceId) => {
    if (expandedSource === sourceId) {
      setExpandedSource(null);
    } else {
      setExpandedSource(sourceId);
      if (!dependencies[sourceId]) {
        fetchDependencies(sourceId);
      }
    }
  };

  const handleEdit = (source) => {
    setEditingSource(source.id);
    setEditForm({ name: source.name, url: source.url });

    // if pagination config exists in source, prefill
    if (source.pagination_config) {
      setEditPaginationType(source.pagination_config.type || '');
      setEditPaginationConfig(source.pagination_config);
    } else {
      setEditPaginationType('');
      setEditPaginationConfig({});
    }
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);

      const payload = {
        name: editForm.name.trim(),
        url: editForm.url.trim(),
        pagination_config: editPaginationType
          ? { type: editPaginationType, ...editPaginationConfig }
          : null,
      };

      const response = await fetch(`${API_BASE}/source/source/${editingSource}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update source');
      }

      const data = await response.json();
      setResponse({ type: 'success', message: data.message });
      await fetchSources();

      // reset form state
      setEditingSource(null);
      setEditForm({ name: '', url: '' });
      setEditPaginationType('');
      setEditPaginationConfig({});
    } catch (err) {
      setError(err.message);
      setResponse({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sourceId, force = false) => {
    try {
      setLoading(true);
      const endpoint = force ? 
        `${API_BASE}/source/source/${sourceId}/force` : 
        `${API_BASE}/source/source/${sourceId}`;

      const response = await fetch(endpoint, { method: 'DELETE' , headers: {"ngrok-skip-browser-warning": "true"} });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete source');
      }

      const data = await response.json();
      setResponse({ type: 'success', message: data.message });
      await fetchSources();
      setDeleteConfirm(null);
      setExpandedSource(null);
    } catch (err) {
      setError(err.message);
      setResponse({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalMappings = sources.reduce((acc, source) => {
    const deps = dependencies[source.id];
    return acc + (deps ? deps.mappings.length : 0);
  }, 0);

  const totalTasks = sources.reduce((acc, source) => {
    const deps = dependencies[source.id];
    return acc + (deps ? deps.tasks.length : 0);
  }, 0);

  if (pageLoading) {
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
        <h1 style={{ fontSize: '24px', color: '#00364A', fontWeight: '700' }}>Loading Source Data...</h1>
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
              }}>Source Management</h1>
              <p style={{
                fontSize: '16px',
                color: '#00364A',
                opacity: 0.7,
                margin: '5px 0 0 0'
              }}>Manage your web scraping sources and their dependencies</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '15px' }}>
            <StyledButton 
              onClick={fetchSources} 
              variant="outline"
              icon={<RefreshCw size={18} />}
            >
              Refresh
            </StyledButton>
            <StyledButton 
              onClick={() => navigate("/addsource")} 
              variant="primary"
              icon={<Plus size={18} />}
            >
              Add Source
            </StyledButton>
          </div>
        </div>

        <div style={{ padding: '50px' }}>
          {/* Stats Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '40px'
          }}>
            <StatCard title="Total Sources" value={sources.length} color="#00364A" />
            <StatCard title="Entity Mappings" value={totalMappings} color="#49A3C4" />
            <StatCard title="Active Tasks" value={totalTasks} color="#00364A" />
          </div>

          {/* Response Messages */}
          {response && (
            <div style={{
              marginBottom: '30px',
              padding: '20px 25px',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              backgroundColor: response.type === 'success' ? '#E0F2FE' : '#FEF2F2',
              border: `2px solid ${response.type === 'success' ? '#49A3C4' : '#EF4444'}`,
              color: '#00364A'
            }}>
              <div style={{
                color: response.type === 'success' ? '#49A3C4' : '#EF4444'
              }}>
                {response.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
              </div>
              <span style={{ fontWeight: '500', flex: 1 }}>{response.message}</span>
              <button 
                onClick={() => setResponse(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#00364A',
                  opacity: 0.5
                }}
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Sources List */}
          {sources.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              backgroundColor: '#F8FBFF',
              borderRadius: '20px',
              border: '2px dashed rgba(0, 54, 74, 0.1)'
            }}>
              <Database size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#00364A', marginBottom: '5px' }}>No Sources Found</h3>
              <p style={{ color: '#00364A', opacity: 0.6 }}>Add your first source to get started with web scraping.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sources.map((source) => (
                <div key={source.id} style={{
                  backgroundColor: 'white',
                  border: '2px solid rgba(0, 54, 74, 0.08)',
                  borderRadius: '20px',
                  boxShadow: '0 4px 15px rgba(0, 54, 74, 0.05)',
                  overflow: 'hidden',
                  transition: 'all 0.3s'
                }}>
                  {editingSource === source.id ? (
                    /* Edit Mode */
                    <div style={{ padding: '30px', backgroundColor: '#F8FBFF' }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#00364A',
                        marginBottom: '20px'
                      }}>
                        Editing: <span style={{ color: '#49A3C4' }}>{source.name}</span>
                      </h3>
                      <div style={{ display: 'grid', gap: '20px' }}>
                        <StyledInput
                          label="Source Name *"
                          icon={<Database size={16} />}
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <StyledInput
                          label="URL *"
                          icon={<ExternalLink size={16} />}
                          value={editForm.url}
                          onChange={(e) => setEditForm(prev => ({ ...prev, url: e.target.value }))}
                        />
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <label style={{ fontSize: '14px', fontWeight: '600', color: '#00364A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Settings size={16} color="#49A3C4" /> Pagination Type
                          </label>
                          <StyledSelect
                            value={editPaginationType}
                            onChange={(e) => {
                              const selected = e.target.value;
                              setEditPaginationType(selected);
                              setEditPaginationConfig({ type: selected });
                            }}
                          >
                            <option value="">None</option>
                            <option value="query_param">Query Param</option>
                            <option value="offset">Offset</option>
                            <option value="path">Path</option>
                            <option value="button_click">Button Click</option>
                            <option value="scroll">Scroll</option>
                            <option value="ajax_click">Ajax Click</option>
                          </StyledSelect>
                        </div>

                        {/* Dynamic Fields */}
                        {editPaginationType && (
                          <div style={{
                            padding: '20px',
                            backgroundColor: 'white',
                            borderRadius: '15px',
                            border: '1px solid rgba(0, 54, 74, 0.1)',
                            display: 'grid',
                            gap: '15px'
                          }}>
                            {(editPaginationType === "query_param" || editPaginationType === "offset") && (
                              <>
                                <DynamicField
                                  label="Param Name"
                                  placeholder="e.g. page"
                                  value={editPaginationConfig.param_name || ""}
                                  onChange={(e) => setEditPaginationConfig((prev) => ({ ...prev, param_name: e.target.value }))}
                                />
                                <DynamicField
                                  label="Start Page"
                                  placeholder="1"
                                  type="number"
                                  value={editPaginationConfig.start_page || ""}
                                  onChange={(e) => setEditPaginationConfig((prev) => ({ ...prev, start_page: Number(e.target.value) }))}
                                />
                                {editPaginationType === "offset" && (
                                  <>
                                    <DynamicField
                                      label="Page Size"
                                      placeholder="10"
                                      type="number"
                                      value={editPaginationConfig.page_size || ""}
                                      onChange={(e) => setEditPaginationConfig((prev) => ({ ...prev, page_size: Number(e.target.value) }))}
                                    />
                                    <DynamicField
                                      label="Max Pages"
                                      placeholder="Optional"
                                      type="number"
                                      value={editPaginationConfig.max_pages || ""}
                                      onChange={(e) => setEditPaginationConfig((prev) => ({ ...prev, max_pages: Number(e.target.value) }))}
                                    />
                                  </>
                                )}
                              </>
                            )}

                            {editPaginationType === "path" && (
                              <DynamicField
                                label="Path Pattern"
                                placeholder="e.g. /page/{page_num}"
                                value={editPaginationConfig.path_pattern || ""}
                                onChange={(e) => setEditPaginationConfig((prev) => ({ ...prev, path_pattern: e.target.value }))}
                              />
                            )}

                            {(editPaginationType === "button_click" || editPaginationType === "ajax_click") && (
                              <>
                                <DynamicField
                                  label="Button Selector"
                                  placeholder="e.g .load-more-btn"
                                  value={editPaginationConfig.button_selector || ""}
                                  onChange={(e) => setEditPaginationConfig((prev) => ({ ...prev, button_selector: e.target.value }))}
                                />
                                <DynamicField
                                  label="Wait Selector"
                                  placeholder="e.g .item-loaded"
                                  value={editPaginationConfig.wait_selector || ""}
                                  onChange={(e) => setEditPaginationConfig((prev) => ({ ...prev, wait_selector: e.target.value }))}
                                />
                              </>
                            )}

                            {editPaginationType === "scroll" && (
                              <DynamicField
                                label="Scroll Steps"
                                placeholder="5"
                                type="number"
                                value={editPaginationConfig.scroll_steps || ""}
                                onChange={(e) => setEditPaginationConfig((prev) => ({ ...prev, scroll_steps: Number(e.target.value) }))}
                              />
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '10px' }}>
                          <StyledButton 
                            onClick={() => {
                              setEditingSource(null);
                              setEditForm({ name: '', url: '' });
                              setEditPaginationType('');
                              setEditPaginationConfig({});
                            }} 
                            variant="secondary"
                            icon={<X size={18} />}
                          >
                            Cancel
                          </StyledButton>
                          <StyledButton 
                            onClick={handleSaveEdit} 
                            variant="primary"
                            disabled={loading}
                            icon={loading ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                          >
                            Update
                          </StyledButton>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div style={{ padding: '25px 30px' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '20px',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ flex: 1, minWidth: '280px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                            <button
                              onClick={() => handleExpand(source.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: expandedSource === source.id ? '#49A3C4' : '#00364A',
                                opacity: expandedSource === source.id ? 1 : 0.4,
                                padding: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.3s'
                              }}
                            >
                              {expandedSource === source.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </button>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#00364A', margin: 0 }}>{source.name}</h3>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', paddingLeft: '40px' }}>
                            <InfoItem icon={<ExternalLink size={14} />} label="URL">
                              <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: '#49A3C4', textDecoration: 'none' }}>
                                {source.url}
                              </a>
                            </InfoItem>
                            <InfoItem icon={<Database size={14} />} label="ID">
                              {source.id}
                            </InfoItem>
                            {source.pagination_config && (
                              <InfoItem icon={<Settings size={14} />} label="Pagination">
                                {source.pagination_config.type || 'None'}
                              </InfoItem>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <IconButton onClick={() => handleEdit(source)} icon={<Edit size={16} />} color="#49A3C4" />
                          <IconButton onClick={() => setDeleteConfirm(source.id)} icon={<Trash2 size={16} />} color="#EF4444" />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedSource === source.id && (
                        <div style={{
                          marginTop: '25px',
                          paddingTop: '25px',
                          borderTop: '1px solid rgba(0, 54, 74, 0.1)',
                          animation: 'fadeIn 0.3s ease'
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
                            <List size={18} color="#49A3C4" />
                            Dependencies
                          </h4>
                          
                          {dependencies[source.id] ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
                              <DependencySection 
                                title="Entity Mappings" 
                                count={dependencies[source.id].mappings.length} 
                                icon={<Map size={16} color="#49A3C4" />}
                                items={dependencies[source.id].mappings.map(m => ({
                                  id: m.id,
                                  primary: m.mapping_name,
                                  secondary: `(${m.entity_name})`
                                }))}
                              />
                              <DependencySection 
                                title="Active Tasks" 
                                count={dependencies[source.id].tasks.length} 
                                icon={<Calendar size={16} color="#49A3C4" />}
                                items={dependencies[source.id].tasks.map(t => ({
                                  id: t.id,
                                  primary: t.task_name
                                }))}
                              />
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00364A', opacity: 0.6 }}>
                              <Loader2 className="spin" size={16} />
                              <span style={{ fontSize: '14px' }}>Loading dependencies...</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 54, 74, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(3px)'
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '25px',
                padding: '40px',
                width: '100%',
                maxWidth: '500px',
                boxShadow: '0 20px 60px rgba(0, 54, 74, 0.3)',
                animation: 'scaleIn 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                  <div style={{
                    width: '45px',
                    height: '45px',
                    backgroundColor: '#FEF2F2',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AlertTriangle color="#EF4444" size={24} />
                  </div>
                  <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#00364A', margin: 0 }}>Delete Source</h3>
                </div>

                {(() => {
                  const source = sources.find(s => s.id === deleteConfirm);
                  const deps = dependencies[deleteConfirm];
                  return (
                    <>
                      <p style={{ fontSize: '16px', color: '#00364A', opacity: 0.8, marginBottom: '25px', lineHeight: '1.5' }}>
                        Are you sure you want to delete <strong style={{ color: '#00364A', opacity: 1 }}>"{source?.name}"</strong>?
                      </p>

                      {deps && (deps.mappings.length > 0 || deps.tasks.length > 0) && (
                        <div style={{
                          backgroundColor: '#FFFBEB',
                          border: '1px solid #FCD34D',
                          borderRadius: '15px',
                          padding: '20px',
                          marginBottom: '30px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400E', fontWeight: '600', marginBottom: '10px' }}>
                            <AlertTriangle size={16} />
                            Warning: This will also delete:
                          </div>
                          <ul style={{ listStyle: 'disc', paddingLeft: '25px', margin: 0, color: '#92400E', fontSize: '14px' }}>
                            {deps.mappings.length > 0 && <li>{deps.mappings.length} entity mapping(s)</li>}
                            {deps.tasks.length > 0 && <li>{deps.tasks.length} task(s)</li>}
                          </ul>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '15px' }}>
                        <StyledButton 
                          onClick={() => handleDelete(deleteConfirm, true)} 
                          variant="danger"
                          disabled={loading}
                          style={{ flex: 1 }}
                        >
                          {loading ? 'Deleting...' : 'Delete Everything'}
                        </StyledButton>
                        <StyledButton 
                          onClick={() => setDeleteConfirm(null)} 
                          variant="secondary"
                          style={{ flex: 1 }}
                        >
                          Cancel
                        </StyledButton>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

// Helper Components

const StyledButton = ({ onClick, variant = 'primary', icon, children, disabled, style }) => {
  const [hover, setHover] = useState(false);
  
  const styles = {
    primary: {
      bg: '#00364A', color: 'white', border: '2px solid #00364A',
      hoverBg: 'white', hoverColor: '#00364A'
    },
    outline: {
      bg: 'white', color: '#00364A', border: '2px solid #00364A',
      hoverBg: '#00364A', hoverColor: 'white'
    },
    secondary: {
      bg: 'white', color: '#00364A', border: '2px solid rgba(0, 54, 74, 0.2)',
      hoverBg: '#F3F4F6', hoverColor: '#00364A'
    },
    danger: {
      bg: '#EF4444', color: 'white', border: '2px solid #EF4444',
      hoverBg: '#DC2626', hoverColor: 'white'
    }
  };

  const currentStyle = styles[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 24px',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '15px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        transition: 'all 0.3s',
        backgroundColor: hover && !disabled ? currentStyle.hoverBg : currentStyle.bg,
        color: hover && !disabled ? currentStyle.hoverColor : currentStyle.color,
        border: currentStyle.border,
        boxShadow: hover && !disabled ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
        transform: hover && !disabled ? 'translateY(-2px)' : 'none',
        ...style
      }}
    >
      {icon}
      {children}
    </button>
  );
};

const StyledInput = ({ label, icon, value, onChange, placeholder, type = "text" }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {label && (
      <label style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#00364A',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {icon && React.cloneElement(icon, { color: '#49A3C4' })}
        {label}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        padding: '14px 20px',
        borderRadius: '12px',
        border: 'none',
        backgroundColor: 'rgba(73, 163, 196, 0.15)',
        color: '#00364A',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.3s',
        width: '100%',
        boxSizing: 'border-box'
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
);

const StyledSelect = ({ value, onChange, children }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      padding: '14px 20px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: 'rgba(73, 163, 196, 0.15)',
      color: '#00364A',
      fontSize: '15px',
      outline: 'none',
      width: '100%',
      cursor: 'pointer',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300364A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 20px top 50%',
      backgroundSize: '12px auto'
    }}
  >
    {children}
  </select>
);

const DynamicField = ({ label, placeholder, type = "text", value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontSize: '13px', fontWeight: '600', color: '#00364A', opacity: 0.8 }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(0, 54, 74, 0.1)',
        backgroundColor: 'white',
        color: '#00364A',
        fontSize: '14px',
        outline: 'none',
        transition: 'all 0.3s'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#49A3C4';
        e.target.style.boxShadow = '0 0 0 2px rgba(73, 163, 196, 0.1)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'rgba(0, 54, 74, 0.1)';
        e.target.style.boxShadow = 'none';
      }}
    />
  </div>
);

const StatCard = ({ title, value, color }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '15px',
    padding: '25px',
    border: '2px solid rgba(0, 54, 74, 0.05)',
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0, 54, 74, 0.03)'
  }}>
    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#00364A', opacity: 0.6, marginBottom: '5px' }}>{title}</h4>
    <p style={{ fontSize: '32px', fontWeight: '800', color: color, margin: 0 }}>{value}</p>
  </div>
);

const InfoItem = ({ icon, label, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#00364A' }}>
    <span style={{ color: '#49A3C4' }}>{icon}</span>
    <span style={{ fontWeight: '600', opacity: 0.9 }}>{label}:</span>
    <span style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
  </div>
);

const IconButton = ({ onClick, icon, color }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        border: 'none',
        backgroundColor: hover ? `${color}15` : 'transparent',
        color: color,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
      }}
    >
      {icon}
    </button>
  );
};

const DependencySection = ({ title, count, icon, items }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {icon}
      <span style={{ fontWeight: '600', fontSize: '14px', color: '#00364A' }}>{title}</span>
      <span style={{
        backgroundColor: 'rgba(73, 163, 196, 0.15)',
        color: '#00364A',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '12px',
        fontWeight: '700'
      }}>{count}</span>
    </div>
    <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {items.map(item => (
        <div key={item.id} style={{ fontSize: '14px', color: '#00364A', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#49A3C4' }} />
          <span>{item.primary}</span>
          {item.secondary && <span style={{ opacity: 0.6 }}>{item.secondary}</span>}
        </div>
      ))}
      {items.length === 0 && <span style={{ fontSize: '13px', color: '#00364A', opacity: 0.4 }}>No items found</span>}
    </div>
  </div>
);

export default SourceManagement;