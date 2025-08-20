import React, { useState, useEffect } from 'react';

const UpgradePlan = ({ user, onCancel, onUpgrade }) => {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchCurrentPlan();
  }, []);

  const fetchPlans = async () => {
    try {
      // Buscar planos da API
      const response = await fetch('/api/plans');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Buscar plano atual do usuário
          const token = localStorage.getItem('token');
          let currentPlanId = 'basic';
          
          if (token) {
            try {
              const currentPlanResponse = await fetch('/api/plans/user/current', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (currentPlanResponse.ok) {
                const currentPlanData = await currentPlanResponse.json();
                if (currentPlanData.success && currentPlanData.currentPlan) {
                  currentPlanId = currentPlanData.currentPlan.plan_id;
                }
              }
            } catch (err) {
              console.warn('Erro ao buscar plano atual:', err);
            }
          }

          // Processar planos
          const processedPlans = data.plans.map(plan => ({
            id: plan.plan_id,
            name: plan.name,
            price: plan.price,
            currency: plan.currency,
            interval: plan.billing_interval,
            features: plan.features,
            popular: plan.is_popular,
            current: plan.plan_id === currentPlanId
          }));

          setPlans(processedPlans);
          setSelectedPlan(processedPlans.find(p => !p.current)); // Selecionar primeiro plano não atual
        } else {
          setError('Erro ao carregar planos: ' + data.error);
        }
      } else {
        setError('Erro ao conectar com o servidor');
      }
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      setError('Erro ao carregar planos disponíveis');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPlan = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/plans/user/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.currentPlan) {
          setCurrentPlan({
            name: data.currentPlan.name,
            price: data.currentPlan.price
          });
        }
      }
    } catch (error) {
      console.error('Erro ao buscar plano atual:', error);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    try {
      setProcessing(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Você precisa estar logado para fazer upgrade');
        return;
      }

      // Fazer upgrade real
      const response = await fetch('/api/plans/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId: selectedPlan.id })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (onUpgrade) {
          onUpgrade(selectedPlan);
        }
        alert(`✅ ${data.message}`);
        // Recarregar planos para atualizar o estado
        fetchPlans();
      } else {
        setError(data.error || 'Erro ao processar upgrade');
      }

    } catch (error) {
      console.error('Erro ao fazer upgrade:', error);
      setError('Erro ao processar upgrade');
      setProcessing(false);
    }
  };

  const formatPrice = (amount, currency) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="upgrade-container">
        <div className="upgrade-card">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando planos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upgrade-container">
      <div className="upgrade-header">
        <h1>🚀 Escolha seu Plano</h1>
        <p>Desbloqueie todo o potencial do seu controle financeiro</p>
        
        {currentPlan && (
          <div className="current-plan-info">
            <span className="current-label">Plano Atual:</span>
            <span className="current-plan">{currentPlan.name}</span>
            <span className="current-price">{formatPrice(currentPlan.price, 'BRL')}/mês</span>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      <div className="plans-grid">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`plan-card ${plan.current ? 'current' : ''} ${selectedPlan?.id === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
            onClick={() => !plan.current && setSelectedPlan(plan)}
          >
            {plan.popular && <div className="popular-badge">🔥 Mais Popular</div>}
            {plan.current && <div className="current-badge">✅ Atual</div>}

            <div className="plan-header">
              <h3>{plan.name}</h3>
              <div className="plan-price">
                <span className="price">{formatPrice(plan.price, plan.currency)}</span>
                <span className="period">por mês</span>
              </div>
            </div>

            <div className="plan-features">
              <ul>
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <span className="feature-icon">✅</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="plan-action">
              {plan.current ? (
                <button className="btn btn-current" disabled>
                  Plano Atual
                </button>
              ) : (
                <button
                  className={`btn ${selectedPlan?.id === plan.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(plan);
                  }}
                >
                  {selectedPlan?.id === plan.id ? 'Selecionado' : 'Selecionar'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="upgrade-actions">
        <button
          onClick={handleUpgrade}
          disabled={!selectedPlan || processing}
          className="btn btn-primary btn-upgrade"
        >
          {processing ? (
            <>
              <span className="loading-spinner"></span>
              Processando Upgrade...
            </>
          ) : (
            <>
              💎 Fazer Upgrade - {selectedPlan ? formatPrice(selectedPlan.price, 'BRL') : 'Selecione um plano'}
            </>
          )}
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="btn btn-text"
            disabled={processing}
          >
            ← Voltar
          </button>
        )}
      </div>

      <div className="upgrade-footer">
        <div className="guarantee-info">
          <h4>🛡️ Garantia de Satisfação</h4>
          <p>Se não ficar satisfeito, cancele a qualquer momento. Sem taxas de cancelamento.</p>
        </div>

        <div className="support-info">
          <h4>💬 Precisa de Ajuda?</h4>
          <p>Nossa equipe está pronta para ajudar você a escolher o melhor plano.</p>
          <a href="mailto:suporte@financas.com" className="support-link">
            📧 Falar com Suporte
          </a>
        </div>
      </div>

      <style jsx>{`
        .upgrade-container {
          min-height: 100vh;
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          padding: 2rem;
        }

        .upgrade-header {
          text-align: center;
          margin-bottom: 3rem;
          color: white;
        }

        .upgrade-header h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
          font-weight: 700;
        }

        .upgrade-header p {
          font-size: 1.25rem;
          opacity: 0.9;
          margin-bottom: 2rem;
        }

        .current-plan-info {
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-lg);
          padding: 1rem 2rem;
          display: inline-flex;
          align-items: center;
          gap: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .current-label {
          font-weight: 600;
        }

        .current-plan {
          font-weight: 700;
          color: var(--warning-color);
        }

        .current-price {
          font-weight: 600;
          font-size: 1.125rem;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto 3rem;
        }

        .plan-card {
          background: var(--bg-primary);
          border-radius: var(--radius-2xl);
          padding: 2rem;
          position: relative;
          cursor: pointer;
          transition: var(--transition);
          border: 2px solid transparent;
          box-shadow: var(--shadow-lg);
        }

        .plan-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-2xl);
        }

        .plan-card.selected {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .plan-card.current {
          border-color: var(--success-color);
          cursor: default;
        }

        .plan-card.current:hover {
          transform: none;
        }

        .plan-card.popular {
          border-color: var(--warning-color);
          position: relative;
          transform: scale(1.05);
        }

        .popular-badge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--warning-color);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .current-badge {
          position: absolute;
          top: -10px;
          right: 1rem;
          background: var(--success-color);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .plan-header {
          text-align: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .plan-header h3 {
          color: var(--text-primary);
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .plan-price .price {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .plan-price .period {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .plan-features ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .plan-features li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-color);
        }

        .plan-features li:last-child {
          border-bottom: none;
        }

        .feature-icon {
          flex-shrink: 0;
        }

        .plan-action {
          margin-top: 2rem;
        }

        .btn {
          width: 100%;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-lg);
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          border: none;
          font-size: 1rem;
        }

        .btn-primary {
          background: var(--primary-color);
          color: white;
        }

        .btn-primary:hover {
          background: var(--primary-dark);
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .btn-secondary:hover {
          background: var(--bg-tertiary);
        }

        .btn-current {
          background: var(--success-color);
          color: white;
          cursor: not-allowed;
        }

        .upgrade-actions {
          text-align: center;
          margin-bottom: 3rem;
        }

        .btn-upgrade {
          max-width: 400px;
          margin: 0 auto 1rem;
          min-height: 56px;
          font-size: 1.125rem;
        }

        .btn-text {
          background: transparent;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .btn-text:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .upgrade-footer {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .guarantee-info,
        .support-info {
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-lg);
          padding: 2rem;
          text-align: center;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .guarantee-info h4,
        .support-info h4 {
          margin-bottom: 1rem;
          font-size: 1.125rem;
        }

        .guarantee-info p,
        .support-info p {
          opacity: 0.9;
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .support-link {
          color: var(--warning-color);
          text-decoration: none;
          font-weight: 600;
        }

        .support-link:hover {
          text-decoration: underline;
        }

        .loading-container {
          text-align: center;
          padding: 3rem;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--border-color);
          border-top: 4px solid var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .alert {
          max-width: 600px;
          margin: 0 auto 2rem;
          padding: 1rem 1.5rem;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .alert-danger {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--danger-color);
        }

        @media (max-width: 768px) {
          .upgrade-container {
            padding: 1rem;
          }

          .upgrade-header h1 {
            font-size: 2rem;
          }

          .plans-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .plan-card.popular {
            transform: none;
          }

          .current-plan-info {
            flex-direction: column;
            gap: 0.5rem;
          }

          .upgrade-footer {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default UpgradePlan; 