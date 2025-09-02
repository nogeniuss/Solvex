import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/receitas', label: 'Receitas' },
    { path: '/despesas', label: 'Despesas' },
    { path: '/categorias', label: 'Categorias' },
    { path: '/metas', label: 'Metas' },
    { path: '/investimentos', label: 'Investimentos' },
    { path: '/relatorios', label: 'Relatórios' },
    { path: '/configuracoes', label: 'Configurações' }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Solvex</h1>
        <p>Gestão Financeira</p>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="sidebar-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link to="/profile" className="sidebar-link">
          <span className="sidebar-label">Perfil</span>
        </Link>
        <Link to="/logout" className="sidebar-link">
          <span className="sidebar-label">Sair</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar; 