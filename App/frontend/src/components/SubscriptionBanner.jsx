import React, { useState, useEffect } from 'react';

const SubscriptionBanner = ({ user, onUpgrade }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/stripe/subscription-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.subscription);
      }
    } catch (error) {
      console.error('Erro ao verificar subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Redirecionar para página de pagamento
      window.location.href = '/payment';
    }
  };

  const handleManageBilling = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/stripe/create-customer-portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Erro ao acessar portal:', error);
    }
  };

  const getStatusMessage = (status) => {
    const messages = {
      'no_subscription': 'Você está usando a versão gratuita do sistema',
      'canceled': 'Sua assinatura foi cancelada',
      'past_due': 'Seu pagamento está em atraso',
      'incomplete': 'Sua assinatura está incompleta',
      'incomplete_expired': 'Sua tentativa de pagamento expirou',
      'unpaid': 'Há pagamentos pendentes',
      'paused': 'Sua assinatura está pausada',
      'trialing': 'Você está no período de teste'
    };
    return messages[status] || 'Status da assinatura desconhecido';
  };

  const getStatusColor = (status) => {
    const colors = {
      'no_subscription': 'info',
      'canceled': 'danger',
      'past_due': 'warning',
      'incomplete': 'warning',
      'incomplete_expired': 'danger',
      'unpaid': 'warning',
      'paused': 'warning',
      'trialing': 'info',
      'active': 'success'
    };
    return colors[status] || 'secondary';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'no_subscription': '🆓',
      'canceled': '❌',
      'past_due': '⚠️',
      'incomplete': '⏳',
      'incomplete_expired': '⏰',
      'unpaid': '💰',
      'paused': '⏸️',
      'trialing': '🎯',
      'active': '✅'
    };
    return icons[status] || '❓';
  };

  if (loading || dismissed) return null;

  // Não mostrar banner se subscription estiver ativa
  if (subscriptionStatus?.hasActive) return null;

  const status = subscriptionStatus?.status || 'no_subscription';
  const colorClass = getStatusColor(status);

  return (
    <div className={`subscription-banner ${colorClass}`}>
      <div className="banner-content">
        <div className="banner-info">
          <span className="banner-icon">{getStatusIcon(status)}</span>
          <div className="banner-text">
            <h4>{getStatusMessage(status)}</h4>
            {status === 'trialing' && subscriptionStatus?.trialEndsAt && (
              <p>Seu período de teste termina em {new Date(subscriptionStatus.trialEndsAt).toLocaleDateString('pt-BR')}</p>
            )}
            {status === 'past_due' && (
              <p>Atualize seu método de pagamento para continuar usando todas as funcionalidades</p>
            )}
            {status === 'no_subscription' && (
              <p>Assine agora e desbloqueie todas as funcionalidades premium</p>
            )}
          </div>
        </div>
        
        <div className="banner-actions">
          {(status === 'no_subscription' || status === 'canceled' || status === 'incomplete_expired') ? (
            <button onClick={handleUpgrade} className="btn btn-upgrade">
              💎 Assinar Agora
            </button>
          ) : (
            <button onClick={handleManageBilling} className="btn btn-manage">
              ⚙️ Gerenciar Cobrança
            </button>
          )}
          
          <button 
            onClick={() => setDismissed(true)}
            className="btn btn-dismiss"
            title="Dispensar"
          >
            ✕
          </button>
        </div>
      </div>

      <style jsx>{`
        .subscription-banner {
          padding: 1rem 1.5rem;
          margin: 1rem 0;
          border-radius: var(--radius-lg);
          border: 1px solid;
          position: relative;
          animation: slideDown 0.3s ease;
        }

        .subscription-banner.info {
          background: rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.3);
          color: var(--info-color);
        }

        .subscription-banner.warning {
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.3);
          color: var(--warning-color);
        }

        .subscription-banner.danger {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
          color: var(--danger-color);
        }

        .subscription-banner.success {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
          color: var(--success-color);
        }

        .banner-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .banner-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .banner-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .banner-text h4 {
          margin: 0 0 0.25rem 0;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .banner-text p {
          margin: 0;
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .banner-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .btn {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition);
          border: none;
          white-space: nowrap;
        }

        .btn-upgrade {
          background: var(--primary-color);
          color: white;
        }

        .btn-upgrade:hover {
          background: var(--primary-dark);
          transform: translateY(-1px);
        }

        .btn-manage {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .btn-manage:hover {
          background: var(--bg-tertiary);
        }

        .btn-dismiss {
          background: transparent;
          color: var(--text-secondary);
          padding: 0.25rem 0.5rem;
          font-size: 0.9rem;
        }

        .btn-dismiss:hover {
          background: rgba(0, 0, 0, 0.1);
          color: var(--text-primary);
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

        @media (max-width: 768px) {
          .banner-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .banner-actions {
            align-self: stretch;
            justify-content: space-between;
          }

          .btn {
            flex: 1;
          }

          .btn-dismiss {
            flex: none;
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

export default SubscriptionBanner; 