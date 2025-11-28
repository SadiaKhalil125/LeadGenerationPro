import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WebScraperForm from './WebScraperForm'
import EntityForm from "./EntityForm"
import EntityMappingForm from './EntityMappingForm'
import MappingManager from './MappingManager'
import EntityList from './EntityList'
import TaskScheduler from './TaskScheduler'
import NavigationPage from './NavigationPage'
import TasksManagement from './TasksManagement'
import TaskExecutor from './TaskExecutor'
import SourceManagement from './SourceManager';
import EntityDataPage from './EntityDataPage';
import SourceCreator from './SourceCreator';
import Homepage from './Homepage'
import Login from './Login'
import Chatbot from './Chatbot'

function App() {

  return (
   <BrowserRouter> 
      {/* <NavigationPage /> */}
      <Routes>

        <Route path="/" element={<NavigationPage />} />
        <Route path="/entityform" element={<EntityForm />} />
        <Route path="/entitylist" element={<EntityList />} />
        <Route path="/entitymappingform" element={<EntityMappingForm />} />
        <Route path="/mappingmanager" element={<MappingManager />} />
        <Route path="/taskscheduler" element={<TaskScheduler />} />
        <Route path="/tasksmanagement" element={<TasksManagement />} />
        <Route path="/taskexecutor" element={<TaskExecutor />} />
        <Route path="/webscraperform" element={<WebScraperForm />} />
        <Route path="/sourcemanagement" element={<SourceManagement />} />
        <Route path="/entity-data" element={<EntityDataPage />} />
        <Route path="/addsource" element={<SourceCreator />} />
        <Route path="/login" element={<Login/>} />
        <Route path="/homepage" element={<Homepage/>}/>
        <Route path="/chatbot" element={<Chatbot />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
