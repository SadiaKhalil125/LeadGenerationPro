import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Menu } from "lucide-react";

const NavigationPage = () => {
  const [openMenu, setOpenMenu] = useState(null); // which main menu is selected
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  // Define submenu options for each section
  const menuContent = {
    entity: [
      { label: "Entity List", path: "/entitylist" },
      { label: "Create Entity", path: "/entityform" },
      { label: "Entity Data Table", path: "/entity-data" },
    ],
    mapping: [
      { label: "Create Entity Mapping", path: "/entitymappingform" },
      { label: "Entity Mapping List", path: "/mappingmanager" },
    ],
    task: [
      { label: "Schedule a Task", path: "/taskscheduler" },
      { label: "Task List", path: "/tasksmanagement" },
      { label: "Task Executor", path: "/taskexecutor" },
    ],
    manager: [{ label: "Source Manager", path: "/sourcemanagement" }],
  };

  return (
    <div className="min-h-screen flex bg-teal-100 overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="fixed top-0 left-0 h-full w-72 bg-teal-900 shadow-xl z-40 p-4 overflow-y-auto transition-all duration-300">
          <h2 className="text-2xl font-bold text-center text-teal-400 mb-6">
            Menu
          </h2>

          {/* Sidebar Main Buttons */}
          {["entity", "mapping", "task", "manager"].map((menu) => (
            <div key={menu} className="mb-4">
              <button
                onClick={() => toggleMenu(menu)}
                className={`w-full flex justify-between items-center px-4 py-3 rounded-lg text-lg font-semibold
                  ${
                    menu === "entity"
                      ? "bg-blue-200 hover:bg-blue-300"
                      : menu === "mapping"
                      ? "bg-green-200 hover:bg-green-300"
                      : menu === "task"
                      ? "bg-purple-200 hover:bg-purple-300"
                      : "bg-yellow-200 hover:bg-yellow-300"
                  }`}
              >
                {menu.charAt(0).toUpperCase() + menu.slice(1)}
                {openMenu === menu ? <ChevronDown /> : <ChevronRight />}
              </button>
            </div>
          ))}
        </aside>
      )}

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? "ml-72" : "ml-0"
        }`}
      >
        {/* Header */}
        <header className="w-full bg-gradient-to-r from-teal-900 to-teal-900 text-teal-400 py-5 flex items-center px-6 shadow-lg">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-4">
            <Menu size={32} />
          </button>
          <h1 className="text-3xl font-bold">Navigation</h1>
        </header>

        {/* Content Area */}
        <div className="p-10">
          {!openMenu && (
            <>
              <h2 className="text-2xl font-semibold mb-4">Main Content</h2>
              <p className="text-gray-600">
                Click a menu item from the sidebar. Sub-options will appear here
                on the right side.
              </p>
            </>
          )}

          {openMenu && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                {openMenu.charAt(0).toUpperCase() + openMenu.slice(1)} Options
              </h2>
              <div className="flex flex-col gap-3">
                {menuContent[openMenu].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(item.path)}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-left font-medium"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationPage;
