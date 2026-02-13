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
  ToggleLeft,
  ToggleRight,
  Columns,
  RefreshCw,
  Search,
  ArrowLeft
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: mappingsData, isLoading: isLoadingMappings, error: queryError } = useQuery({
    queryKey: ['mappings'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/mapping/mappings`,{
        method: "GET",
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      if (!res.ok) throw new Error("Failed to fetch mappings");
      const data = await res.json();
      return data?.mappings ?? [];
    },
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
      alert("Failed to delete mapping — check console for details.");
    } finally {
      setDeleting(false);
    }
  };

  const toggleMappingStatus = async (mappingName, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE}/mapping/toggle-mapping-status/${encodeURIComponent(mappingName)}`, {
        method: 'PUT',
        headers:{
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
      alert("Failed to toggle mapping status — check console for details.");
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
              <MapIcon size={28} />
            </div>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#00364A',
                margin: 0,
                lineHeight: '1.2'
              }}>Mapping Management</h1>
              <p style={{
                fontSize: '16px',
                color: '#00364A',
                opacity: 0.7,
                margin: '5px 0 0 0'
              }}>Review and manage your entity mappings</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <StyledButton 
              onClick={()=>navigate('/dashboard')} 
              variant="outline"
              icon={<ArrowLeft size={18} />}
            >
              Dashboard
            </StyledButton>
            <StyledButton 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['mappings'] })} 
              variant="outline"
              icon={<RefreshCw size={18} />}
            >
              Refresh
            </StyledButton>
            <StyledButton 
              onClick={() => window.location.href = '/entitymappingform'} 
              variant="primary"
              icon={<Edit3 size={18} />}
            >
              Create Mapping
            </StyledButton>
          </div>
        </div>

        <div style={{ padding: '50px' }}>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '17px', padding:'3px' }}>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                style={{
                  padding: '14px 10px',
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
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#00364A', opacity: 0.6 }}>Loading mappings...</div>
          ) : error ? (
            <div style={{ padding: '20px', borderRadius: '15px', backgroundColor: '#FEF2F2', border: '2px solid #EF4444', color: '#991B1B', display: 'flex', gap: '10px' }}>
              <AlertCircle size={20} /> {error}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#F8FBFF', borderRadius: '20px', border: '2px dashed rgba(0, 54, 74, 0.1)' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#00364A', margin: 0 }}>{m.mapping_name}</h3>
                          <div style={{ fontSize: '14px', color: '#00364A', opacity: 0.6 }}>{m.source_name} • {m.entity_name}</div>
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '14px', color: '#00364A', opacity: 0.8, display: 'flex', gap: '20px' }}>
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
                          backgroundColor: st.color.includes('bg-green') ? '#E0F2FE' : (st.color.includes('bg-red') ? '#FEE2E2' : '#FEF3C7'),
                          color: st.color.includes('text-green') ? '#00364A' : (st.color.includes('text-red') ? '#991B1B' : '#92400E')
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
    </div>
  );
};

const StyledButton = ({ onClick, variant = 'primary', icon, children, disabled }) => {
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

export default MappingManager;