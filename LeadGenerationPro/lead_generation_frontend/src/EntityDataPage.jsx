import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Database, ChevronLeft, ChevronRight, Loader2, AlertTriangle, List, ArrowLeft, Download, FileText, Menu, ChevronDown, ChevronRight as ChevronRightIcon, LayoutGrid, ClipboardPlus, CalendarCheck, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import API_BASE from "./api_base";
import { useNavigate } from "react-router-dom";

// Helper: Fetch all entity data (across all pages)
const fetchAllEntityData = async (entityName) => {
  let allRows = [];
  let page = 1;
  let hasMore = true;
  const pageSize = 100;

  while (hasMore) {
    const res = await fetch(
      `${API_BASE}/entity/entity-data/${entityName}?page=${page}&page_size=${pageSize}`,
      {
        method: "GET",
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      }
    );

    if (!res.ok) throw new Error("Failed to fetch data");
    const json = await res.json();
    
    if (json.rows && json.rows.length > 0) {
      allRows = [...allRows, ...json.rows];
      hasMore = json.rows.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  return allRows;
};

// Helper: Export data as CSV
const exportToCSV = (columns, rows, entityName) => {
  const header = columns.map(col => `"${col}"`).join(",");
  
  const csvRows = rows.map(row => {
    return row.map(cell => {
      const value = cell === null || cell === undefined ? "" : String(cell);
      return `"${value.replace(/"/g, '""')}"`;
    }).join(",");
  });

  const csv = [header, ...csvRows].join("\n");
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", `${entityName}_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.click();
};

// Helper: Export data as Excel
const exportToExcel = (columns, rows, entityName) => {
  const header = columns.join("\t");
  const excelRows = rows.map(row => 
    row.map(cell => {
      const value = cell === null || cell === undefined ? "" : String(cell);
      return value.replace(/\t/g, " ").replace(/\n/g, " ");
    }).join("\t")
  );

  const tsv = [header, ...excelRows].join("\n");
  
  const blob = new Blob([tsv], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", `${entityName}_export_${new Date().toISOString().split('T')[0]}.xls`);
  link.click();
};

// Tooltip Component for long text
const TextWithTooltip = ({ text, maxLength = 50 }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const displayText = text && String(text).length > maxLength 
    ? String(text).substring(0, maxLength) + "..." 
    : text;
  const needsTooltip = text && String(text).length > maxLength;

  if (!needsTooltip) {
    return <span>{text}</span>;
  }

  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span style={{ cursor: 'help' }}>{displayText}</span>
      {showTooltip && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '0',
          marginBottom: '8px',
          padding: '12px',
          backgroundColor: '#00364A',
          color: 'white',
          borderRadius: '8px',
          fontSize: '13px',
          maxWidth: '400px',
          wordWrap: 'break-word',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 54, 74, 0.3)',
          whiteSpace: 'normal'
        }}>
          {text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '20px',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #00364A'
          }} />
        </div>
      )}
    </div>
  );
};

const EntityDataScreen = () => {
  const [searchParams] = useSearchParams();
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false); 
  const [isNavigatingPage, setIsNavigatingPage] = useState(false);
  const [navigatingDirection, setNavigatingDirection] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const entityFromParam = searchParams.get('entity');

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

  // Fetch entities list
  const { data: entitiesData } = useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/entity/entities`,{
        method: "GET",
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      if (!res.ok) throw new Error("Failed to load entities");
      const json = await res.json();
      return json.entities || [];
    },
  });

  // Auto-select entity from URL parameter when entities load
  useEffect(() => {
    if (entityFromParam && entitiesData && entitiesData.length > 0 && !selectedEntity) {
      const matchingEntity = entitiesData.find(e => e.name === entityFromParam);
      if (matchingEntity) {
        setSelectedEntity(entityFromParam);
      }
    }
  }, [entityFromParam, entitiesData, selectedEntity]);

  // Fetch entity data
  const { data, isLoading: isLoadingData, isFetching: isFetchingData, error: queryError } = useQuery({
    queryKey: ['entity-data', selectedEntity, page, pageSize],
    queryFn: async () => {
      if (!selectedEntity) return null;
      const res = await fetch(
        `${API_BASE}/entity/entity-data/${selectedEntity}?page=${page}&page_size=${pageSize}`,
        {
          method: "GET",
          headers: {
            "ngrok-skip-browser-warning": "true"
          }
        }
      );

      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      return json;
    },
    enabled: !!selectedEntity,
  });

  // CHANGE THIS - Reset navigation direction when data fetching completes
  useEffect(() => {
    if (!isFetchingData) {
      setNavigatingDirection(null);
    }
  }, [isFetchingData]);

  const loading = isLoadingData && !data;
  const error = queryError?.message || null;
  const entities = entitiesData || [];

  // CHANGE THESE - Page navigation handlers
  const handlePreviousPage = () => {
    if (page > 1) {
      setNavigatingDirection('prev');
      setPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (data?.rows?.length === pageSize) {
      setNavigatingDirection('next');
      setPage((p) => p + 1);
    }
  };

  // Filter out modified_at column
  const filteredColumns = data?.columns?.filter(col => col !== 'modified_at') || [];
  const modifiedAtIndex = data?.columns?.indexOf('modified_at');
  const filteredRows = data?.rows?.map(row => {
    if (modifiedAtIndex !== -1) {
      return row.filter((_, idx) => idx !== modifiedAtIndex);
    }
    return row;
  }) || [];

  // Export handler for CSV
  const handleExportCSV = async () => {
    if (!selectedEntity || !data) return;
    
    try {
      setExportingCSV(true);
      const allRows = await fetchAllEntityData(selectedEntity);
      exportToCSV(data.columns, allRows, selectedEntity);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExportingCSV(false);
    }
  };

  // Export handler for Excel
  const handleExportExcel = async () => {
    if (!selectedEntity || !data) return;
    
    try {
      setExportingExcel(true);
      const allRows = await fetchAllEntityData(selectedEntity);
      exportToExcel(data.columns, allRows, selectedEntity);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div style={sidebarStyles.container}>
      {/* Sidebar */}
      <aside style={sidebarStyles.sidebar}>
        <div style={sidebarStyles.sidebarInner}>
          <h2 style={sidebarStyles.sidebarHeader}>SCOUT</h2>

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
            <h1 style={sidebarStyles.headerTitle}>Entity Data Viewer</h1>
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
        <div style={{ padding: '50px' }}>
          {/* Entity Selector */}
          <div style={{ marginBottom: '30px', maxWidth: '400px' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#00364A',
              marginBottom: '8px',
              display: 'block'
            }}>Select Entity</label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedEntity || ""}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: 'rgba(73, 163, 196, 0.15)',
                  color: '#00364A',
                  fontSize: '15px',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300364A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 20px top 50%',
                  backgroundSize: '12px auto'
                }}
              >
                <option value="">-- Choose an entity --</option>
                {(entities || []).map((ent, idx) => (
                  <option key={idx} value={ent.name}>
                    {ent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              marginBottom: '30px',
              padding: '20px 25px',
              borderRadius: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              backgroundColor: '#FEF2F2',
              border: '2px solid #EF4444',
              color: '#00364A'
            }}>
              <AlertTriangle size={20} color="#EF4444" />
              <span style={{ fontWeight: '500' }}>{error}</span>
            </div>
          )}

          {/* Loading */}
          {(loading || (isFetchingData && page > 1)) && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '60px 0',
              color: '#00364A'
            }}>
              <Loader2 size={32} className="spin" style={{ marginRight: '10px' }} />
              <span style={{ fontSize: '18px', fontWeight: '600' }}>
                {isNavigatingPage ? 'Loading page...' : 'Loading data...'}
              </span>
            </div>
          )}

          {/* No Data */}
          {!loading && !isFetchingData && data && filteredRows && filteredRows.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              backgroundColor: '#F8FBFF',
              borderRadius: '20px',
              border: '2px dashed rgba(0, 54, 74, 0.1)'
            }}>
              <List size={48} style={{ color: '#49A3C4', marginBottom: '15px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#00364A', marginBottom: '5px' }}>No Data Found</h3>
              <p style={{ color: '#00364A', opacity: 0.6 }}></p>
            </div>
          )}

          {/* Data Table */}
          {!loading && data && filteredRows && filteredRows.length > 0 && (
            <div style={{
              overflowX: 'auto',
              borderRadius: '15px',
              border: '1px solid rgba(0, 54, 74, 0.1)',
              boxShadow: '0 4px 15px rgba(0, 54, 74, 0.05)',
              opacity: isFetchingData ? 0.6 : 1,
              transition: 'opacity 0.3s ease'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                <thead style={{ backgroundColor: '#F8FBFF' }}>
                  <tr>
                    {filteredColumns.map((col, idx) => (
                      <th key={idx} style={{
                        padding: '16px 20px',
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#00364A',
                        borderBottom: '1px solid rgba(0, 54, 74, 0.1)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, ridx) => (
                    <tr key={ridx} style={{ 
                      backgroundColor: ridx % 2 === 0 ? 'white' : '#FAFAFA',
                      transition: 'background-color 0.2s'
                    }}>
                      {row.map((cell, cidx) => (
                        <td key={cidx} style={{
                          padding: '16px 20px',
                          fontSize: '14px',
                          color: '#00364A',
                          borderBottom: '1px solid rgba(0, 54, 74, 0.05)',
                          whiteSpace: 'nowrap'
                        }}>
                          <TextWithTooltip text={cell} maxLength={50} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && filteredRows && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '30px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(0, 54, 74, 0.1)',
              flexWrap: 'wrap',
              gap: '20px'
            }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <StyledButton
                  onClick={handlePreviousPage}
                  disabled={page === 1 || isFetchingData}
                  icon={navigatingDirection === 'prev' ? <Loader2 size={18} className="spin" /> : <ChevronLeft size={18} />}
                >
                  Previous
                </StyledButton>

                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#00364A',
                  alignSelf: 'center',
                  padding: '0 15px'
                }}>
                  Page {page}
                </span>

                <StyledButton
                  onClick={handleNextPage}
                  disabled={data.rows.length < pageSize || isFetchingData}
                  icon={navigatingDirection === 'next' ? <Loader2 size={18} className="spin" /> : <ChevronRight size={18} />}
                  iconPos="right"
                >
                  Next
                </StyledButton>
              </div>
              {/* Export Buttons */}
              {filteredRows.length > 0 && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <ExportButton
                    onClick={handleExportCSV}
                    disabled={exportingCSV || isFetchingData}
                    icon={exportingCSV ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
                    title="Export All as CSV"
                  >
                    {exportingCSV ? 'Exporting...' : 'CSV'}
                  </ExportButton>
                  <ExportButton
                    onClick={handleExportExcel}
                    disabled={exportingExcel || isFetchingData}
                    icon={exportingExcel ? <Loader2 size={18} className="spin" /> : <FileText size={18} />}
                    title="Export All as Excel"
                  >
                    {exportingExcel ? 'Exporting...' : 'Excel'}
                  </ExportButton>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
        </main>
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};
// Helper Component for Buttons
const StyledButton = ({ onClick, disabled, icon, children, iconPos = "left" }) => {
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
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: hover && !disabled ? '#E0EFFF' : 'white',
        color: disabled ? '#A0AEC0' : '#00364A',
        border: `2px solid ${disabled ? '#E2E8F0' : '#00364A'}`,
        borderRadius: '10px',
        fontWeight: '600',
        fontSize: '14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s',
        flexDirection: iconPos === 'right' ? 'row-reverse' : 'row'
      }}
    >
      {icon}
      {children}
    </button>
  );
};

// Export Button Component
const ExportButton = ({ onClick, disabled, icon, children, title }) => {
  const [hover, setHover] = useState(false);
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: hover && !disabled ? '#10B981' : '#059669',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontWeight: '600',
        fontSize: '14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s',
        opacity: disabled ? 0.6 : 1
      }}
    >
      {icon}
      {children}
    </button>
  );
};

export default EntityDataScreen;