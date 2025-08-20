import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const PaymentPage = ({ onSuccess, onCancel, user }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [productInfo, setProductInfo] = useState(null);
  const [selectedPrice, setSelectedPrice] = useState(null);

  // Inicializar Stripe apenas se necessário
  const stripePublicKey = import.meta.env.VITE_STRIPE_FRONTEND || 'pk_test_51PsXhrGhjpYUfyObXra74Y0C3QnLlb0VShey2PAw8SzieNsjgqhUk1FAZAtmfKSHXurXPvoBozIFxf7kL27jp1Yt00OXBw0l5L';
  const stripePromise = React.useMemo(() => {
    // Só carregar Stripe se realmente for usar
    return null; // Por enquanto desabilitado para evitar erros de rede
  }, []);

  useEffect(() => {
    fetchProductInfo();
  }, []);

  const fetchProductInfo = async () => {
    try {
      const response = await fetch('/api/plans');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Pegar o plano básico como padrão para o produto
          const basicPlan = data.plans.find(p => p.plan_id === 'basic') || data.plans[0];
          
          const productInfo = {
            product: {
              id: 'financas-product',
              name: basicPlan.name,
              description: basicPlan.description || 'Sistema completo de gestão financeira',
              images: [],
              features: []
            },
            prices: data.plans.map(plan => ({
              id: plan.plan_id,
              amount: plan.price * 100, // Converter para centavos
              currency: plan.currency,
              interval: plan.billing_interval,
              interval_count: plan.interval_count || 1
            }))
          };

          setProductInfo(productInfo);
          // Selecionar o primeiro preço por padrão
          if (productInfo.prices && productInfo.prices.length > 0) {
            setSelectedPrice(productInfo.prices[0]);
          }
        } else {
          setError('Erro ao carregar planos: ' + data.error);
        }
      } else {
        setError('Erro ao conectar com o servidor');
      }
    } catch (error) {
      console.error('Erro ao obter informações do produto:', error);
      setError('Erro ao carregar informações do produto');
    }
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Você precisa estar logado para fazer uma assinatura');
        return;
      }

      // Criar sessão de checkout
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          priceId: selectedPrice?.id
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Para demonstração, simular pagamento bem-sucedido imediatamente
        handlePaymentSuccessDemo();
      } else {
        setError(data.error || 'Erro ao criar sessão de pagamento');
      }

    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      setError('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccessDemo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token não encontrado');
        return;
      }

      // Simular pagamento bem-sucedido
      const response = await fetch('/api/payment/simulate-success', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('✅ Pagamento realizado com sucesso!');
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 1500);
      } else {
        setError(data.error || 'Erro ao processar pagamento');
      }

    } catch (error) {
      console.error('Erro no pagamento demo:', error);
      setError('Erro ao processar pagamento');
    }
  };

  const formatPrice = (amount, currency) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const getPeriodText = (interval, intervalCount = 1) => {
    const periods = {
      day: intervalCount === 1 ? 'dia' : `${intervalCount} dias`,
      week: intervalCount === 1 ? 'semana' : `${intervalCount} semanas`,
      month: intervalCount === 1 ? 'mês' : `${intervalCount} meses`,
      year: intervalCount === 1 ? 'ano' : `${intervalCount} anos`
    };
    return periods[interval] || interval;
  };

  if (!productInfo) {
    return (
      <div className="payment-container">
        <div className="payment-card">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando informações do produto...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-card">
        <div className="payment-header">
          <div className="payment-icon">💎</div>
          <h2>Assine o {productInfo.product.name}</h2>
          <p>Desbloqueie todas as funcionalidades do sistema de finanças</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            {success}
          </div>
        )}

        {/* Informações do produto */}
        <div className="product-info">
          <h3>🚀 O que você terá acesso:</h3>
          <ul className="features-list">
            <li>✅ Controle completo de receitas e despesas</li>
            <li>✅ Relatórios e análises avançadas</li>
            <li>✅ Metas e planejamento financeiro</li>
            <li>✅ Investimentos e rentabilidade</li>
            <li>✅ Notificações e lembretes inteligentes</li>
            <li>✅ Backup automático dos dados</li>
            <li>✅ Suporte prioritário</li>
            <li>✅ Todas as futuras atualizações</li>
          </ul>
        </div>

        {/* Planos de preço */}
        {productInfo.prices && productInfo.prices.length > 0 && (
          <div className="pricing-section">
            <h3>📋 Escolha seu plano:</h3>
            <div className="pricing-options">
              {productInfo.prices.map((price) => (
                <div
                  key={price.id}
                  className={`price-option ${selectedPrice?.id === price.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPrice(price)}
                >
                  <div className="price-header">
                    <h4>{formatPrice(price.amount, price.currency)}</h4>
                    <span className="price-period">por {getPeriodText(price.interval, price.interval_count)}</span>
                  </div>
                  {price.interval === 'year' && (
                    <div className="price-badge">💰 Melhor Oferta</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informações de segurança */}
        <div className="security-info">
          <h4>🔒 Pagamento 100% Seguro</h4>
          <p>
            Processado pelo Stripe, a mesma tecnologia usada por empresas como Shopify, 
            Lyft e milhões de negócios ao redor do mundo.
          </p>
          <div className="security-badges">
            <span className="badge">🔐 SSL</span>
            <span className="badge">💳 PCI DSS</span>
            <span className="badge">🛡️ Stripe</span>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="payment-actions">
          <button
            onClick={handleSubscribe}
            disabled={loading || !selectedPrice}
            className="btn btn-primary btn-full payment-btn"
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Processando...
              </>
            ) : (
              <>
                <span>💎</span>
                {selectedPrice ? `Assinar Agora - ${formatPrice(selectedPrice.amount, selectedPrice.currency)}` : 'Selecione um plano'}
              </>
            )}
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              className="btn btn-text"
              disabled={loading}
            >
              ← Voltar
            </button>
          )}
        </div>

        {/* Política de cancelamento */}
        <div className="payment-footer">
          <p className="small-text">
            ✨ <strong>Garantia de 7 dias:</strong> Não ficou satisfeito? Cancelamos e devolvemos seu dinheiro.
          </p>
          <p className="small-text">
            🔄 <strong>Cancele quando quiser:</strong> Sem taxas de cancelamento ou multas.
          </p>
        </div>
      </div>

      <style jsx>{`
        .payment-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
          position: relative;
        }

        .payment-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="%23374151" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          opacity: 0.3;
        }

        .payment-card {
          background: var(--bg-primary);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-2xl);
          padding: 2.5rem;
          width: 100%;
          max-width: 500px;
          position: relative;
          z-index: 1;
          animation: slideUp 0.6s ease-out;
          border: 1px solid var(--border-color);
        }

        .payment-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .payment-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          display: block;
          animation: bounce 2s infinite;
        }

        .payment-header h2 {
          color: var(--text-primary);
          font-size: 1.875rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
        }

        .payment-header p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .product-info {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
        }

        .product-info h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
          font-size: 1.125rem;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .features-list li {
          padding: 0.5rem 0;
          color: var(--text-primary);
          font-size: 0.875rem;
          border-bottom: 1px solid var(--border-color);
        }

        .features-list li:last-child {
          border-bottom: none;
        }

        .pricing-section {
          margin-bottom: 2rem;
        }

        .pricing-section h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
          font-size: 1.125rem;
        }

        .pricing-options {
          display: grid;
          gap: 1rem;
        }

        .price-option {
          padding: 1.5rem;
          border: 2px solid var(--border-color);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: var(--transition);
          position: relative;
          background: var(--bg-primary);
        }

        .price-option:hover {
          border-color: var(--border-dark);
        }

        .price-option.selected {
          border-color: var(--primary-color);
          background: rgba(59, 130, 246, 0.05);
        }

        .price-header h4 {
          color: var(--text-primary);
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .price-period {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .price-badge {
          position: absolute;
          top: -8px;
          right: 1rem;
          background: var(--warning-color);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .security-info {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 2rem;
          text-align: center;
        }

        .security-info h4 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }

        .security-info p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        .security-badges {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .badge {
          background: var(--success-color);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .payment-actions {
          margin-bottom: 1.5rem;
        }

        .payment-btn {
          margin-bottom: 1rem;
          min-height: 48px;
        }

        .payment-footer {
          text-align: center;
          border-top: 1px solid var(--border-color);
          padding-top: 1rem;
        }

        .small-text {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 0.25rem 0;
          line-height: 1.4;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .loading-container {
          text-align: center;
          padding: 2rem;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border-color);
          border-top: 3px solid var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .payment-container {
            padding: 1rem;
          }
          
          .payment-card {
            padding: 2rem 1.5rem;
          }
          
          .payment-icon {
            font-size: 3rem;
          }
          
          .payment-header h2 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PaymentPage; 