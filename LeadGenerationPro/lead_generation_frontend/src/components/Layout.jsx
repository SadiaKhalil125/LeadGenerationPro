// Layout.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, ChevronDown, ChevronRight, LayoutGrid, ClipboardPlus, CalendarCheck, Settings } from "lucide-react";

const Layout = ({ children, pageTitle }) => {
  const [openMenu, setOpenMenu] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

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
            <h1 style={sidebarStyles.headerTitle}>{pageTitle}</h1>
          </div>
        </header>

        {/* Content Area */}
        <main style={sidebarStyles.main}>
          {children}
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

export default Layout;