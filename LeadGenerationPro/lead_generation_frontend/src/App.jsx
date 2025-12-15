import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./AuthContext";
import { useContext } from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WebScraperForm from './WebScraperForm'
import EntityForm from "./EntityForm"
import EntityMappingForm from './EntityMappingForm'
import MappingManager from './MappingManager'
import EntityList from './EntityList'
import TaskScheduler from './TaskScheduler'
import NavigationPage from './NavigationPage'
import TasksManagement from './TasksManagement'
import TaskExecutor from './TaskExecutor'
import TaskLogs from './TaskLogs'
import SourceManagement from './SourceManager';
import EntityDataPage from './EntityDataPage';
import SourceCreator from './SourceCreator';
import Homepage from './Homepage'
import Login from './Login'
import Chatbot from './Chatbot'
import QuickExtract from './QuickExtract'
import LeadGeneratorPage from './UserLeadsDashboard';
import LeadSyncTest from '../LeadsSyncPage';

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Create a QueryClient with optimized defaults for caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Cache persists for 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: false, // Don't refetch when component remounts (uses cache)
      retry: 1, // Only retry once on failure
      placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
    },
  },
});

function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router> 
          {/* <NavigationPage /> */}
          <Routes>
        <Route path="/dashboard" element={<NavigationPage />} />
        <Route path="/entityform" element={<EntityForm />} />
        <Route path="/entitylist" element={<EntityList />} />
        <Route path="/entitymappingform" element={<EntityMappingForm />} />
        <Route path="/mappingmanager" element={<MappingManager />} />
        <Route path="/taskscheduler" element={<TaskScheduler />} />
        <Route path="/tasksmanagement" element={<TasksManagement />} />
        <Route path="/taskexecutor" element={<TaskExecutor />} />
        <Route path="/task-logs/:taskId" element={<TaskLogs />} />
        <Route path="/webscraperform" element={<WebScraperForm />} />
        <Route path="/sourcemanagement" element={<SourceManagement />} />
        <Route path="/entity-data" element={<EntityDataPage />} />
        <Route path="/addsource" element={<SourceCreator />} />
        <Route path="/login" element={<Login/>} />
        <Route path="/" element={<Homepage/>}/>
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/quick-extract" element={<QuickExtract />} />
        <Route path="/userleadsdashboard" element={<LeadGeneratorPage />} />
        <Route path="/leadssync" element= {<LeadSyncTest />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
