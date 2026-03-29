import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Repositories from './pages/Repositories'
import RepositoryDetail from './pages/RepositoryDetail'
import Reviews from './pages/Reviews'
import ReviewDetail from './pages/ReviewDetail'
import Developers from './pages/Developers'
import SecurityFindings from './pages/SecurityFindings'
import TechDebt from './pages/TechDebt'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="repositories" element={<Repositories />} />
          <Route path="repositories/:id" element={<RepositoryDetail />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="reviews/:id" element={<ReviewDetail />} />
          <Route path="developers" element={<Developers />} />
          <Route path="security" element={<SecurityFindings />} />
          <Route path="techdebt" element={<TechDebt />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
