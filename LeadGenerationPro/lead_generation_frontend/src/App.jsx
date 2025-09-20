import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WebScraperForm from './WebScraperForm'
import EntityForm from "./EntityForm"
import EntityMappingFrom from './EntityMappingForm'
import EntityList from './EntityList'
import TaskScheduler from './TaskSchedular'
import NavigationPage from './NavigationPage'
import TasksManagement from './TasksManagement';
function App() {

  return (
   <BrowserRouter> 
      {/* <NavigationPage /> */}
      <Routes>
        <Route path="/" element={<NavigationPage />} />
        <Route path="/entityform" element={<EntityForm />} />
        <Route path="/entitylist" element={<EntityList />} />
        <Route path="/entitymappingform" element={<EntityMappingFrom />} />
        <Route path="/taskscheduler" element={<TaskScheduler />} />
        <Route path="/tasksmanagement" element={<TasksManagement />} />
        <Route path="/webscraperform" element={<WebScraperForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
