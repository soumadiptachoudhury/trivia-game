import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Admin from './Pages/Admin.jsx'
import Display from './Pages/Display.jsx'
import Player1 from './Pages/Player1.jsx'
import Player2 from './Pages/Player2.jsx'

const App = () => {
  return (
    <>
    
    <Routes>
      <Route path="/admin" element={<Admin/>}></Route>
      <Route path="display" element={<Display/>}></Route>
      <Route path='player1' element={<Player1/>}></Route>
      <Route path='player2' element={<Player2/>}></Route>
    </Routes>
    </>
  )
}

export default App