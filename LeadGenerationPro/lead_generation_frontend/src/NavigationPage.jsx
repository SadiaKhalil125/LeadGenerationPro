import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiGrid, FiPlusSquare, FiDatabase, FiLink, FiList, FiClock, FiPlayCircle, FiServer, FiArrowRight } from 'react-icons/fi';

// A reusable card component for grouping navigation items
const DashboardCard = ({ title, children }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

// A reusable button component for navigation links
const NavButton = ({ onClick, icon, children }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-4 py-3 text-gray-700 rounded-lg bg-gray-50 hover:bg-teal-50 hover:text-teal-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
  >
    <div className="flex items-center">
      {icon}
      <span className="ml-3 font-medium">{children}</span>
    </div>
    <FiArrowRight />
  </button>
);

const NavigationPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-gray-800">Navigation Dashboard</h1>
        <p className="mt-2 text-gray-600">Select a management task to begin.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Entity Management Card */}
        <DashboardCard title="Entity Management">
          <NavButton onClick={() => navigate('/entitylist')} icon={<FiList size={20} className="text-teal-600" />}>
            Entity List
          </NavButton>
          <NavButton onClick={() => navigate('/entityform')} icon={<FiPlusSquare size={20} className="text-teal-600" />}>
            Create Entity
          </NavButton>
          <NavButton onClick={() => navigate('/entity-data')} icon={<FiGrid size={20} className="text-teal-600" />}>
            Entity Data Table
          </NavButton>
        </DashboardCard>

        {/* Mapping Management Card */}
        <DashboardCard title="Mapping Management">
          <NavButton onClick={() => navigate('/entitymappingform')} icon={<FiPlusSquare size={20} className="text-teal-600" />}>
            Create Entity Mapping
          </NavButton>
          <NavButton onClick={() => navigate('/mappingmanager')} icon={<FiLink size={20} className="text-teal-600" />}>
            Entity Mapping List
          </NavButton>
        </DashboardCard>

        {/* Task Management Card */}
        <DashboardCard title="Task Management">
          <NavButton onClick={() => navigate('/taskscheduler')} icon={<FiClock size={20} className="text-teal-600" />}>
            Schedule a Task
          </NavButton>
          <NavButton onClick={() => navigate('/tasksmanagement')} icon={<FiList size={20} className="text-teal-600" />}>
            Task List
          </NavButton>
          <NavButton onClick={() => navigate('/taskexecutor')} icon={<FiPlayCircle size={20} className="text-teal-600" />}>
            Task Executor
          </NavButton>
        </DashboardCard>

        {/* Source Management Card */}
        <DashboardCard title="Source Management">
            <NavButton onClick={() => navigate('/sourcemanagement')} icon={<FiServer size={20} className="text-teal-600" />}>
                Source Manager
            </NavButton>
        </DashboardCard>
      </div>
    </div>
  );
};

export default NavigationPage;