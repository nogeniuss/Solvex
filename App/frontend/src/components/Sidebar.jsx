import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';

const Sidebar = ({ activePage, onPageChange, user, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    document.body.setAttribute('data-sidebar', isCollapsed ? 'collapsed' : 'expanded');
  }, [isCollapsed]);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      description: 'Visão geral financeira'
    },
    {
      id: 'categorias',
      label: 'Categorias',
      icon: '🏷️',
      description: 'Gestão de categorias'
    },
    {
      id: 'despesas',
      label: 'Despesas',
      icon: '💸',
      description: 'Controle de despesas'
    },
    {
      id: 'receitas',
      label: 'Receitas',
      icon: '💰',
      description: 'Controle de receitas'
    },
    {
      id: 'investimentos',
      label: 'Investimentos',
      icon: '📈',
      description: 'Gestão de investimentos'
    },
    {
      id: 'relatorios',
      label: 'Relatórios',
      icon: '📊',
      description: 'Análises avançadas'
    },
    {
      id: 'dre',
      label: 'DRE',
      icon: '📋',
      description: 'Demonstração do resultado'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: '📊',
      description: 'Painel analítico'
    },
    {
      id: 'importacao',
      label: 'Importação',
      icon: '📥',
      description: 'Importar extrato bancário'
    },
    {
      id: 'metas',
      label: 'Metas',
      icon: '🎯',
      description: 'Objetivos financeiros'
    },
    {
      id: 'upgrade',
      label: 'Upgrade',
      icon: '💎',
      description: 'Planos e upgrade'
    },
    {
      id: 'billing',
      label: 'Cobrança',
      icon: '💳',
      description: 'Gerenciar pagamentos'
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: '⚙️',
      description: 'Configurações do sistema'
    }
  ];

  const handleLogout = () => {
    try {
      if (onLogout && typeof onLogout === 'function') {
        onLogout();
      } else {
        // Fallback: limpar localStorage e redirecionar
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Erro no logout:', error);
      // Em caso de erro, forçar logout manual
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
  };

  return (
    <>
      {/* Overlay para mobile */}
      {!isCollapsed && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsCollapsed(true)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998,
            display: 'none'
          }}
        />
      )}

              {/* Sidebar */}
      <div 
        className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: isCollapsed ? '70px' : '280px',
          background: 'var(--gradient-bg)',
          borderRight: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 999,
          transition: 'var(--transition-slow)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div 
          className="sidebar-header"
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--gradient-primary)',
            color: 'var(--text-inverse)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--gradient-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  color: 'white'
                }}
              >
                💼
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-inverse)', fontWeight: '700' }}>
                  FinanSys Pro
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>
                  Sistema Financeiro
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="sidebar-toggle"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              transition: 'var(--transition)'
            }}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* User Info */}
        {!isCollapsed && user && (
          <div 
            className="user-info"
            style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '1rem',
              background: 'var(--bg-secondary)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--success-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  color: 'white',
                  fontWeight: '600'
                }}
              >
                {user.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.875rem', 
                  color: 'var(--text-primary)', 
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user.nome}
                </p>
                <p style={{ 
                  margin: '0.25rem 0 0 0', 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <nav 
          className="sidebar-nav"
          style={{
            flex: 1,
            padding: '0 1rem',
            overflowY: 'auto',
            overflowX: 'hidden',
            maxHeight: 'calc(100vh - 300px)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border-color) transparent'
          }}
        >
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onPageChange(item.id)}
                  className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                  style={{
                    width: '100%',
                    padding: isCollapsed ? '1rem 0.5rem' : '1rem 1.5rem',
                    margin: '0.25rem 0',
                    background: activePage === item.id 
                      ? 'var(--primary-color)'
                      : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCollapsed ? '0' : '0.75rem',
                    color: activePage === item.id ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: activePage === item.id ? '600' : '500',
                    transition: 'var(--transition)',
                    textAlign: isCollapsed ? 'center' : 'left',
                    justifyContent: isCollapsed ? 'center' : 'flex-start'
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                  {!isCollapsed && (
                    <div style={{ flex: 1 }}>
                      <div>{item.label}</div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        opacity: 0.7,
                        marginTop: '0.25rem'
                      }}>
                        {item.description}
                      </div>
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
                <div
          className="sidebar-footer"
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)'
          }}
        >
          {/* Botão de tema */}
          <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
            <ThemeToggle />
          </div>
          
          <button
            onClick={handleLogout}
            className="logout-button"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--danger-color)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span>Sair</span>
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsCollapsed(false)}
        className="mobile-menu-button"
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 997,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem',
          fontSize: '1.25rem',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-md)',
          display: 'none'
        }}
      >
        ☰
      </button>

      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }
          
          .sidebar:not(.collapsed) {
            transform: translateX(0);
          }
          
          .sidebar-overlay {
            display: block !important;
          }
          
          .mobile-menu-button {
            display: block !important;
          }
          
          .main-content {
            margin-left: 0 !important;
          }
        }
        
        .sidebar-item:hover {
          background: var(--bg-secondary) !important;
          color: var(--text-primary) !important;
          transform: translateX(4px);
        }
        
        .logout-button:hover {
          background: #dc2626 !important;
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }
        
        .sidebar-toggle:hover {
          background: var(--bg-tertiary) !important;
          color: var(--text-primary) !important;
        }
      `}</style>
    </>
  );
};

export default Sidebar; 