import React from 'react';
import { useNavigate } from 'react-router-dom';

const NavigationPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-8">Navigation</h1>
      
      <div className="grid gap-4">
        <button
          onClick={() => navigate('/entitylist')}
          className="px-6 py-3 rounded-xl text-white bg-gradient-to-b from-blue-600 to-blue-400 hover:bg-blue-700 shadow-md"
        >
          Entity List
        </button>

        
        <button
          onClick={() => navigate('/entityform')}
          className="text-white px-6 py-3 rounded-xl bg-gradient-to-b from-blue-600 to-blue-400 hover:bg-blue-700 shadow-md"
        >
          Create Entity
        </button>
        <button
          onClick={() => navigate('/entity-data')}
          className="text-white px-6 py-3 rounded-xl bg-gradient-to-b from-blue-600 to-blue-400 hover:bg-blue-700 shadow-md"
        >
            Entity Data Table
        </button>

        <button
          onClick={() => navigate('/entitymappingform')}
          className="px-6 py-3 rounded-xl text-white bg-gradient-to-b from-green-600 to-green-400 hover:bg-green-700 shadow-md"
        >
          Create Entity Mapping
        </button>
        <button
          onClick={() => navigate('/mappingmanager')}
          className="px-6 py-3 rounded-xl text-white bg-gradient-to-b from-green-600 to-green-400 hover:bg-green-700 shadow-md"
        >
          Entity Mapping List
        </button>

        <button
          onClick={() => navigate('/taskscheduler')}
          className="px-6 py-3 rounded-xl text-white bg-gradient-to-b from-purple-600 to-purple-400 hover:bg-purple-700 shadow-md"
        >
          Schedule a Task
        </button>
        <button
          onClick={() => navigate('/tasksmanagement')}
          className="px-6 py-3 rounded-xl text-white bg-gradient-to-b from-purple-600 to-purple-400 hover:bg-purple-700 shadow-md"
        >
            Task List
        </button>
        <button
          onClick={() => navigate('/taskexecutor')}
          className="px-6 py-3 rounded-xl text-white bg-gradient-to-b from-purple-600 to-purple-400 hover:bg-purple-700 shadow-md"
        >
            Task Executor
        </button>
        <button
          onClick={() => navigate('/sourcemanagement')}
          className="px-6 py-3 rounded-xl text-white bg-gradient-to-b from-yellow-600 to-yellow-400 hover:bg-purple-700 shadow-md"
        >
            Source Manager
        </button>
        

      </div>
    </div>
  );
}

export default NavigationPage;