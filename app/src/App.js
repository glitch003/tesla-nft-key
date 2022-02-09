import React, { useState } from 'react'
import './App.css'
import { Routes, Route, BrowserRouter } from 'react-router-dom'
import SetupPage from './SetupPage.js'
import CarControlPage from './CarControlPage.js'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/" element={<CarControlPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
