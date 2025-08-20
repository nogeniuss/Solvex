import React, { useState } from 'react';

const FiltersToggle = ({ children, title = "Filtros" }) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleFilters = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="filters-toggle-container">
      <button
        onClick={toggleFilters}
        className="filters-toggle-btn"
        title={isVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
        </svg>
        <span>{title}</span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{
            transform: isVisible ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}
        >
          <polyline points="6,9 12,15 18,9"/>
        </svg>
      </button>

      <div 
        className={`filters-content ${isVisible ? 'visible' : ''}`}
        style={{
          maxHeight: isVisible ? '1000px' : '0',
          opacity: isVisible ? 1 : 0,
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
      >
        {children}
      </div>

      <style jsx>{`
        .filters-toggle-container {
          margin-bottom: 1.5rem;
        }

        .filters-toggle-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          cursor: pointer;
          transition: var(--transition);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .filters-toggle-btn:hover {
          background: var(--bg-tertiary);
          border-color: var(--border-focus);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }

        .filters-toggle-btn:active {
          transform: translateY(0);
        }

        .filters-content {
          margin-top: 1rem;
        }

        .filters-content.visible {
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default FiltersToggle; 