import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import AuthForm from './components/AuthForm';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Dashboard from './components/Dashboard';
import Despesas from './components/Despesas';
import Receitas from './components/Receitas';
import Investimentos from './components/Investimentos';
import Metas from './components/Metas';
import Categorias from './components/Categorias';
import Relatorios from './components/Relatorios';
import Conquistas from './components/Conquistas';
import DRE from './components/DRE';
import Importacao from './components/Importacao';
import Configuracoes from './components/Configuracoes';
import PaymentPage from './components/PaymentPage';
import PaymentErrorBoundary from './components/PaymentErrorBoundary';
import PaymentSuccess from './components/PaymentSuccess';
import UpgradePlan from './components/UpgradePlan';
import BillingPage from './components/BillingPage';
import './App.css';

// Componente para interceptar requisições
function RequestInterceptor({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, config = {}] = args;

      const token = localStorage.getItem('token');
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`
        };
      }

      try {
        const response = await originalFetch(url, config);

        if (response.status === 403) {
          const data = await response.json();
          if (data.payment_required) {
            navigate('/payment');
            throw new Error('Pagamento necessário');
          }
        }

        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          throw new Error('Não autorizado');
        }

        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [navigate]);

  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  const handlePaymentSuccess = () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserData(token);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserData(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (token) => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Router>
      <RequestInterceptor>
        <ErrorBoundary>
          <div className="app">
            {user && <Sidebar />}
            <div className={`main-content-wrapper ${user ? '' : 'no-sidebar'}`}>
              <Routes>
                {/* Rota de pagamento */}
                <Route
                  path="/payment"
                  element={
                    <PaymentErrorBoundary>
                      <PaymentPage user={user} />
                    </PaymentErrorBoundary>
                  }
                />

                {/* Rota de login */}
                <Route
                  path="/login"
                  element={
                    user ? (
                      <Navigate to="/dashboard" replace />
                    ) : (
                      (() => {
                        const urlParams = new URLSearchParams(window.location.search);
                        const paymentStatus = urlParams.get('payment');
                        
                        if (paymentStatus === 'success') {
                          return <PaymentSuccess onPaymentSuccess={handlePaymentSuccess} />;
                        }
                        return <AuthForm onLogin={handleLogin} />;
                      })()
                    )
                  }
                />

                {/* Rotas protegidas */}
                {user ? (
                  <>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/analytics" element={<AnalyticsDashboard />} />
                    <Route path="/despesas" element={<Despesas />} />
                    <Route path="/receitas" element={<Receitas />} />
                    <Route path="/investimentos" element={<Investimentos />} />
                    <Route path="/metas" element={<Metas />} />
                    <Route path="/categorias" element={<Categorias />} />
                    <Route path="/relatorios" element={<Relatorios />} />
                    <Route path="/conquistas" element={<Conquistas />} />
                    <Route path="/dre" element={<DRE />} />
                    <Route path="/importacao" element={<Importacao />} />
                    <Route path="/configuracoes" element={<Configuracoes />} />
                    <Route path="/upgrade" element={<UpgradePlan />} />
                    <Route path="/billing" element={<BillingPage />} />
                  </>
                ) : (
                  <Route path="*" element={<Navigate to="/login" replace />} />
                )}

                {/* Redirecionar para dashboard ou login */}
                <Route
                  path="/"
                  element={
                    <Navigate to={user ? "/dashboard" : "/login"} replace />
                  }
                />
              </Routes>
            </div>
          </div>
        </ErrorBoundary>
      </RequestInterceptor>
    </Router>
  );
}

export default App; 