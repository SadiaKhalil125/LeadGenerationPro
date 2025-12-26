import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Menu,
  LayoutGrid,
  ClipboardPlus,
  CalendarCheck,
  Settings,
} 
from "lucide-react";

const NavigationPage = () => {
  const [openMenu, setOpenMenu] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);
  const navigate = useNavigate();

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const menuContent = {
    entity: {
      label: "Entity",
      icon: <LayoutGrid size={20} />,
      items: [
        { label: "Entity List", path: "/entitylist", description: "View and manage all entities in the system" },
        { label: "Create Entity", path: "/entityform", description: "Add a new entity to the database" },
        { label: "Entity Data Table", path: "/entity-data", description: "Browse entity data in table format" },
      ],
    },
    manager: {
      label: "Source",
      icon: <Settings size={20} />,
      items: [
        { label: "Source Manager", path: "/sourcemanagement", description: "Manage data sources and connections" },
        { label: "Add New Source", path: "/addsource", description: "Configure a new data source" },
      ],
    },
    mapping: {
      label: "Mapping",
      icon: <ClipboardPlus size={20} />,
      items: [
        { label: "Create Entity Mapping", path: "/entitymappingform", description: "Define relationships between entities" },
        { label: "Entity Mapping List", path: "/mappingmanager", description: "View all existing entity mappings" },
      ],
    },
    task: {
      label: "Task",
      icon: <CalendarCheck size={20} />,
      items: [
        { label: "Schedule a Task", path: "/taskscheduler", description: "Create and schedule new automated tasks" },
        { label: "Task List", path: "/tasksmanagement", description: "View and manage all scheduled tasks" },
        { label: "Task Executor", path: "/taskexecutor", description: "Execute tasks manually or view execution logs" },
      ],
    },

  };

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      backgroundColor: "#F1F6FB", // Fallback color
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
      // Fix for background color issue:
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
      // Fix for background color issue:
      flex: 1, 
      width: "100%",
    },

    contentCard: {
      backgroundColor: "white",
      padding: "32px",
      borderRadius: "20px",
      boxShadow: "0 8px 24px rgba(0, 54, 74, 0.08)",
      border: "1px solid rgba(0, 54, 74, 0.1)",
    },
    contentTitle: {
      fontSize: "24px",
      fontWeight: "700",
      marginBottom: "24px",
      paddingBottom: "16px",
      borderBottom: "2px solid rgba(0, 54, 74, 0.1)",
      color: "#00364A",
    },
    descriptionSection: {
      marginTop: "32px",
      padding: "24px",
      backgroundColor: "#F1F6FB",
      borderRadius: "16px",
      border: "2px solid rgba(0, 54, 74, 0.1)",
      minHeight: "100px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    descriptionTitle: {
      fontSize: "16px",
      fontWeight: "700",
      color: "#00364A",
      marginBottom: "8px",
    },
    descriptionText: {
      fontSize: "14px",
      fontWeight: "400",
      color: "#00364A",
      lineHeight: "1.6",
    },
    descriptionPlaceholder: {
      fontSize: "14px",
      fontWeight: "400",
      color: "#00364A",
      opacity: 0.5,
      fontStyle: "italic",
    },
    gridContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
      gap: "20px",
    },
    gridItem: {
      padding: "24px",
      backgroundColor: "#E0EFFF",
      border: "2px solid rgba(0, 54, 74, 0.15)",
      borderRadius: "16px",
      textAlign: "left",
      fontWeight: "600",
      fontSize: "15px",
      color: "#00364A",
      cursor: "pointer",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 12px rgba(0, 54, 74, 0.05)",
      position: "relative",
      overflow: "hidden",
    },
    quickAccessTitle: {
      fontSize: "42px",
      fontWeight: "700",
      marginBottom: "48px",
      color: "#00364A",
      letterSpacing: "0.3px",
      textAlign: "center",
    },
    quickAccessGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "24px",
      maxWidth: "1200px",
      margin: "0 auto",
    },
    quickAccessCard: {
      padding: "24px",
      backgroundColor: "white",
      borderRadius: "16px",
      boxShadow: "0 4px 20px rgba(0, 54, 74, 0.08)",
      border: "2px solid #E0E0E0",
      transition: "all 0.3s ease",
      textAlign: "left",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      position: "relative",
    },
    quickAccessIconSmall: {
      width: "48px",
      height: "48px",
      backgroundColor: "#5A7A8C",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      position: "absolute",
      top: "24px",
      right: "24px",
    },
    stepLabel: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#1A1A1A",
      margin: "0",
      marginBottom: "8px",
    },
    quickAccessCardTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#1A1A1A",
      margin: "0",
      marginBottom: "4px",
    },
    quickAccessCardText: {
      fontSize: "13px",
      fontWeight: "400",
      color: "#6B7280",
      margin: "0",
      lineHeight: "1.5",
      marginBottom: "8px",
    },
    actionButton: (color) => ({
      padding: "12px 24px",
      backgroundColor: color,
      color: "white",
      border: "2px solid " + color,
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
      marginTop: "auto",
      alignSelf: "flex-start",
    }),
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarInner}>
          <h2 style={styles.sidebarHeader}>SCOUT</h2>

          {Object.entries(menuContent).map(([key, { label, icon }]) => (
            <div key={key}>
              <button
                onClick={() => toggleMenu(key)}
                style={styles.menuButton(openMenu === key)}
                onMouseEnter={(e) => {
                  if (openMenu !== key) {
                    e.currentTarget.style.backgroundColor =
                      styles.menuButtonHover.backgroundColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (openMenu !== key) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {icon}
                {sidebarOpen && <span style={styles.menuLabel}>{label}</span>}
                {sidebarOpen &&
                  (openMenu === key ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  ))}
              </button>

              <div style={styles.submenuContainer(openMenu === key)}>
                {menuContent[key].items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(item.path)}
                    style={styles.submenuItem}
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
      <div style={styles.mainContent}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button
              onClick={() => {
                setSidebarOpen(!sidebarOpen);
                if (sidebarOpen) {
                  setOpenMenu(null);
                }
              }}
              style={styles.menuToggle}
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
            <h1 style={styles.headerTitle}>Navigation Dashboard</h1>
          </div>
        </header>

        {/* Content Area */}
        <main style={styles.main}>
          {!openMenu && (
            <div>
              <h2 style={styles.quickAccessTitle}>Quick Access</h2>
              <div style={styles.quickAccessGrid}>
                <div
                  style={styles.quickAccessCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(90, 122, 140, 0.25)";
                    e.currentTarget.style.borderColor = "#5A7A8C";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 54, 74, 0.08)";
                    e.currentTarget.style.borderColor = "#E0E0E0";
                  }}
                >
                  <div style={styles.quickAccessIconSmall}>
                    <LayoutGrid size={24} strokeWidth={2} />
                  </div>
                  <h2 style={styles.stepLabel}>Step 1</h2>
                  <h3 style={styles.quickAccessCardTitle}>Create an Entity</h3>
                  <p style={styles.quickAccessCardText}>
                    Add a new entity to the database
                  </p>
                  <button
                    style={styles.actionButton("#2C5F6F")}
                    onClick={() => navigate("/entityform")}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.color = "#2C5F6F";
                      e.currentTarget.style.border = "2px solid #2C5F6F";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#2C5F6F";
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.border = "2px solid #2C5F6F";
                    }}
                  >
                    Create Entity
                  </button>
                </div>

                <div
                  style={styles.quickAccessCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(90, 122, 140, 0.25)";
                    e.currentTarget.style.borderColor = "#5A7A8C";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 54, 74, 0.08)";
                    e.currentTarget.style.borderColor = "#E0E0E0";
                  }}
                >
                  <div style={styles.quickAccessIconSmall}>
                    <Settings size={24} strokeWidth={2} />
                  </div>
                  <h2 style={styles.stepLabel}>Step 2</h2>
                  <h3 style={styles.quickAccessCardTitle}>Add New Source</h3>
                  <p style={styles.quickAccessCardText}>
                    Use the Source Manager to register and manage data sources
                  </p>
                  <button
                    style={styles.actionButton("#2C5F6F")}
                    onClick={() => navigate("/addsource")}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.color = "#2C5F6F";
                      e.currentTarget.style.border = "2px solid #2C5F6F";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#2C5F6F";
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.border = "2px solid #2C5F6F";
                    }}
                  >
                    Add Source
                  </button>
                </div>

                <div
                  style={styles.quickAccessCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(90, 122, 140, 0.25)";
                    e.currentTarget.style.borderColor = "#5A7A8C";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 54, 74, 0.08)";
                    e.currentTarget.style.borderColor = "#E0E0E0";
                  }}
                >
                  <div style={styles.quickAccessIconSmall}>
                    <ClipboardPlus size={24} strokeWidth={2} />
                  </div>
                  <h2 style={styles.stepLabel}>Step 3</h2>
                  <h3 style={styles.quickAccessCardTitle}>Entity Mapping</h3>
                  <p style={styles.quickAccessCardText}>
                    Review existing mappings and create a new, configured mapping in the Mapping module if none is available.

                  </p>
                  <button
                    style={styles.actionButton("#2C5F6F")}
                    onClick={() => navigate("/mappingmanager")}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.color = "#2C5F6F";
                      e.currentTarget.style.border = "2px solid #2C5F6F";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#2C5F6F";
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.border = "2px solid #2C5F6F";
                    }}
                  >
                    View Mappings
                  </button>
                </div>

                <div
                  style={styles.quickAccessCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(90, 122, 140, 0.25)";
                    e.currentTarget.style.borderColor = "#5A7A8C";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 54, 74, 0.08)";
                    e.currentTarget.style.borderColor = "#E0E0E0";
                  }}
                >
                  <div style={styles.quickAccessIconSmall}>
                    <CalendarCheck size={24} strokeWidth={2} />
                  </div>
                  <h2 style={styles.stepLabel}>Step 4</h2>
                  <h3 style={styles.quickAccessCardTitle}>Schedule a Task</h3>
                  <p style={styles.quickAccessCardText}>
                    Create and schedule new automated tasks
                  </p>
                  <button
                    style={styles.actionButton("#2C5F6F")}
                    onClick={() => navigate("/taskscheduler")}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.color = "#2C5F6F";
                      e.currentTarget.style.border = "2px solid #2C5F6F";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#2C5F6F";
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.border = "2px solid #2C5F6F";
                    }}
                  >
                    Schedule Task
                  </button>
                </div>
              </div>
            </div>
          )}

          {openMenu && (
            <div style={styles.contentCard}>
              <h2 style={styles.contentTitle}>
                {menuContent[openMenu].label} Options
              </h2>
              <div style={styles.gridContainer}>
                {menuContent[openMenu].items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(item.path)}
                    style={styles.gridItem}
                    onMouseEnter={(e) => {
                      setHoveredItem(item);
                      e.currentTarget.style.backgroundColor = "#A9D2FF";
                      e.currentTarget.style.transform =
                        "translateY(-4px) scale(1.02)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 20px rgba(0, 54, 74, 0.15)";
                      e.currentTarget.style.borderColor = "#00364A";
                    }}
                    onMouseLeave={(e) => {
                      setHoveredItem(null);
                      e.currentTarget.style.backgroundColor = "#E0EFFF";
                      e.currentTarget.style.transform =
                        "translateY(0) scale(1)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(0, 54, 74, 0.05)";
                      e.currentTarget.style.borderColor =
                        "rgba(0, 54, 74, 0.15)";
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Description Section */}
              <div style={styles.descriptionSection}>
                <div style={styles.descriptionTitle}>Description</div>
                {hoveredItem ? (
                  <div style={styles.descriptionText}>
                    {hoveredItem.description}
                  </div>
                ) : (
                  <div style={styles.descriptionPlaceholder}>
                    Hover over an option to see its description
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default NavigationPage;