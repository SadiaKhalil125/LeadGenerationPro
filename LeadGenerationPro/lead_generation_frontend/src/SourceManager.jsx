import React, { useState, useEffect } from 'react';
import {
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
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
  Settings,
  ArrowLeft,
  Globe,
  Zap,
  Code,
  Lock,
  Info,
  Menu,
  LayoutGrid,
  ClipboardPlus,
  CalendarCheck
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API_BASE from "./api_base";
import { useNavigate } from 'react-router-dom';

const SourceManagement = () => {
  const [sourceType, setSourceType] = useState('web'); // 'web' or 'api'
  const [expandedSource, setExpandedSource] = useState(null);
  const [editingSource, setEditingSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dependencies, setDependencies] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [testingSource, setTestingSource] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openMenu, setOpenMenu] = useState(null);

  const addNotification = (type, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Web source edit state
  const [editForm, setEditForm] = useState({ name: '', url: '' });
  const [editPaginationType, setEditPaginationType] = useState('');
  const [editPaginationConfig, setEditPaginationConfig] = useState({});

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch web sources
  const { data: webSourcesData, isLoading: isLoadingWebSources } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/source/sources`, {
        method: "GET",
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      if (!response.ok) throw new Error('Failed to fetch sources');
      const data = await response.json();
      return data.sources || [];
    },
    enabled: sourceType === 'web',
    refetchOnMount: true, // Override global false — refetch if stale (e.g. after invalidateQueries from SourceCreator)
  });

  // Fetch API sources
  const { data: apiSourcesData, isLoading: isLoadingApiSources, refetch: refetchApiSources } = useQuery({
    queryKey: ['api-sources'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api-sources/`, {
        method: "GET",
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      if (!response.ok) throw new Error('Failed to fetch API sources');
      const payload = await response.json();
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.sources)) return payload.sources;
      return [];
    },
    enabled: sourceType === 'api'
  });

  const pageLoading = sourceType === 'web'
    ? (isLoadingWebSources && !webSourcesData)
    : (isLoadingApiSources && !apiSourcesData);

  const sources = sourceType === 'web'
    ? (webSourcesData || [])
    : (Array.isArray(apiSourcesData) ? apiSourcesData : []);

  // Web source functions
  const fetchDependencies = async (sourceId) => {
    try {
      const mappingsResponse = await fetch(`${API_BASE}/mapping/mappings`, {
        method: "GET",
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      if (mappingsResponse.ok) {
        const mappingsData = await mappingsResponse.json();
        const sourceMappings = mappingsData.mappings?.filter(m => m.source_id === sourceId) || [];

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
      if (sourceType === 'web' && !dependencies[sourceId]) {
        fetchDependencies(sourceId);
      }
    }
  };

  const handleEdit = (source) => {
    if (sourceType === 'web') {
      setEditingSource(source.id);
      setEditForm({ name: source.name, url: source.url });
      if (source.pagination_config) {
        setEditPaginationType(source.pagination_config.type || '');
        setEditPaginationConfig(source.pagination_config);
      } else {
        setEditPaginationType('');
        setEditPaginationConfig({});
      }
    } else {
      setEditingSource(source);
      setExpandedSource(null);
    }
  };

  const handleSaveWebEdit = async () => {
    try {
      setLoading(true);
      const payload = {
        name: editForm.name.trim(),
        url: editForm.url.trim(),
        pagination_config: editPaginationType
          ? { type: editPaginationType, ...editPaginationConfig }
          : null,
      };

      const apiResponse = await fetch(`${API_BASE}/source/source/${editingSource}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.detail || 'Failed to update source');
      }

      const data = await apiResponse.json();
      addNotification('success', data.message);

      queryClient.setQueryData(['sources'], (oldSources) => {
        if (!oldSources) return oldSources;
        return oldSources.map(source =>
          source.id === editingSource ? { ...source, ...payload } : source
        );
      });

      queryClient.invalidateQueries({ queryKey: ['sources'] }, { refetchType: 'none' });

      setEditingSource(null);
      setEditForm({ name: '', url: '' });
      setEditPaginationType('');
      setEditPaginationConfig({});
    } catch (err) {
      setError(err.message);
      addNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sourceId, force = false) => {
    try {
      setLoading(true);

      if (sourceType === 'web') {
        const endpoint = force ?
          `${API_BASE}/source/source/${sourceId}/force` :
          `${API_BASE}/source/source/${sourceId}`;

        const apiResponse = await fetch(endpoint, { method: 'DELETE', headers: { "ngrok-skip-browser-warning": "true" } });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          throw new Error(errorData.detail || 'Failed to delete source');
        }

        const data = await apiResponse.json();
        addNotification('success', data.message);

        queryClient.setQueryData(['sources'], (oldSources) => {
          if (!oldSources) return oldSources;
          return oldSources.filter(source => source.id !== sourceId);
        });

        queryClient.invalidateQueries({ queryKey: ['sources'] }, { refetchType: 'none' });
      } else {
        const apiResponse = await fetch(`${API_BASE}/api-sources/${sourceId}`, {
          method: "DELETE",
          headers: { "ngrok-skip-browser-warning": "true" }
        });

        if (!apiResponse.ok) {
          const data = await apiResponse.json();
          throw new Error(data.detail || 'Failed to delete');
        }

        addNotification('success', 'API source deleted successfully');
        refetchApiSources();
      }

      setDeleteConfirm(null);
      setExpandedSource(null);
    } catch (err) {
      setError(err.message);
      addNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (sourceId) => {
    try {
      setTestingSource(sourceId);
      setTestResult(null);
      const apiResponse = await fetch(`${API_BASE}/api-sources/${sourceId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" }
      });
      const data = await apiResponse.json();
      setTestResult({
        sourceId: sourceId,
        success: data.success !== false && apiResponse.ok,
        message: data.message || data.error || 'Test completed',
        data: data.sample_item || data.data
      });
    } catch (err) {
      setTestResult({ sourceId: sourceId, success: false, message: 'Failed: ' + err.message });
    } finally {
      setTestingSource(null);
    }
  };

  const handleCloseEdit = () => {
    setEditingSource(null);
    setTestResult(null);
    setEditForm({ name: '', url: '' });
    setEditPaginationType('');
    setEditPaginationConfig({});
  };

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const menuContent = {
    entity: {
      label: "Entities",
      icon: <LayoutGrid size={20} />,
      items: [
        { label: "Entity List", path: "/entitylist" },
        { label: "Create Entity", path: "/entityform" },
        { label: "Entity Data Table", path: "/entity-data" },
      ],
    },
    manager: {
      label: "Sources",
      icon: <Settings size={20} />,
      items: [
        { label: "Source Manager", path: "/sourcemanagement" },
        { label: "Add Source", path: "/addsource" },
      ],
    },
    mapping: {
      label: "Mappings",
      icon: <ClipboardPlus size={20} />,
      items: [
        { label: "Entity Mapping List", path: "/mappingmanager" },
        { label: "Create Entity Mapping", path: "/entitymappingform" },
      ],
    },
    task: {
      label: "Tasks",
      icon: <CalendarCheck size={20} />,
      items: [
        { label: "Schedule a Task", path: "/taskscheduler" },
        { label: "Task List", path: "/tasksmanagement" },
        { label: "Task Executor", path: "/taskexecutor" },
      ],
    },
  };

  const sidebarStyles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      backgroundColor: "#F1F6FB",
      color: "#00364A",
      fontFamily: "'Inter', sans-serif",
    },
    sidebar: {
      position: "fixed",
      top: 0,
      left: 0,
      height: "100%",
      backgroundColor: "#2C5F6F",
      color: "white",
      boxShadow: "rgb(0 0 0 / 15%) 10px 0px 20px",
      zIndex: 40,
      transition: "all 0.3s ease-in-out",
      width: sidebarOpen ? "280px" : "80px",
      overflow: "hidden",
    },
    sidebarInner: {
      padding: "24px 16px",
      height: "100%",
      display: "flex",
      flexDirection: "column",
    },
    sidebarHeader: {
      fontSize: "36px",
      fontWeight: "900",
      textAlign: "center",
      marginBottom: "40px",
      opacity: sidebarOpen ? 1 : 0,
      transition: "opacity 0.3s ease",
      letterSpacing: "4px",
      fontFamily: "'Montserrat', 'Arial Black', sans-serif",
      textTransform: "uppercase",
      background: "linear-gradient(135deg, #ffffff 0%, #a9d2ff 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "white",
      backgroundClip: "text",
      cursor: "pointer",
    },
    menuButton: (isActive) => ({
      width: "100%",
      display: "flex",
      alignItems: "center",
      padding: "14px 16px",
      borderRadius: "12px",
      fontSize: "16px",
      fontWeight: "600",
      border: "none",
      cursor: "pointer",
      transition: "all 0.2s ease",
      backgroundColor: isActive ? "rgba(255, 255, 255, 0.15)" : "transparent",
      color: "white",
      marginBottom: "8px",
      justifyContent: sidebarOpen ? "flex-start" : "center",
    }),
    menuButtonHover: {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    menuLabel: {
      marginLeft: "16px",
      flex: 1,
      textAlign: "left",
      display: sidebarOpen ? "block" : "none",
    },
    submenuContainer: (isOpen) => ({
      maxHeight: isOpen ? "500px" : "0",
      overflow: "hidden",
      transition: "max-height 0.3s ease",
      marginLeft: sidebarOpen ? "20px" : "0",
      marginTop: "4px",
    }),
    submenuItem: {
      width: "100%",
      padding: "12px 16px",
      backgroundColor: "transparent",
      border: "none",
      color: "white",
      fontSize: "14px",
      fontWeight: "500",
      textAlign: "left",
      cursor: "pointer",
      borderRadius: "8px",
      transition: "all 0.2s ease",
      marginBottom: "4px",
      display: sidebarOpen ? "block" : "none",
    },
    mainContent: {
      flex: 1,
      transition: "all 0.3s ease-in-out",
      marginLeft: sidebarOpen ? "280px" : "80px",
      minHeight: "100vh",
      backgroundColor: "#F1F6FB",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      width: "100%",
      background: "#2C5F6F",
      color: "white",
      padding: "20px 32px",
      boxShadow: "0 4px 12px rgba(0, 54, 74, 0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    menuToggle: {
      padding: "10px",
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      transition: "all 0.2s ease",
    },
    headerTitle: {
      fontSize: "28px",
      fontWeight: "700",
      color: "white",
      letterSpacing: "0.5px",
    },
    main: {
      padding: "40px",
      flex: 1,
      width: "100%",
    },
  };

  // Calculate stats
  const totalMappings = sourceType === 'web' ? sources.reduce((acc, source) => {
    const deps = dependencies[source.id];
    return acc + (deps ? deps.mappings.length : 0);
  }, 0) : 0;

  const totalTasks = sourceType === 'web' ? sources.reduce((acc, source) => {
    const deps = dependencies[source.id];
    return acc + (deps ? deps.tasks.length : 0);
  }, 0) : 0;

  if (pageLoading) {
    return (
      <div style={sidebarStyles.container}>
        {/* Sidebar */}
        <aside style={sidebarStyles.sidebar}>
          <div style={sidebarStyles.sidebarInner}>
            <h2 
              style={sidebarStyles.sidebarHeader}
              onClick={() => navigate('/dashboard')}
              title="Go to Dashboard"
            >
              SCOUT
            </h2>

            {Object.entries(menuContent).map(([key, { label, icon }]) => (
              <div key={key}>
                <button
                  onClick={() => toggleMenu(key)}
                  style={sidebarStyles.menuButton(openMenu === key)}
                  disabled
                >
                  {icon}
                  {sidebarOpen && <span style={sidebarStyles.menuLabel}>{label}</span>}
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div style={sidebarStyles.mainContent}>
          {/* Header */}
          <header style={sidebarStyles.header}>
            <div style={sidebarStyles.headerLeft}>
              <button
                onClick={() => {
                  setSidebarOpen(!sidebarOpen);
                  if (sidebarOpen) {
                    setOpenMenu(null);
                  }
                }}
                style={sidebarStyles.menuToggle}
              >
                <Menu size={24} />
              </button>
              <h1 style={sidebarStyles.headerTitle}>Source Manager</h1>
            </div>
          </header>

          {/* Content Area */}
          <main style={sidebarStyles.main}>
            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '20px',
              minHeight: '400px'
            }}>
              <Loader2 size={40} className="spin" style={{ color: '#49A3C4' }} />
              <h1 style={{ fontSize: '24px', color: '#00364A', fontWeight: '700' }}>
                Loading {sourceType === 'web' ? 'Web' : 'API'} Sources...
              </h1>
            </div>
          </main>
        </div>

        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .spin { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  // API Source Edit Form inline rendering
  if (sourceType === 'api' && editingSource && typeof editingSource === 'object') {
    return (
      <div style={sidebarStyles.container}>
        {/* Sidebar */}
        <aside style={sidebarStyles.sidebar}>
          <div style={sidebarStyles.sidebarInner}>
            <h2 
              style={sidebarStyles.sidebarHeader}
              onClick={() => {
                handleCloseEdit();
              }}
              title="Go to Source Manager"
            >
              SCOUT
            </h2>

            {Object.entries(menuContent).map(([key, { label, icon }]) => (
              <div key={key}>
                <button
                  onClick={() => toggleMenu(key)}
                  style={sidebarStyles.menuButton(openMenu === key)}
                  onMouseEnter={(e) => {
                    if (openMenu !== key) {
                      e.currentTarget.style.backgroundColor =
                        sidebarStyles.menuButtonHover.backgroundColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (openMenu !== key) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {icon}
                  {sidebarOpen && <span style={sidebarStyles.menuLabel}>{label}</span>}
                  {sidebarOpen &&
                    (openMenu === key ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    ))}
                </button>

                <div style={sidebarStyles.submenuContainer(openMenu === key)}>
                  {menuContent[key].items.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        handleCloseEdit();
                        navigate(item.path);
                      }}
                      style={sidebarStyles.submenuItem}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(255, 255, 255, 0.1)";
                        e.currentTarget.style.paddingLeft = "20px";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.paddingLeft = "16px";
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div style={sidebarStyles.mainContent}>
          {/* Header */}
          <header style={sidebarStyles.header}>
            <div style={sidebarStyles.headerLeft}>
              <button
                onClick={() => {
                  setSidebarOpen(!sidebarOpen);
                  if (sidebarOpen) {
                    setOpenMenu(null);
                  }
                }}
                style={sidebarStyles.menuToggle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.15)";
                }}
              >
                <Menu size={24} />
              </button>
              <h1 style={sidebarStyles.headerTitle}>Edit API Source</h1>
            </div>
          </header>

          {/* Content Area */}
          <main style={sidebarStyles.main}>
            <div style={{
              width: '100%',
              backgroundColor: 'white',
              borderRadius: '25px',
              boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
              overflow: 'hidden',
              padding: '50px'
            }}>
              <button onClick={handleCloseEdit} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#49A3C4', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '600', marginBottom: '24px' }}>
                <ArrowLeft size={20} /> Back to Sources
              </button>
              <NotificationPanel notifications={notifications} onRemove={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
              <ApiSourceForm
                source={editingSource}
                onClose={handleCloseEdit}
                showNotification={addNotification}
                onSuccess={() => {
                  refetchApiSources();
                  handleCloseEdit();
                }}
              />
            </div>
          </main>
        </div>

        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .spin { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  return (
    <div style={sidebarStyles.container}>
      {/* Sidebar */}
      <aside style={sidebarStyles.sidebar}>
        <div style={sidebarStyles.sidebarInner}>
          <h2 
            style={sidebarStyles.sidebarHeader}
            onClick={() => navigate('/dashboard')}
            title="Go to Dashboard"
          >
            SCOUT
          </h2>

          {Object.entries(menuContent).map(([key, { label, icon }]) => (
            <div key={key}>
              <button
                onClick={() => toggleMenu(key)}
                style={sidebarStyles.menuButton(openMenu === key)}
                onMouseEnter={(e) => {
                  if (openMenu !== key) {
                    e.currentTarget.style.backgroundColor =
                      sidebarStyles.menuButtonHover.backgroundColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (openMenu !== key) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {icon}
                {sidebarOpen && <span style={sidebarStyles.menuLabel}>{label}</span>}
                {sidebarOpen &&
                  (openMenu === key ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  ))}
              </button>

              <div style={sidebarStyles.submenuContainer(openMenu === key)}>
                {menuContent[key].items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(item.path)}
                    style={sidebarStyles.submenuItem}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(255, 255, 255, 0.1)";
                      e.currentTarget.style.paddingLeft = "20px";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.paddingLeft = "16px";
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div style={sidebarStyles.mainContent}>
        {/* Header */}
        <header style={sidebarStyles.header}>
          <div style={sidebarStyles.headerLeft}>
            <button
              onClick={() => {
                setSidebarOpen(!sidebarOpen);
                if (sidebarOpen) {
                  setOpenMenu(null);
                }
              }}
              style={sidebarStyles.menuToggle}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.15)";
              }}
            >
              <Menu size={24} />
            </button>
            <h1 style={sidebarStyles.headerTitle}>Source Manager</h1>
          </div>
        </header>

        {/* Content Area */}
        <main style={sidebarStyles.main}>
      <div style={{
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '25px',
        boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
        overflow: 'hidden'
      }}>
        {/* Floating Notification Panel */}
        <NotificationPanel notifications={notifications} onRemove={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />

        <div style={{ padding: '50px' }}>
          {/* Source Type Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px',
            gap: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              flex: 1,
              minWidth: '300px'
            }}>
              <div style={{
                display: 'flex',
                backgroundColor: '#F8FBFF',
                borderRadius: '15px',
                padding: '8px',
                boxShadow: '0 2px 8px rgba(0, 54, 74, 0.08)'
              }}>
                <button
                  onClick={() => {
                    setSourceType('web');
                    setExpandedSource(null);
                    setEditingSource(null);
                    setTestResult(null);
                  }}
                  style={{
                    padding: '12px 30px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: sourceType === 'web' ? '#00364A' : 'transparent',
                    color: sourceType === 'web' ? 'white' : '#00364A',
                    fontWeight: '600',
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Database size={18} />
                  Web Sources
                </button>
                <button
                  onClick={() => {
                    setSourceType('api');
                    setExpandedSource(null);
                    setEditingSource(null);
                    setDependencies({});
                  }}
                  style={{
                    padding: '12px 30px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: sourceType === 'api' ? '#00364A' : 'transparent',
                    color: sourceType === 'api' ? 'white' : '#00364A',
                    fontWeight: '600',
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Globe size={18} />
                  API Sources
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <StyledButton
                onClick={() => {
                  if (sourceType === 'web') {
                    queryClient.invalidateQueries({ queryKey: ['sources'] });
                  } else {
                    refetchApiSources();
                  }
                }}
                variant="outline"
                icon={<RefreshCw size={18} />}
              >
                Refresh
              </StyledButton>
              <StyledButton
                onClick={() => navigate(sourceType === 'web' ? "/addsource" : "/api-source-creator")}
                variant="primary"
                icon={<Plus size={18} />}
              >
                Add Source
              </StyledButton>
            </div>
          </div>

          {/* Stats Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '40px'
          }}>
            <StatCard
              title={sourceType === 'web' ? "Total Sources" : "Total API Sources"}
              value={sources.length}
              color="#00364A"
            />
            {sourceType === 'web' ? (
              <>
                <StatCard title="Entity Mappings" value={totalMappings} color="#49A3C4" />
                <StatCard title="Active Tasks" value={totalTasks} color="#00364A" />
              </>
            ) : (
              <StatCard title="Active Integrations" value={sources.length} color="#49A3C4" />
            )}
          </div>

          {/* Response Messages - REMOVED: now using NotificationPanel */}

          {/* Sources List */}
          {sources.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              backgroundColor: '#F8FBFF',
              borderRadius: '20px',
              border: '2px dashed rgba(0, 54, 74, 0.1)'
            }}>
              {sourceType === 'web' ? <Database size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} /> : <Globe size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} />}
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#00364A', marginBottom: '5px' }}>
                No {sourceType === 'web' ? 'Web' : 'API'} Sources Found
              </h3>
              <p style={{ color: '#00364A', opacity: 0.6 }}>
                Add your first {sourceType === 'web' ? 'web scraping' : 'API'} source to get started.
              </p>
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
                  {sourceType === 'web' && editingSource === source.id ? (
                    /* Web Source Edit Mode */
                    <WebSourceEditForm
                      source={source}
                      editForm={editForm}
                      setEditForm={setEditForm}
                      editPaginationType={editPaginationType}
                      setEditPaginationType={setEditPaginationType}
                      editPaginationConfig={editPaginationConfig}
                      setEditPaginationConfig={setEditPaginationConfig}
                      loading={loading}
                      onSave={handleSaveWebEdit}
                      onCancel={() => {
                        setEditingSource(null);
                        setEditForm({ name: '', url: '' });
                        setEditPaginationType('');
                        setEditPaginationConfig({});
                      }}
                    />
                  ) : sourceType === 'web' ? (
                    /* Web Source View Mode */
                    <WebSourceView
                      source={source}
                      expandedSource={expandedSource}
                      dependencies={dependencies}
                      onExpand={handleExpand}
                      onEdit={handleEdit}
                      onDelete={setDeleteConfirm}
                    />
                  ) : (
                    /* API Source View Mode */
                    <ApiSourceView
                      source={source}
                      expandedSource={expandedSource}
                      testingSource={testingSource}
                      testResult={testResult}
                      onExpand={handleExpand}
                      onEdit={handleEdit}
                      onDelete={setDeleteConfirm}
                      onTestConnection={handleTestConnection}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <DeleteConfirmModal
              sourceType={sourceType}
              source={sources.find(s => s.id === deleteConfirm)}
              dependencies={dependencies[deleteConfirm]}
              loading={loading}
              onConfirm={(force) => handleDelete(deleteConfirm, force)}
              onCancel={() => setDeleteConfirm(null)}
            />
          )}
        </div>
      </div>
        </main>
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

// Web Source Edit Form Component
const WebSourceEditForm = ({
  source,
  editForm,
  setEditForm,
  editPaginationType,
  setEditPaginationType,
  editPaginationConfig,
  setEditPaginationConfig,
  loading,
  onSave,
  onCancel
}) => (
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
          onClick={onCancel}
          variant="secondary"
          icon={<X size={18} />}
        >
          Cancel
        </StyledButton>
        <StyledButton
          onClick={onSave}
          variant="primary"
          disabled={loading}
          icon={loading ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
        >
          Update
        </StyledButton>
      </div>
    </div>
  </div>
);

// Web Source View Component
const WebSourceView = ({ source, expandedSource, dependencies, onExpand, onEdit, onDelete }) => (
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
            onClick={() => onExpand(source.id)}
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
          {source.pagination_config && (
            <InfoItem icon={<Settings size={14} />} label="Pagination">
              {source.pagination_config.type || 'None'}
            </InfoItem>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        <IconButton onClick={() => onEdit(source)} icon={<Edit size={18} />} color="#49A3C4" />
        <IconButton onClick={() => onDelete(source.id)} icon={<Trash2 size={18} />} color="#EF4444" />
      </div>
    </div>

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
);

// API Source View Component
const ApiSourceView = ({
  source,
  expandedSource,
  testingSource,
  testResult,
  onExpand,
  onEdit,
  onDelete,
  onTestConnection
}) => (
  <div style={{ padding: '25px 30px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
          <button onClick={() => onExpand(source.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#49A3C4', padding: '5px', display: 'flex', alignItems: 'center' }}>
            {expandedSource === source.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{source.name}</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', paddingLeft: '40px', marginTop: '10px' }}>
          <InfoItem icon={<Globe size={14} />} label="Endpoint"><span style={{ wordBreak: 'break-all' }}>{source.api_url}</span></InfoItem>
          <InfoItem icon={<Database size={14} />} label="Entity">{source.entity_name}</InfoItem>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        <IconButton onClick={() => onEdit(source)} icon={<Edit size={18} />} color="#49A3C4" title="Edit" />
        <IconButton onClick={() => onDelete(source.id)} icon={<Trash2 size={18} />} color="#EF4444" title="Delete" />
      </div>
    </div>

    {expandedSource === source.id && (
      <div style={{ marginTop: '25px', paddingTop: '25px', borderTop: '1px solid #eee' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
          <div>
            <SectionTitle icon={<List size={16} />} title={`Field Mappings (${source.field_mappings?.length || 0})`} />
            <div style={{ padding: '15px', background: '#F8FBFE', borderRadius: '15px', border: '1px solid #E2E8F0', maxHeight: '200px', overflowY: 'auto' }}>
              {source.field_mappings && source.field_mappings.length > 0 ? (
                source.field_mappings.map((m, i) => (
                  <div key={i} style={{ fontSize: '13px', marginBottom: '8px', padding: '8px', backgroundColor: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#49A3C4' }}>{m.api_field}</span>
                    <span style={{ color: '#00364A', opacity: 0.5 }}>→</span>
                    <span style={{ color: '#00364A' }}>{m.db_field}</span>
                    {m.transform && <span style={{ fontSize: '11px', color: '#059669', marginLeft: 'auto' }}>({m.transform})</span>}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#00364A', opacity: 0.5, padding: '10px' }}>No mappings configured</div>
              )}
            </div>
          </div>

          <div>
            <SectionTitle icon={<Settings size={16} />} title="Request Configuration" />
            <div style={{ padding: '15px', background: '#F8FBFE', borderRadius: '15px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <InfoItem icon={<Zap size={14} />} label="Method">{source.request_template?.method || 'GET'}</InfoItem>
              <InfoItem icon={<Code size={14} />} label="Data Path">{source.data_extraction_path || '$'}</InfoItem>
              {source.request_template?.timeout && (
                <InfoItem icon={<Info size={14} />} label="Timeout">{source.request_template.timeout}s</InfoItem>
              )}
              {source.api_key_name && (
                <InfoItem icon={<Lock size={14} />} label="Auth Header">{source.api_key_name}</InfoItem>
              )}
            </div>
          </div>
        </div>

        <StyledButton
          onClick={() => onTestConnection(source.id)}
          disabled={testingSource === source.id}
          variant="outline"
          icon={testingSource === source.id ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
        >
          Test Connection
        </StyledButton>

        {testResult && testResult.sourceId === source.id && (
          <div style={{ marginTop: '15px', padding: '15px', background: testResult.success ? '#E0F2FE' : '#FEF2F2', borderRadius: '12px', border: `1px solid ${testResult.success ? '#49A3C4' : '#EF4444'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              {testResult.success ? <CheckCircle size={18} color="#49A3C4" /> : <AlertTriangle size={18} color="#EF4444" />}
              <b>{testResult.message}</b>
            </div>
            {testResult.data && <CodeBlock data={testResult.data} />}
          </div>
        )}
      </div>
    )}
  </div>
);

// Delete Confirmation Modal
const DeleteConfirmModal = ({ sourceType, source, dependencies, loading, onConfirm, onCancel }) => (
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

      <p style={{ fontSize: '16px', color: '#00364A', opacity: 0.8, marginBottom: '25px', lineHeight: '1.5' }}>
        Are you sure you want to delete <strong style={{ color: '#00364A', opacity: 1 }}>"{source?.name}"</strong>?
      </p>

      {sourceType === 'web' && dependencies && (dependencies.mappings.length > 0 || dependencies.tasks.length > 0) && (
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
            {dependencies.mappings.length > 0 && <li>{dependencies.mappings.length} entity mapping(s)</li>}
            {dependencies.tasks.length > 0 && <li>{dependencies.tasks.length} task(s)</li>}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: '15px' }}>
        <StyledButton
          onClick={() => onConfirm(true)}
          variant="danger"
          disabled={loading}
          style={{ flex: 1 }}
        >
          {loading ? 'Deleting...' : 'Delete Everything'}
        </StyledButton>
        <StyledButton
          onClick={onCancel}
          variant="secondary"
          style={{ flex: 1 }}
        >
          Cancel
        </StyledButton>
      </div>
    </div>
  </div>
);

// API Source Form Component (for editing)
const ApiSourceForm = ({ source, onClose, onSuccess, showNotification }) => {
  const [loading, setLoading] = useState(false);
  const [entities, setEntities] = useState([]);

  const [formData, setFormData] = useState({
    ...source,
    api_key: '',
    api_key_name: source.api_key_name || 'Authorization',
    request_template: source.request_template || { method: 'GET', headers: {}, params: {}, body: {}, timeout: 30 }
  });

  const [newMapping, setNewMapping] = useState({ api_field: '', db_field: '', transform: '' });

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await fetch(`${API_BASE}/entity/entities`, { headers: { "ngrok-skip-browser-warning": "true" } });
        const data = await response.json();
        if (Array.isArray(data.entities)) setEntities(data.entities.map(e => e.name || e));
      } catch (err) { console.error(err); }
    };
    fetchEntities();
  }, []);

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleNestedChange = (parent, field, value) => setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api-sources/${source.id}`, {
        method: 'PUT',
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify(formData)
      });
      if (response.ok) onSuccess();
      else showNotification('error', 'Update failed');
    } catch (err) { showNotification('error', err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '25px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
      <SectionTitle icon={<Edit size={16} />} title="Edit API Source" />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <FormGroup label="Source Name" value={formData.name} onChange={v => handleInputChange('name', v)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.7 }}>Entity Name</label>
            <select value={formData.entity_name} onChange={e => handleInputChange('entity_name', e.target.value)} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f0f4f8', border: 'none' }}>
              <option value="">Select Entity</option>
              {entities.map((e, i) => <option key={i} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <FormGroup label="API URL" value={formData.api_url} onChange={v => handleInputChange('api_url', v)} />

        <section style={{ padding: '20px', backgroundColor: '#F8FBFE', borderRadius: '15px', border: '1px solid #49A3C4' }}>
          <SectionTitle icon={<Settings size={16} />} title="Request Configuration" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: 15 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600' }}>HTTP Method</label>
              <select
                value={formData.request_template.method}
                onChange={e => handleNestedChange('request_template', 'method', e.target.value)}
                style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #49A3C4', backgroundColor: 'white' }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
            <FormGroup label="Timeout (sec)" type="number" value={formData.request_template.timeout} onChange={v => handleNestedChange('request_template', 'timeout', v)} />
          </div>

          {formData.request_template.method !== 'GET' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600' }}>Request Body (JSON)</label>
              <textarea
                value={typeof formData.request_template.body === 'object' ? JSON.stringify(formData.request_template.body, null, 2) : formData.request_template.body}
                onChange={e => { try { handleNestedChange('request_template', 'body', JSON.parse(e.target.value)); } catch (err) { handleNestedChange('request_template', 'body', e.target.value); } }}
                style={{ height: '80px', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontFamily: 'monospace' }}
                placeholder='{ "key": "value" }'
              />
            </div>
          )}
        </section>

        <section style={{ padding: '20px', backgroundColor: '#F8FBFE', borderRadius: '15px', border: '1px solid #E2E8F0' }}>
          <SectionTitle icon={<Lock size={16} />} title="Authentication" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <FormGroup label="Auth Header Name" value={formData.api_key_name} onChange={v => handleInputChange('api_key_name', v)} />
            <FormGroup label="API Key" type="password" value={formData.api_key} onChange={v => handleInputChange('api_key', v)} placeholder="Keep blank to keep current" />
          </div>
        </section>

        <section>
          <SectionTitle icon={<List size={16} />} title="Mappings" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
            <FormSubGroup label="API Field" value={newMapping.api_field} onChange={v => setNewMapping({ ...newMapping, api_field: v })} />
            <FormSubGroup label="DB Field" value={newMapping.db_field} onChange={v => setNewMapping({ ...newMapping, db_field: v })} />
            <FormSubGroup label="Transform" value={newMapping.transform} onChange={v => setNewMapping({ ...newMapping, transform: v })} />
            <StyledButton type="button" onClick={() => { setFormData(p => ({ ...p, field_mappings: [...p.field_mappings, newMapping] })); setNewMapping({ api_field: '', db_field: '', transform: '' }); }} variant="outline" icon={<Plus size={16} />} />
          </div>
          <div style={{ marginTop: '10px' }}>
            {formData.field_mappings.map((m, i) => (
              <div key={i} style={{ fontSize: '13px', background: '#f8fbfe', padding: '8px', marginBottom: '5px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{m.api_field} → {m.db_field}</span>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, field_mappings: p.field_mappings.filter((_, idx) => idx !== i) }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                >
                  <Trash2 size={14} color="#EF4444" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', gap: '15px' }}>
          <StyledButton type="submit" disabled={loading} variant="primary" icon={loading ? <Loader2 size={18} className="spin" /> : <Save size={18} />}>Update Source</StyledButton>
          <StyledButton type="button" onClick={onClose} variant="secondary">Cancel</StyledButton>
        </div>
      </form>
    </div>
  );
};

// Helper Components
const StyledButton = ({ onClick, variant = 'primary', icon, children, disabled, style, type = "button" }) => {
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
      type={type}
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
        {icon && <span style={{ color: '#49A3C4', display: 'flex', alignItems: 'center' }}>{icon}</span>}
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

const FormGroup = ({ label, value, onChange, type = "text", placeholder = "" }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.7 }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ padding: '12px 16px', borderRadius: '12px', border: 'none', backgroundColor: '#f0f4f8', color: '#00364A', outline: 'none', fontSize: '14px' }}
    />
  </div>
);

const FormSubGroup = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    <label style={{ fontSize: '11px', fontWeight: '700', opacity: 0.5 }}>{label}</label>
    <input value={value} onChange={e => onChange(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }} />
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
    <span style={{ color: '#49A3C4', display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
    <span style={{ fontWeight: '600', opacity: 0.9, flexShrink: 0 }}>{label}:</span>
    <span style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
  </div>
);

const IconButton = ({ onClick, icon, color, title }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '40px',
        minWidth: '40px',
        height: '40px',
        borderRadius: '10px',
        border: 'none',
        backgroundColor: hover ? `${color}15` : 'transparent',
        color: color,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        padding: 0,
        flexShrink: 0
      }}
    >
      {icon}
    </button>
  );
};

const DependencySection = ({ title, count, icon, items }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
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
      {items.length === 0 && <span style={{ fontSize: '13px', color: '#00364A', opacity: 0.4 }}></span>}
    </div>
  </div>
);

const SectionTitle = ({ icon, title }) => (
  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#00364A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={{ color: '#49A3C4', display: 'flex', alignItems: 'center' }}>{icon}</span> {title}
  </h4>
);

const CodeBlock = ({ data }) => (
  <pre style={{ backgroundColor: '#F8FBFE', borderRadius: '12px', padding: '15px', fontSize: '12px', border: '1px solid #eee', overflow: 'auto', maxHeight: '200px', fontFamily: 'monospace', margin: 0 }}>
    {JSON.stringify(data, null, 2)}
  </pre>
);

// Floating toast notification panel (same pattern as EntityForm)
const NotificationPanel = ({ notifications, onRemove }) => {
  if (!notifications.length) return null;
  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
      {notifications.map(notif => (
        <div key={notif.id} style={{
          backgroundColor: notif.type === 'success' ? '#10B981' : '#EF4444',
          color: 'white', padding: '16px 20px', borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          animation: 'slideIn 0.3s ease', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ flexShrink: 0, marginTop: '2px' }}>
            {notif.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          </div>
          <div style={{ flex: 1, fontSize: '14px', fontWeight: '500', lineHeight: '1.5' }}>{notif.message}</div>
          <button onClick={() => onRemove(notif.id)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8, padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px', flexShrink: 0 }}
            onMouseEnter={e => e.target.style.opacity = '1'} onMouseLeave={e => e.target.style.opacity = '0.8'}>
            <X size={16} />
          </button>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
};

export default SourceManagement;