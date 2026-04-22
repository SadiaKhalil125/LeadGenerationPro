import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  LayoutGrid,
  ClipboardPlus,
  CalendarCheck,
  Settings,
} from "lucide-react";

const NavigationPage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const menuContent = {
    entity: {
      label: "Entities",
      icon: <LayoutGrid size={20} />,
      mainPath: "/entitylist",
    },
    manager: {
      label: "Sources",
      icon: <Settings size={20} />,
      mainPath: "/sourcemanagement",
    },
    mapping: {
      label: "Mappings",
      icon: <ClipboardPlus size={20} />,
      mainPath: "/mappingmanager",
    },
    task: {
      label: "Tasks",
      icon: <CalendarCheck size={20} />,
      mainPath: "/tasksmanagement",
    },
  };

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      backgroundColor: "#C7D8ED",
      color: "#00364A",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },

    sidebar: {
      position: "fixed",
      top: 0,
      left: 0,
      height: "100%",
      width: sidebarOpen ? "280px" : "80px",
      backgroundColor: "#00364A",
      color: "white",
      boxShadow: "0 0 20px rgba(0,54,74,0.15)",
      transition: "all 0.3s ease-in-out",
      overflow: "hidden",
      zIndex: 40,
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
    },

    menuButton: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      padding: "14px 16px",
      borderRadius: "14px",
      fontSize: "15px",
      fontWeight: "600",
      border: "none",
      cursor: "pointer",
      transition: "0.3s",
      backgroundColor: "transparent",
      color: "white",
      marginBottom: "10px",
      justifyContent: sidebarOpen ? "flex-start" : "center",
    },

    menuLabel: {
      marginLeft: "16px",
      flex: 1,
      textAlign: "left",
      display: sidebarOpen ? "block" : "none",
    },

    mainContent: {
      flex: 1,
      marginLeft: sidebarOpen ? "280px" : "80px",
      minHeight: "100vh",
      backgroundColor: "#C7D8ED",
      transition: "0.3s",
      display: "flex",
      flexDirection: "column",
    },

    header: {
      width: "100%",
      backgroundColor: "#00364A",
      color: "white",
      padding: "20px 32px",
      boxShadow: "0 10px 30px rgba(0,54,74,0.12)",
      display: "flex",
      alignItems: "center",
    },

    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },

    menuToggle: {
      padding: "10px",
      backgroundColor: "rgba(73,163,196,0.18)",
      border: "none",
      borderRadius: "12px",
      cursor: "pointer",
      color: "white",
    },

    headerTitle: {
      fontSize: "28px",
      fontWeight: "700",
      color: "white",
    },

    main: {
      padding: "40px",
      flex: 1,
      width: "100%",
    },

    quickAccessTitle: {
      fontSize: "42px",
      fontWeight: "800",
      marginBottom: "48px",
      color: "#00364A",
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
      padding: "28px",
      paddingTop: "72px",
      backgroundColor: "white",
      borderRadius: "22px",
      boxShadow: "0 10px 30px rgba(0,54,74,0.08)",
      border: "1px solid rgba(73,163,196,0.18)",
      transition: "0.3s",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      position: "relative",
      minHeight: "280px",
      justifyContent: "flex-start",
      textAlign: "center",
    },

    quickAccessIconSmall: {
      width: "52px",
      height: "52px",
      backgroundColor: "#49A3C4",
      borderRadius: "14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      position: "absolute",
      top: "20px",
      right: "20px",
      boxShadow: "0 10px 20px rgba(73,163,196,0.25)",
    },

    stepLabel: {
      fontSize: "24px",
      fontWeight: "800",
      color: "#00364A",
      margin: "0",
      marginBottom: "4px",
      lineHeight: "1.2",
    },

    quickAccessCardTitle: {
      fontSize: "17px",
      fontWeight: "700",
      color: "#00364A",
      margin: "0",
      lineHeight: "1.4",
    },

    quickAccessCardText: {
      fontSize: "14px",
      color: "#64748B",
      lineHeight: "1.6",
      margin: "0",
      marginBottom: "14px",
      flexGrow: 1,
    },

    actionButton: {
      padding: "12px 24px",
      backgroundColor: "#00364A",
      color: "white",
      border: "2px solid #00364A",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: "700",
      cursor: "pointer",
      marginTop: "auto",
      alignSelf: "center",
      minWidth: "170px",
      boxShadow: "0 10px 25px rgba(0,54,74,0.14)",
    },
  };

  const cards = [
    {
      step: "Step 1",
      title: "Create an Entity",
      text: "Add a new custom entity to the database",
      icon: <LayoutGrid size={24} />,
      path: "/entityform",
      button: "Create Entity",
    },
    {
      step: "Step 2",
      title: "Add New Source",
      text: "Register and manage Web-based or API-based data sources.",
      icon: <Settings size={24} />,
      path: "/addsource",
      button: "Add Source",
    },
    {
      step: "Step 3",
      title: "Entity Mapping",
      text: "Define relationships between a source and entities.",
      icon: <ClipboardPlus size={24} />,
      path: "/entitymappingform",
      button: "Define Mapping",
    },
    {
      step: "Step 4",
      title: "Schedule a Task",
      text: "Create and schedule new scraping tasks.",
      icon: <CalendarCheck size={24} />,
      path: "/taskscheduler",
      button: "Schedule Task",
    },
  ];

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarInner}>
          <h2
            style={styles.sidebarHeader}
            onClick={() => navigate("/")}
            title="Go to Homepage"
          >
            SCOUT
          </h2>

          {Object.entries(menuContent).map(([key, item]) => (
            <button
              key={key}
              onClick={() => navigate(item.mainPath)}
              style={styles.menuButton}
            >
              {item.icon}
              {sidebarOpen && (
                <span style={styles.menuLabel}>{item.label}</span>
              )}
            </button>
          ))}
        </div>
      </aside>

      <div style={styles.mainContent}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={styles.menuToggle}
            >
              <Menu size={24} />
            </button>

            <h1 style={styles.headerTitle}>Navigation Dashboard</h1>
          </div>
        </header>

        <main style={styles.main}>
          <h2 style={styles.quickAccessTitle}>Quick Access</h2>

          <div style={styles.quickAccessGrid}>
            {cards.map((item, index) => (
              <div key={index} style={styles.quickAccessCard}>
                <div style={styles.quickAccessIconSmall}>
                  {item.icon}
                </div>

                <h2 style={styles.stepLabel}>{item.step}</h2>
                <h3 style={styles.quickAccessCardTitle}>
                  {item.title}
                </h3>
                <p style={styles.quickAccessCardText}>
                  {item.text}
                </p>

                <button
                  style={styles.actionButton}
                  onClick={() => navigate(item.path)}
                >
                  {item.button}
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default NavigationPage;