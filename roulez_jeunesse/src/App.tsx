import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { VehiclesPage } from './pages/VehiclesPage'
import { VehicleDetailPage } from './pages/VehicleDetailPage'
import { MaintenancePage } from './pages/MaintenancePage'
import { RemindersPage } from './pages/RemindersPage'
import { FuelPage } from './pages/FuelPage'
import { GarageVisitsPage } from './pages/GarageVisitsPage'
import { MaintenanceSchedulePage } from './pages/MaintenanceSchedulePage'
import { SettingsPage } from './pages/SettingsPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" replace /> : <LoginPage />} 
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/vehicles"
        element={
          <PrivateRoute>
            <VehiclesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/vehicles/:id"
        element={
          <PrivateRoute>
            <VehicleDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <PrivateRoute>
            <MaintenancePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/reminders"
        element={
          <PrivateRoute>
            <RemindersPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/fuel"
        element={
          <PrivateRoute>
            <FuelPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/garage-visits"
        element={
          <PrivateRoute>
            <GarageVisitsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/schedules"
        element={
          <PrivateRoute>
            <MaintenanceSchedulePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <SettingsPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
