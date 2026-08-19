import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import Login from './pages/Login'
import LandDetail from './pages/LandDetail'
import ExternalOffices from './pages/ExternalOffices'
import SettingsPage from './pages/Settings'
import DocumentUpload from './pages/DocumentUpload'
import Mapa from './pages/Mapa'
import Dashboard from './pages/Dashboard'
import TestAiDocumentAnalysis from './pages/TestAiDocumentAnalysis'
import LandAssistantChat from './pages/LandAssistantChat'
import { AuthProvider, useAuth } from './hooks/use-auth'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, role } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role !== 'admin') return <Navigate to="/documents" replace />
  return <>{children}</>
}

const App = () => (
  <AuthProvider>
    <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Navigate to="/login" replace />} />
          <Route
            path="/test/analyze-document"
            element={
              <ProtectedRoute>
                <TestAiDocumentAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <LandAssistantChat />
              </ProtectedRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/"
              element={
                <AdminRoute>
                  <Index />
                </AdminRoute>
              }
            />
            <Route
              path="/dash"
              element={
                <AdminRoute>
                  <Dashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/external-offices"
              element={
                <AdminRoute>
                  <ExternalOffices />
                </AdminRoute>
              }
            />
            <Route path="/documents" element={<DocumentUpload />} />
            <Route
              path="/mapa"
              element={
                <AdminRoute>
                  <Mapa />
                </AdminRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <AdminRoute>
                  <SettingsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/land/:id"
              element={
                <AdminRoute>
                  <Index />
                  <LandDetail />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
