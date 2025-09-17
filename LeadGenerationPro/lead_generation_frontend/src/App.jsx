import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import WebScraperForm from './WebScraperForm'
import AddSchema from './AddSchema'
import EntityForm from "./EntityForm"
import TaskForm from './TaskForm'
function App() {

  return (
    <>
    {/* <WebScraperForm/> */}
      <AddSchema/> 
      {/* <EntityForm /> */}
      <TaskForm />
    </>
  )
}

export default App
