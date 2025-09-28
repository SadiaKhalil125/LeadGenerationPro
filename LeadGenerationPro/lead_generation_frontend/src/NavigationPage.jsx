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
} from "lucide-react";

const NavigationPage = () => {
  const [openMenu, setOpenMenu] = useState("entity");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const menuContent = {
    entity: {
      label: "Entity",
      icon: <LayoutGrid size={20} />,
      items: [
        { label: "Entity List", path: "/entitylist" },
        { label: "Create Entity", path: "/entityform" },
        { label: "Entity Data Table", path: "/entity-data" },
      ],
    },
    mapping: {
      label: "Mapping",
      icon: <ClipboardPlus size={20} />,
      items: [
        { label: "Create Entity Mapping", path: "/entitymappingform" },
        { label: "Entity Mapping List", path: "/mappingmanager" },
      ],
    },
    task: {
      label: "Task",
      icon: <CalendarCheck size={20} />,
      items: [
        { label: "Schedule a Task", path: "/taskscheduler" },
        { label: "Task List", path: "/tasksmanagement" },
        { label: "Task Executor", path: "/taskexecutor" },
      ],
    },
    manager: {
      label: "Source",
      icon: <Settings size={20} />,
      items: [{ label: "Source Manager", path: "/sourcemanagement" }],
    },
  };

  return (
    <div className="min-h-screen flex bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-teal-600 text-white shadow-2xl z-40 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-72" : "w-20"
        }`}
      >
        <div className="p-4 h-full flex flex-col">
          <h2
            className={`text-2xl font-bold text-center text-white-400 mb-8 transition-opacity duration-300 ${
              sidebarOpen ? "opacity-100" : "opacity-0"
            }`}
          >
            Dashboard
          </h2>

          {Object.entries(menuContent).map(([key, { label, icon }]) => (
            <div key={key} className="mb-2">
              <button
                onClick={() => toggleMenu(key)}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-lg font-semibold transition-colors duration-200 ${
                  openMenu === key
                    ? "bg-teal-600 text-gray-600"
                    : "hover:bg-gray-800 text-gray-600"
                } ${!sidebarOpen && "justify-center"}`}
              >
                {icon}
                {sidebarOpen && <span className="ml-4 text-gray-600 flex-1 text-left">{label}</span>}
                {sidebarOpen && (openMenu === key ? <ChevronDown /> : <ChevronRight />)}
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "ml-72" : "ml-20"
        }`}
      >
        {/* Header */}
        <header className="w-full bg-teal-600 text-white py-4 px-6 shadow-md flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-4 p-2 text-gray-600 rounded-full hover:bg-gray-200 transition-colors duration-200"
            >
              <Menu size={28} />
            </button>
            <h1 className="text-2xl font-bold text-white">Navigation</h1>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-8">
          {!openMenu && (
            <div className="text-center p-10 bg-white rounded-lg shadow-md">
              <h2 className="text-3xl font-semibold mb-3 text-gray-700">
                Welcome to Your Dashboard
              </h2>
              <p className="text-gray-500">
                Select a category from the sidebar to view available options.
              </p>
            </div>
          )}

          {openMenu && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-6 border-b pb-3 text-teal-700">
                {menuContent[openMenu].label} Options
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuContent[openMenu].items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(item.path)}
                    className="px-6 py-4 bg-gray-50 hover:bg-teal-100 border border-gray-200 rounded-lg text-left font-medium text-gray-700 hover:text-teal-800 transition-all duration-200 transform hover:scale-105 shadow-sm"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default NavigationPage;