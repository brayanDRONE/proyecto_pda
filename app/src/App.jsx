import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import FolioListPage from './pages/FolioListPage'
import FolioDetailPage from './pages/FolioDetailPage'
import ScanPage from './pages/ScanPage'
import ReportPage from './pages/ReportPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/folios" element={<FolioListPage />} />
        <Route path="/folio/:folioId/detail" element={<FolioDetailPage />} />
        <Route path="/folio/:folioId/scan" element={<ScanPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
