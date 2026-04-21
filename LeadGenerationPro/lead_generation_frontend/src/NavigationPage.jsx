// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   ChevronDown,
//   ChevronRight,
//   Menu,
//   LayoutGrid,
//   ClipboardPlus,
//   CalendarCheck,
//   Settings,
// }
//   from "lucide-react";

// const NavigationPage = () => {
//   const [openMenu, setOpenMenu] = useState(null);
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [hoveredItem, setHoveredItem] = useState(null);
//   const navigate = useNavigate();


//   const menuContent = {
//     entity: {
//       label: "Entities",
//       icon: <LayoutGrid size={20} />,
//       mainPath: "/entitylist",
//       items: [
//         { label: "Entity List", path: "/entitylist", description: "View and manage all entities in the system" },
//         { label: "Create Entity", path: "/entityform", description: "Add a new entity to the database" },
//         { label: "Entity Data Table", path: "/entity-data", description: "Browse entity data in table format" },
//       ],
//     },
//     manager: {
//       label: "Sources",
//       icon: <Settings size={20} />,
//       mainPath: "/sourcemanagement",
//       items: [
//         { label: "Source Manager", path: "/sourcemanagement", description: "Manage web scraping data sources" },
//         { label: "Add Source", path: "/addsource", description: "Configure a new web scraping source" },
//       ],
//     },
//     mapping: {
//       label: "Mappings",
//       icon: <ClipboardPlus size={20} />,
//       mainPath: "/mappingmanager",
//       items: [
//         { label: "Entity Mapping List", path: "/mappingmanager", description: "View all existing entity mappings" },
//         { label: "Create Entity Mapping", path: "/entitymappingform", description: "Define relationships between entities" },

//       ],
//     },
//     task: {
//       label: "Tasks",
//       icon: <CalendarCheck size={20} />,
//       mainPath: "/tasksmanagement",
//       items: [
//         { label: "Schedule a Task", path: "/taskscheduler", description: "Create and schedule new automated tasks" },
//         { label: "Task List", path: "/tasksmanagement", description: "View and manage all scheduled tasks" },
//         { label: "Task Executor", path: "/taskexecutor", description: "Execute web scraping tasks" },
//       ],
//     },
//   };

//   const styles = {
//     container: {
//       minHeight: "100vh",
//       display: "flex",
//       // backgroundColor: '#00364A',
//       backgroundColor: "#F1F6FB", // Fallback color
//       color: "#00364A",
//       fontFamily: "'Inter', sans-serif",
//     },
//     sidebar: {
//       position: "fixed",
//       top: 0,
//       left: 0,
//       height: "100%",
//       backgroundColor: "#2C5F6F",
//       color: "white",
//       boxShadow: "rgb(0 0 0 / 15%) 10px 0px 20px",
//       zIndex: 40,
//       transition: "all 0.3s ease-in-out",
//       width: sidebarOpen ? "280px" : "80px",
//       overflow: "hidden",
//     },
//     sidebarInner: {
//       padding: "24px 16px",
//       height: "100%",
//       display: "flex",
//       flexDirection: "column",
//     },
//     sidebarHeader: {
//       fontSize: "36px",
//       fontWeight: "900",
//       textAlign: "center",
//       marginBottom: "40px",
//       opacity: sidebarOpen ? 1 : 0,
//       transition: "opacity 0.3s ease",
//       letterSpacing: "4px",
//       fontFamily: "'Montserrat', 'Arial Black', sans-serif",
//       textTransform: "uppercase",
//       // background: "linear-gradient(135deg, #ffffff 0%, #a9d2ff 100%)",
//       background: '#00364A',
//       WebkitBackgroundClip: "text",
//       WebkitTextFillColor: "white",
//       backgroundClip: "text",
//       cursor: "pointer",
//     },
//     menuButton: (isActive) => ({
//       width: "100%",
//       display: "flex",
//       alignItems: "center",
//       padding: "14px 16px",
//       borderRadius: "12px",
//       fontSize: "16px",
//       fontWeight: "600",
//       border: "none",
//       cursor: "pointer",
//       transition: "all 0.2s ease",
//       backgroundColor: isActive ? "rgba(255, 255, 255, 0.15)" : "transparent",
//       color: "white",
//       marginBottom: "8px",
//       justifyContent: sidebarOpen ? "flex-start" : "center",
//     }),
//     menuButtonHover: {
//       backgroundColor: "rgba(255, 255, 255, 0.1)",
//     },
//     menuLabel: {
//       marginLeft: "16px",
//       flex: 1,
//       textAlign: "left",
//       display: sidebarOpen ? "block" : "none",
//     },
//     // Remove submenuContainer and submenuItem styles since we're not using them
//     mainContent: {
//       flex: 1,
//       transition: "all 0.3s ease-in-out",
//       marginLeft: sidebarOpen ? "280px" : "80px",
//       // Fix for background color issue:
//       minHeight: "100vh",
//       backgroundColor: "#C7D8ED",
//       display: "flex",
//       flexDirection: "column",
//     },
//     header: {
//       width: "100%",
//       background: "#00364A",
//       color: "white",
//       padding: "20px 32px",
//       boxShadow: "0 4px 12px rgba(0, 54, 74, 0.1)",
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "space-between",
//     },
//     headerLeft: {
//       display: "flex",
//       alignItems: "center",
//       gap: "16px",
//     },
//     menuToggle: {
//       padding: "10px",
//       // backgroundColor: "rgba(255, 255, 255, 0.15)",
//       backgroundColor:'#00364A',
//       border: "none",
//       borderRadius: "10px",
//       cursor: "pointer",
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "center",
//       color: "white",
//       transition: "all 0.2s ease-in-out",
//     },
//     headerTitle: {
//       fontSize: "28px",
//       fontWeight: "700",
//       color: "white",
//       letterSpacing: "0.5px",
//     },
//     main: {
//       padding: "40px",
//       // Fix for background color issue:
//       flex: 1,
//       width: "100%",
//     },

//     contentCard: {
//       backgroundColor: "white",
//       padding: "32px",
//       borderRadius: "20px",
//       boxShadow: "0 8px 24px rgba(0, 54, 74, 0.08)",
//       border: "1px solid rgba(0, 54, 74, 0.1)",
//     },
//     contentTitle: {
//       fontSize: "24px",
//       fontWeight: "700",
//       marginBottom: "24px",
//       paddingBottom: "16px",
//       borderBottom: "2px solid rgba(0, 54, 74, 0.1)",
//       color: "#00364A",
//     },
//     descriptionSection: {
//       marginTop: "32px",
//       padding: "24px",
//       backgroundColor: "#FFFFF",
//       borderRadius: "16px",
//       border: "2px solid rgba(0, 54, 74, 0.1)",
//       minHeight: "100px",
//       display: "flex",
//       flexDirection: "column",
//       gap: "8px",
//     },
//     descriptionTitle: {
//       fontSize: "16px",
//       fontWeight: "700",
//       color: "#00364A",
//       marginBottom: "8px",
//     },
//     descriptionText: {
//       fontSize: "14px",
//       fontWeight: "400",
//       color: "#00364A",
//       lineHeight: "1.6",
//     },
//     descriptionPlaceholder: {
//       fontSize: "1400px",
//       fontWeight: "400",
//       color: "#00364A",
//       opacity: 0.5,
//       fontStyle: "italic",
//     },
//     gridContainer: {
//       display: "grid",
//       gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
//       gap: "20px",
//     },
//     gridItem: {
//       padding: "24px",
//       backgroundColor: "#E0EFFF",
//       border: "2px solid rgba(0, 54, 74, 0.15)",
//       borderRadius: "16px",
//       textAlign: "left",
//       fontWeight: "600",
//       fontSize: "15px",
//       color: "#00364A",
//       cursor: "pointer",
//       transition: "all 0.3s ease",
//       boxShadow: "0 4px 12px rgba(0, 54, 74, 0.05)",
//       position: "relative",
//       overflow: "hidden",
//     },
//     quickAccessTitle: {
//       fontSize: "42px",
//       fontWeight: "700",
//       marginBottom: "48px",
//       color: "#00364A",
//       letterSpacing: "0.3px",
//       textAlign: "center",
//     },
//     quickAccessGrid: {
//       display: "grid",
//       gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
//       gap: "24px",
//       maxWidth: "1200px",
//       margin: "0 auto",
//     },
//     quickAccessCard: {
//       padding: "24px",
//       backgroundColor: "white",
//       borderRadius: "16px",
//       boxShadow: "0 4px 20px rgba(0, 54, 74, 0.08)",
//       border: "2px solid #E0E0E0",
//       transition: "all 0.3s ease",
//       textAlign: "left",
//       display: "flex",
//       flexDirection: "column",
//       gap: "12px",
//       position: "relative",
//     },
//     quickAccessIconSmall: {
//       width: "48px",
//       height: "48px",
//       backgroundColor: "#5A7A8C",
//       borderRadius: "12px",
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "center",
//       color: "white",
//       position: "absolute",
//       top: "24px",
//       right: "24px",
//     },
//     stepLabel: {
//       fontSize: "24px",
//       fontWeight: "700",
//       color: "#1A1A1A",
//       margin: "0",
//       marginBottom: "8px",
//     },
//     quickAccessCardTitle: {
//       fontSize: "16px",
//       fontWeight: "600",
//       color: "#1A1A1A",
//       margin: "0",
//       marginBottom: "4px",
//     },
//     quickAccessCardText: {
//       fontSize: "13px",
//       fontWeight: "400",
//       color: "#6B7280",
//       margin: "0",
//       lineHeight: "1.5",
//       marginBottom: "8px",
//     },
//     actionButton: (color) => ({
//       padding: "12px 24px",
//       backgroundColor: color,
//       color: "white",
//       border: "2px solid " + color,
//       borderRadius: "8px",
//       fontSize: "14px",
//       fontWeight: "600",
//       cursor: "pointer",
//       transition: "all 0.3s ease",
//       marginTop: "auto",
//       alignSelf: "flex-start",
//     }),
//   };

//   return (
//     <div style={styles.container}>
//       {/* Sidebar */}
//       <aside style={styles.sidebar}>
//         <div style={styles.sidebarInner}>
//           <h2
//             style={styles.sidebarHeader}
//             onClick={() => navigate('/dashboard')}
//             title="Go to Dashboard"
//           >
//             SCOUT
//           </h2>

//           {Object.entries(menuContent).map(([key, { label, icon, mainPath }]) => (
//             <div key={key}>
//               <button
//                 onClick={() => {
//                   // Remove toggleMenu - just navigate directly
//                   if (mainPath) navigate(mainPath);
//                 }}
//                 style={styles.menuButton(false)} // Set isActive to false since we're not using openMenu anymore
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.backgroundColor =
//                     styles.menuButtonHover.backgroundColor;
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.backgroundColor = "transparent";
//                 }}
//               >
//                 {icon}
//                 {sidebarOpen && <span style={styles.menuLabel}>{label}</span>}
//                 {/* Remove the chevron icons since we don't have submenus anymore */}
//               </button>

//               {/* Remove the submenu container entirely */}
//             </div>
//           ))}
//         </div>
//       </aside>

//       {/* Main Content */}
//       <div style={styles.mainContent}>
//         {/* Header */}
//         <header style={styles.header}>
//           <div style={styles.headerLeft}>
//             <button
//               onClick={() => {
//                 setSidebarOpen(!sidebarOpen);
//               }}
//               style={styles.menuToggle}
//               onMouseEnter={(e) => {
//                 e.currentTarget.style.backgroundColor =
//                   "rgba(255, 255, 255, 0.25)";
//               }}
//               onMouseLeave={(e) => {
//                 e.currentTarget.style.backgroundColor =
//                   "rgba(255, 255, 255, 0.15)";
//               }}
//             >
//               <Menu size={24} />
//             </button>
//             <h1 style={styles.headerTitle}>Navigation Dashboard</h1>
//           </div>
//         </header>

//         {/* Content Area */}
//         <main style={styles.main}>
//           {/* Always show Quick Access - remove the conditional rendering based on openMenu */}
//           <div>
//             <h2 style={styles.quickAccessTitle}>Quick Access</h2>
//             <div style={styles.quickAccessGrid}>
//               <div
//                 style={styles.quickAccessCard}
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.boxShadow = "0 8px 32px rgba(90, 122, 140, 0.25)";
//                   e.currentTarget.style.borderColor = "#5A7A8C";
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 54, 74, 0.08)";
//                   e.currentTarget.style.borderColor = "#E0E0E0";
//                 }}
//               >
//                 <div style={styles.quickAccessIconSmall}>
//                   <LayoutGrid size={24} strokeWidth={2} />
//                 </div>
//                 <h2 style={styles.stepLabel}>Step 1</h2>
//                 <h3 style={styles.quickAccessCardTitle}>Create an Entity</h3>
//                 <p style={styles.quickAccessCardText}>
//                   Add a new custom entity to the database
//                 </p>
//                 <button
//                   style={styles.actionButton("#2C5F6F")}
//                   onClick={() => navigate("/entityform")}
//                   onMouseEnter={(e) => {
//                     e.currentTarget.style.backgroundColor = "white";
//                     e.currentTarget.style.color = "#2C5F6F";
//                     e.currentTarget.style.border = "2px solid #2C5F6F";
//                   }}
//                   onMouseLeave={(e) => {
//                     e.currentTarget.style.backgroundColor = "#2C5F6F";
//                     e.currentTarget.style.color = "white";
//                     e.currentTarget.style.border = "2px solid #2C5F6F";
//                   }}
//                 >
//                   Create Entity
//                 </button>
//               </div>

//               <div
//                 style={styles.quickAccessCard}
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.boxShadow = "0 8px 32px rgba(90, 122, 140, 0.25)";
//                   e.currentTarget.style.borderColor = "#5A7A8C";
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 54, 74, 0.08)";
//                   e.currentTarget.style.borderColor = "#E0E0E0";
//                 }}
//               >
//                 <div style={styles.quickAccessIconSmall}>
//                   <Settings size={24} strokeWidth={2} />
//                 </div>
//                 <h2 style={styles.stepLabel}>Step 2</h2>
//                 <h3 style={styles.quickAccessCardTitle}>Add New Source</h3>
//                 <p style={styles.quickAccessCardText}>
//                   Register and manage Web-based or API-based data sources to scrape
//                 </p>
//                 <button
//                   style={styles.actionButton("#2C5F6F")}
//                   onClick={() => navigate("/addsource")}
//                   onMouseEnter={(e) => {
//                     e.currentTarget.style.backgroundColor = "white";
//                     e.currentTarget.style.color = "#2C5F6F";
//                     e.currentTarget.style.border = "2px solid #2C5F6F";
//                   }}
//                   onMouseLeave={(e) => {
//                     e.currentTarget.style.backgroundColor = "#2C5F6F";
//                     e.currentTarget.style.color = "white";
//                     e.currentTarget.style.border = "2px solid #2C5F6F";
//                   }}
//                 >
//                   Add Source
//                 </button>
//               </div>

//               <div
//                 style={styles.quickAccessCard}
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.boxShadow = "0 8px 32px rgba(90, 122, 140, 0.25)";
//                   e.currentTarget.style.borderColor = "#5A7A8C";
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 54, 74, 0.08)";
//                   e.currentTarget.style.borderColor = "#E0E0E0";
//                 }}
//               >
//                 <div style={styles.quickAccessIconSmall}>
//                   <ClipboardPlus size={24} strokeWidth={2} />
//                 </div>
//                 <h2 style={styles.stepLabel}>Step 3</h2>
//                 <h3 style={styles.quickAccessCardTitle}>Entity Mapping</h3>
//                 <p style={styles.quickAccessCardText}>
//                   Define relationships between a source and entities with Live Website Preview
//                 </p>
//                 <button
//                   style={styles.actionButton("#2C5F6F")}
//                   onClick={() => navigate("/entitymappingform")}
//                   onMouseEnter={(e) => {
//                     e.currentTarget.style.backgroundColor = "white";
//                     e.currentTarget.style.color = "#2C5F6F";
//                     e.currentTarget.style.border = "2px solid #2C5F6F";
//                   }}
//                   onMouseLeave={(e) => {
//                     e.currentTarget.style.backgroundColor = "#2C5F6F";
//                     e.currentTarget.style.color = "white";
//                     e.currentTarget.style.border = "2px solid #2C5F6F";
//                   }}
//                 >
//                   Define Mapping
//                 </button>
//               </div>

//               <div
//                 style={styles.quickAccessCard}
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.boxShadow = "0 8px 32px rgba(90, 122, 140, 0.25)";
//                   e.currentTarget.style.borderColor = "#5A7A8C";
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 54, 74, 0.08)";
//                   e.currentTarget.style.borderColor = "#E0E0E0";
//                 }}
//               >
//                 <div style={styles.quickAccessIconSmall}>
//                   <CalendarCheck size={24} strokeWidth={2} />
//                 </div>
//                 <h2 style={styles.stepLabel}>Step 4</h2>
//                 <h3 style={styles.quickAccessCardTitle}>Schedule a Task</h3>
//                 <p style={styles.quickAccessCardText}>
//                   Create and schedule new scraping tasks
//                 </p>
//                 <button
//                   style={styles.actionButton("#2C5F6F")}
//                   onClick={() => navigate("/taskscheduler")}
//                   onMouseEnter={(e) => {
//                     e.currentTarget.style.backgroundColor = "white";
//                     e.currentTarget.style.color = "#2C5F6F";
//                     e.currentTarget.style.border = "2px solid #2C5F6F";
//                   }}
//                   onMouseLeave={(e) => {
//                     e.currentTarget.style.backgroundColor = "#2C5F6F";
//                     e.currentTarget.style.color = "white";
//                     e.currentTarget.style.border = "2px solid #2C5F6F";
//                   }}
//                 >
//                   Schedule Task
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* Remove the conditional rendering for openMenu content - it's no longer needed */}
//         </main>
//       </div>
//     </div>
//   );
// };

// export default NavigationPage;

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
            onClick={() => navigate("/dashboard")}
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