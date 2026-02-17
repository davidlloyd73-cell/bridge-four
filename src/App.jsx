import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import ShiftLog from './pages/ShiftLog'
import CaseFlag from './pages/CaseFlag'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/shift-log" element={<ShiftLog />} />
      <Route path="/case-flag" element={<CaseFlag />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
