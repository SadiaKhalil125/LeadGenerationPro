import React, { useEffect, useState, useMemo } from "react";
import {
  Database,
  Map as MapIcon,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  X,
  ToggleLeft,
  ToggleRight,
  Columns,
  RefreshCw,
  Search,
  ArrowLeft,
  Menu,
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  LayoutGrid,
  ClipboardPlus,
  CalendarCheck,
  Settings,
  Loader2
} from "lucide-react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API_BASE from "./api_base";
import { useNavigate } from "react-router-dom";

function shortDate(ts) {
  if (!ts) return "-";
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

function statusForMapping(m) {
  if (m.enabled === false) {
    return { label: "Disabled", color: "bg-red-100 text-red-800" };
  }
  if (!m.field_mappings || Object.keys(m.field_mappings).length === 0) {
    return { label: "Broken", color: "bg-yellow-100 text-yellow-800" };
  }
  return { label: "Active", color: "bg-green-100 text-green-800" };
}

const MappingManager = () => {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [deleting, setDeleting] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      backgroundColor: "#C7D8ED", // background
      color: "#00364A",
      fontFamily: "'Inter', sans-serif",
    },

    sidebar: {
      position: "fixed",
      top: 0,
      left: 0,
      height: "100%",
      backgroundColor: "#00364A", // primary
      color: "#FFFFFF",
      boxShadow: "0 0 20px rgba(0, 54, 74, 0.15)", // shadowLight
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
      background: "linear-gradient(135deg, #ffffff 0%, #49A3C4 100%)", // accent
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
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
      backgroundColor: isActive
        ? "rgba(73, 163, 196, 0.25)" // accent active
        : "transparent",
      color: "#FFFFFF",
      marginBottom: "8px",
      justifyContent: sidebarOpen ? "flex-start" : "center",
    }),

    menuButtonHover: {
      backgroundColor: "rgba(73, 163, 196, 0.15)", // accent hover
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
      color: "#FFFFFF",
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
      backgroundColor: "#C7D8ED", // background
      display: "flex",
      flexDirection: "column",
    },

    header: {
      width: "100%",
      background: "#00364A", // primary
      color: "#FFFFFF",
      padding: "20px 32px",
      boxShadow: "0 4px 12px rgba(0, 54, 74, 0.15)", // shadowLight
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
      backgroundColor: "rgba(73, 163, 196, 0.2)", // accent
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#FFFFFF",
      transition: "all 0.2s ease",
    },

    headerTitle: {
      fontSize: "28px",
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: "0.5px",
    },

    main: {
      padding: "40px",
      flex: 1,
      width: "100%",
    },
  };

  const addNotification = (type, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const { data: mappingsData, isLoading: isLoadingMappings, error: queryError } = useQuery({
    queryKey: ['mappings'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/mapping/mappings`, {
        method: "GET",
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      if (!res.ok) throw new Error("Failed to fetch mappings");
      const data = await res.json();
      return data?.mappings ?? [];
    },
    refetchOnMount: true,
  });

  const loading = isLoadingMappings && !mappingsData;
  const mappings = mappingsData || [];
  const error = queryError?.message || "";

  const sources = useMemo(() => {
    const s = new Set(mappings.map((m) => m.source_name || "unknown"));
    return ["all", ...Array.from(s)];
  }, [mappings]);

  const stats = useMemo(() => {
    const total = mappings.length;
    const active = mappings.filter((m) => {
      return m.enabled !== false && m.field_mappings && Object.keys(m.field_mappings).length > 0;
    }).length;
    const disabled = mappings.filter((m) => m.enabled === false).length;
    const broken = total - active - disabled;
    return { total, active, disabled, broken };
  }, [mappings]);

  const filtered = useMemo(() => {
    return mappings.filter((m) => {
      const matchesSearch =
        !search ||
        (m.mapping_name && m.mapping_name.toLowerCase().includes(search.toLowerCase())) ||
        (m.entity_name && m.entity_name.toLowerCase().includes(search.toLowerCase())) ||
        (m.source_name && m.source_name.toLowerCase().includes(search.toLowerCase()));
      const matchesSource = filterSource === "all" || (m.source_name || "unknown") === filterSource;
      return matchesSearch && matchesSource;
    });
  }, [mappings, search, filterSource]);

  const onDelete = async (mappingName) => {
    if (!window.confirm(`Delete mapping '${mappingName}'? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/mapping/delete-mapping/${encodeURIComponent(mappingName)}`, {
        method: 'DELETE',
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      queryClient.setQueryData(['mappings'], (oldMappings) => {
        if (!oldMappings) return oldMappings;
        return oldMappings.filter(m => m.mapping_name !== mappingName);
      });

      queryClient.invalidateQueries({ queryKey: ['mappings'] }, { refetchType: 'none' });
    } catch (err) {
      console.error("Delete failed:", err);
      addNotification('error', 'Failed to delete mapping — check console for details.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleMappingStatus = async (mappingName, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE}/mapping/toggle-mapping-status/${encodeURIComponent(mappingName)}`, {
        method: 'PUT',
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      queryClient.setQueryData(['mappings'], (oldMappings) => {
        if (!oldMappings) return oldMappings;
        return oldMappings.map(m =>
          m.mapping_name === mappingName ? { ...m, enabled: data.enabled } : m
        );
      });

      queryClient.invalidateQueries({ queryKey: ['mappings'] }, { refetchType: 'none' });
    } catch (err) {
      console.error("Toggle status failed:", err);
      addNotification('error', 'Failed to toggle mapping status — check console for details.');
    }
  };

  const onOpenEdit = (mapping) => {
    navigate('/entitymappingform', {
      state: {
        editMode: true,
        mappingData: {
          id: mapping.id,
          mapping_name: mapping.mapping_name,
          source_name: mapping.source_name,
          source_id: mapping.source_id,
          url: mapping.url,
          entity_name: mapping.entity_name,
          container_selector: mapping.container_selector,
          field_mappings: mapping.field_mappings,
          follow_links: mapping.follow_links || [],
          enabled: mapping.enabled
        }
      }
    });
  };

  return (
    <div style={sidebarStyles.container}>
      {/* Sidebar */}
      <aside style={sidebarStyles.sidebar}>
        <div style={sidebarStyles.sidebarInner}>
          <h2 
            style={{ ...sidebarStyles.sidebarHeader, cursor: 'pointer' }}
            onClick={() => navigate('/dashboard')}
          > SCOUT
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
                    <ChevronDownIcon size={20} />
                  ) : (
                    <ChevronRightIcon size={20} />
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
            <h1 style={sidebarStyles.headerTitle}>Mapping Management</h1>
          </div>
        </header>

        {/* Floating Notification Panel */}
        <NotificationPanel notifications={notifications} onRemove={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />

        {/* Content Area */}
        <main style={sidebarStyles.main}>
          <div style={{
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '25px',
            boxShadow: '0 15px 50px rgba(0, 54, 74, 0.15)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '40px 50px' }}>
              {/* Stats Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '40px'
              }}>
                <StatCard title="Total Mappings" value={stats.total} color="#00364A" />
                <StatCard title="Active" value={stats.active} color="#059669" />
                <StatCard title="Disabled" value={stats.disabled} color="#DC2626" />
                <StatCard title="Broken" value={stats.broken} color="#D97706" />
              </div>

              {/* Search and Filters */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '30px', 
                flexWrap: 'wrap', 
                gap: '20px' 
              }}>
                <div style={{ position: 'relative', width: '40%', minWidth: '300px' }}>
                  <div style={{ position: 'absolute', top: '50%', left: '15px', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <Search size={18} color="#00364A" style={{ opacity: 0.5 }} />
                  </div>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by mapping, entity or source..."
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    style={{
                      padding: '14px 20px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: 'rgba(73, 163, 196, 0.15)',
                      color: '#00364A',
                      fontSize: '15px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {sources.map((s) => (
                      <option key={s} value={s}>
                        {s === "all" ? "All Sources" : s}
                      </option>
                    ))}
                  </select>

                  <IconButton
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['mappings'] })}
                    icon={<RefreshCw size={18} />}
                    color="#00364A"
                    title="Refresh"
                  />

                  <StyledButton
                    onClick={() => navigate('/entitymappingform')}
                    variant="primary"
                    icon={<Edit3 size={18} />}
                  >
                    Create Mapping
                  </StyledButton>
                </div>
              </div>

              {/* Content based on state */}
              {loading ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px',
                  color: '#00364A',
                  gap: '20px'
                }}>
                  <Loader2 size={48} className="spin" style={{ color: '#00364A' }} />
                  <p style={{ fontSize: '16px', fontWeight: '500', opacity: 0.7 }}>Loading mappings...</p>
                </div>
              ) : error ? (
                <div style={{ 
                  padding: '20px', 
                  borderRadius: '15px', 
                  backgroundColor: '#FEF2F2', 
                  border: '2px solid #EF4444', 
                  color: '#991B1B', 
                  display: 'flex', 
                  gap: '10px',
                  alignItems: 'center'
                }}>
                  <AlertCircle size={20} /> {error}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px', 
                  backgroundColor: '#F8FBFF', 
                  borderRadius: '20px', 
                  border: '2px dashed rgba(0, 54, 74, 0.1)' 
                }}>
                  <MapIcon size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} />
                  <p style={{ fontSize: '18px', fontWeight: '600', color: '#00364A', marginBottom: '5px' }}>No mappings found</p>
                  <p style={{ color: '#00364A', opacity: 0.6 }}>Create your first mapping to get started</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {filtered.map((m) => {
                    const st = statusForMapping(m);
                    return (
                      <div key={m.id} style={{
                        backgroundColor: m.enabled !== false ? 'white' : '#F3F4F6',
                        border: '2px solid rgba(0, 54, 74, 0.08)',
                        borderRadius: '20px',
                        boxShadow: '0 4px 15px rgba(0, 54, 74, 0.05)',
                        overflow: 'hidden',
                        transition: 'all 0.3s',
                        opacity: m.enabled !== false ? 1 : 0.8
                      }}>
                        <div style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#00364A', margin: 0 }}>{m.mapping_name}</h3>
                              <div style={{ fontSize: '14px', color: '#00364A', opacity: 0.6 }}>Source: {m.source_name} • Entity: {m.entity_name}</div>
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '14px', color: '#00364A', opacity: 0.8, display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                              <span>Container: <strong>{m.container_selector || "-"}</strong></span>
                              <span>Created: <strong>{shortDate(m.created_at)}</strong></span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '700',
                              backgroundColor: st.label === 'Active' ? '#E0F2FE' : (st.label === 'Disabled' ? '#FEE2E2' : '#FEF3C7'),
                              color: st.label === 'Active' ? '#00364A' : (st.label === 'Disabled' ? '#991B1B' : '#92400E')
                            }}>
                              {st.label}
                            </div>

                            <IconButton
                              onClick={() => toggleMappingStatus(m.mapping_name, m.enabled)}
                              icon={m.enabled !== false ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                              color={m.enabled !== false ? "#059669" : "#DC2626"}
                              title={m.enabled !== false ? 'Disable' : 'Enable'}
                            />

                            <IconButton
                              onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                              icon={expandedId === m.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                              color="#49A3C4"
                              title="Details"
                            />

                            <IconButton
                              onClick={() => onOpenEdit(m)}
                              icon={<Edit3 size={18} />}
                              color="#D97706"
                              title="Edit"
                            />

                            <IconButton
                              onClick={() => onDelete(m.mapping_name)}
                              icon={<Trash2 size={18} />}
                              color="#EF4444"
                              title="Delete"
                              disabled={deleting}
                            />
                          </div>
                        </div>

                        {expandedId === m.id && (
                          <div style={{
                            borderTop: '1px solid rgba(0, 54, 74, 0.1)',
                            padding: '25px',
                            backgroundColor: '#F8FBFF'
                          }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#00364A', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Columns size={16} /> Field Mappings
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                              {Object.entries(m.field_mappings || {}).map(([key, value]) => (
                                <div key={key} style={{
                                  backgroundColor: 'white',
                                  padding: '15px',
                                  borderRadius: '12px',
                                  border: '1px solid rgba(0, 54, 74, 0.1)',
                                  boxShadow: '0 2px 8px rgba(0, 54, 74, 0.03)'
                                }}>
                                  <div style={{ fontWeight: '700', color: '#00364A', marginBottom: '5px' }}>{key}</div>
                                  <div style={{ fontSize: '13px', color: '#00364A', opacity: 0.7 }}>Selector: {value.selector}</div>
                                  <div style={{ fontSize: '13px', color: '#00364A', opacity: 0.7 }}>Extract: {value.extract}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes slideIn { 
          from { transform: translateX(100%); opacity: 0; } 
          to { transform: translateX(0); opacity: 1; } 
        }
      `}</style>
    </div>
  );
};

const StyledButton = ({ onClick, variant = 'primary', icon, children, disabled }) => {
  const [hover, setHover] = useState(false);

  const styles = {
    primary: {
      bg: '#00364A', color: 'white', border: '2px solid #00364A',
      hoverBg: '#004e6b', hoverColor: 'white'
    },
    outline: {
      bg: 'white', color: '#00364A', border: '2px solid #00364A',
      hoverBg: '#00364A', hoverColor: 'white'
    },
    secondary: {
      bg: 'white', color: '#00364A', border: '2px solid rgba(0, 54, 74, 0.2)',
      hoverBg: '#F3F4F6', hoverColor: '#00364A'
    },
    success: {
      bg: '#059669', color: 'white', border: '2px solid #059669',
      hoverBg: '#047857', hoverColor: 'white'
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
        padding: '10px 20px',
        borderRadius: '10px',
        fontWeight: '600',
        fontSize: '14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        transition: 'all 0.3s',
        backgroundColor: hover && !disabled ? currentStyle.hoverBg : currentStyle.bg,
        color: hover && !disabled ? currentStyle.hoverColor : currentStyle.color,
        border: currentStyle.border,
        boxShadow: hover && !disabled ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
        transform: hover && !disabled ? 'translateY(-2px)' : 'none'
      }}
    >
      {icon}
      {children}
    </button>
  );
};

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
        width: '40px',
        minWidth: '40px',
        height: '40px',
        borderRadius: '10px',
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

// Floating toast notification panel
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
          <button onClick={() => onRemove(notif.id)} style={{ 
            background: 'none', 
            border: 'none', 
            color: 'white', 
            cursor: 'pointer', 
            opacity: 0.8, 
            padding: '4px', 
            display: 'flex', 
            alignItems: 'center', 
            borderRadius: '4px', 
            flexShrink: 0 
          }}
            onMouseEnter={e => e.target.style.opacity = '1'} 
            onMouseLeave={e => e.target.style.opacity = '0.8'}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default MappingManager;