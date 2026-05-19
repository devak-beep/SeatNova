import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import EditorPage from './pages/EditorPage'
import { themes } from './theme'

export const ThemeContext = React.createContext(themes.dark)

class RootErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, fontFamily: 'monospace', color: '#f87171', background: '#0f172a', minHeight: '100vh' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Something went wrong</div>
        <div style={{ fontSize: 13, marginBottom: 20, color: '#fca5a5' }}>{this.state.error.message}</div>
        <button onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
          style={{ padding: '8px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          ← Go to Home
        </button>
      </div>
    )
    return this.props.children
  }
}

function PrivateRoute({ children }) {
  const user = useAuth()
  if (user === undefined) return <div style={{ padding: 40, color: '#9ca3af', fontFamily: 'system-ui' }}>Loading…</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <RootErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/editor/:id" element={<PrivateRoute><EditorPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </RootErrorBoundary>
  )
}
