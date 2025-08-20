import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import AuthForm from './components/AuthForm'
import ResetPassword from './components/ResetPassword'
import Dashboard from './components/Dashboard'
import Categorias from './components/Categorias'
import Despesas from './components/Despesas'
import Receitas from './components/Receitas'
import Investimentos from './components/Investimentos'
import Relatorios from './components/Relatorios'
import DRE from './components/DRE'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import Metas from './components/Metas'
import Conquistas from './components/Conquistas'
import Configuracoes from './components/Configuracoes'
import Sidebar from './components/Sidebar'
import Importacao from './components/Importacao'
import UpgradePlan from './components/UpgradePlan'
import BillingPage from './components/BillingPage'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar se há um token salvo
    const token = localStorage.getItem('token')
    if (token) {
      // Verificar se o token ainda é válido
      fetchUserData(token)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserData = async (token) => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        // Token inválido, remover do localStorage
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (userData, token) => {
    setUser(userData)
    localStorage.setItem('token', token)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('token')
  }

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Carregando...</h2>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Routes>
            {/* Rota pública para redefinição de senha */}
            <Route 
              path="/reset-password" 
              element={<ResetPassword />} 
            />
            
            {/* Rota principal */}
            <Route 
              path="/*" 
              element={
                user ? (
                  <MainApp user={user} onLogout={handleLogout} />
                ) : (
                  <AuthForm onLogin={handleLogin} />
                )
              } 
            />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

// Componente para a aplicação principal (quando logado)
function MainApp({ user, onLogout }) {
  const [activePage, setActivePage] = useState('dashboard')

  const handlePageChange = (page) => {
    setActivePage(page)
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />
      case 'categorias':
        return <Categorias />
      case 'despesas':
        return <Despesas />
      case 'receitas':
        return <Receitas />
      case 'investimentos':
        return <Investimentos />
      case 'relatorios':
        return <Relatorios />
      case 'dre':
        return <DRE />
      case 'analytics':
        return <AnalyticsDashboard />
      case 'importacao':
        return <Importacao />
      case 'metas':
        return <Metas />
      case 'conquistas':
        return <Conquistas />
      case 'configuracoes':
        return <Configuracoes />
      case 'upgrade':
        return <UpgradePlan user={user} onCancel={() => setActivePage('dashboard')} />
      case 'billing':
        return <BillingPage user={user} onCancel={() => setActivePage('dashboard')} />
      default:
        return <Dashboard />
    }
  }

  return (
    <>
      <Sidebar 
        activePage={activePage} 
        onPageChange={handlePageChange} 
        user={user} 
        onLogout={onLogout}
      />
      <div className="main-content-wrapper">
        {renderPage()}
      </div>
    </>
  )
}

export default App 