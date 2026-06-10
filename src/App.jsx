import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { PortfolioProvider } from './context/PortfolioContext.jsx'
import { ProtectedRoute } from './routes/ProtectedRoute.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import CadastroPage from './pages/CadastroPage.jsx'
import InicioPage from './pages/InicioPage.jsx'
import ListagemPage from './pages/ListagemPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import TraderPage from './pages/TraderPage.jsx'

export default function App() {
  return (
    <AuthProvider>
      <PortfolioProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/inicio"
            element={
              <ProtectedRoute>
                <InicioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cadastro"
            element={
              <ProtectedRoute>
                <CadastroPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/listagem"
            element={
              <ProtectedRoute>
                <ListagemPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trader"
            element={
              <ProtectedRoute>
                <TraderPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
      </PortfolioProvider>
    </AuthProvider>
  )
}
