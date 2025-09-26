
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";

const NavigationPage = () => {
  const [openMenu, setOpenMenu] = useState(null);
  const navigate = useNavigate();

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="w-full bg-gradient-to-r from-teal-600 to-teal-400 text-white py-5 text-center text-4xl font-extrabold shadow-lg">
        Navigation
      </header>

      {/* Menu Section */}
      <div className="flex flex-col w-full max-w-3xl mx-auto mt-10 space-y-6">

        {/* Entity */}
        <div>
          <button
            onClick={() => toggleMenu("entity")}
            className="w-full flex justify-between items-center px-6 py-5 rounded-lg border border-blue-300 text-slate-700 text-lg font-semibold bg-gradient-to-r from-blue-200 to-sky-300 hover:from-blue-300 hover:to-sky-200 hover:border-blue-400 shadow-md transition duration-300"
          >
            Entity
            {openMenu === "entity" ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
          </button>
          {openMenu === "entity" && (
            <div className="flex flex-col border border-blue-300 rounded-md mt-2">
              <button
                onClick={() => navigate("/entitylist")}
                className="w-full px-6 py-3 text-left border-b border-blue-200 text-gray-700 hover:bg-blue-100 hover:border-blue-400 hover:text-blue-800 transition duration-300"
              >
                Entity List
              </button>
              <button
                onClick={() => navigate("/entityform")}
                className="w-full px-6 py-3 text-left border-b border-blue-200 text-gray-700 hover:bg-blue-100 hover:border-blue-400 hover:text-blue-800 transition duration-300"
              >
                Create Entity
              </button>
              <button
                onClick={() => navigate("/entity-data")}
                className="w-full px-6 py-3 text-left text-gray-700 hover:bg-blue-100 hover:border-blue-400 hover:text-blue-800 transition duration-300"
              >
                Entity Data Table
              </button>
            </div>
          )}
        </div>

        {/* Mapping */}
        <div>
          <button
            onClick={() => toggleMenu("mapping")}
            className="w-full flex justify-between items-center px-6 py-5 rounded-lg border border-green-300 text-slate-700 text-lg font-semibold bg-gradient-to-r from-green-200 to-emerald-300 hover:from-green-300 hover:to-emerald-200 hover:border-green-400 shadow-md transition duration-300"
          >
            Mapping
            {openMenu === "mapping" ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
          </button>
          {openMenu === "mapping" && (
            <div className="flex flex-col border border-green-300 rounded-md mt-2">
              <button
                onClick={() => navigate("/entitymappingform")}
                className="w-full px-6 py-3 text-left border-b border-green-200 text-gray-700 hover:bg-green-100 hover:border-green-400 hover:text-green-800 transition duration-300"
              >
                Create Entity Mapping
              </button>
              <button
                onClick={() => navigate("/mappingmanager")}
                className="w-full px-6 py-3 text-left text-gray-700 hover:bg-green-100 hover:border-green-400 hover:text-green-800 transition duration-300"
              >
                Entity Mapping List
              </button>
            </div>
          )}
        </div>

        {/* Task */}
        <div>
          <button
            onClick={() => toggleMenu("task")}
            className="w-full flex justify-between items-center px-6 py-5 rounded-lg border border-purple-300 text-slate-700 text-lg font-semibold bg-gradient-to-r from-purple-200 to-purple-300 hover:from-purple-300 hover:to-pink-200 hover:border-purple-400 shadow-md transition duration-300"
          >
            Task
            {openMenu === "task" ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
          </button>
          {openMenu === "task" && (
            <div className="flex flex-col border border-purple-300 rounded-md mt-2">
              <button
                onClick={() => navigate("/taskscheduler")}
                className="w-full px-6 py-3 text-left border-b border-purple-200 text-gray-700 hover:bg-purple-100 hover:border-purple-400 hover:text-purple-800 transition duration-300"
              >
                Schedule a Task
              </button>
              <button
                onClick={() => navigate("/tasksmanagement")}
                className="w-full px-6 py-3 text-left border-b border-purple-200 text-gray-700 hover:bg-purple-100 hover:border-purple-400 hover:text-purple-800 transition duration-300"
              >
                Task List
              </button>
              <button
                onClick={() => navigate("/taskexecutor")}
                className="w-full px-6 py-3 text-left text-gray-700 hover:bg-purple-100 hover:border-purple-400 hover:text-purple-800 transition duration-300"
              >
                Task Executor
              </button>
            </div>
          )}
        </div>

        {/* Manager */}
        <div>
          <button
            onClick={() => toggleMenu("manager")}
            className="w-full flex justify-between items-center px-6 py-5 rounded-lg border border-yellow-300 text-slate-700 text-lg font-semibold bg-gradient-to-r from-yellow-200 to-yellow-300 hover:from-yellow-300 hover:to-yellow-200 hover:border-yellow-400 shadow-md transition duration-300"
          >
            Manager
            {openMenu === "manager" ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
          </button>
          {openMenu === "manager" && (
            <div className="flex flex-col border border-yellow-300 rounded-md mt-2">
              <button
                onClick={() => navigate("/sourcemanagement")}
                className="w-full px-6 py-3 text-left text-gray-700 hover:bg-yellow-100 hover:border-yellow-400 hover:text-yellow-800 transition duration-300"
              >
                Source Manager
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationPage;
