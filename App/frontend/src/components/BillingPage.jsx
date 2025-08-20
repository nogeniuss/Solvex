import React, { useState, useEffect } from 'react';

const BillingPage = ({ user, onPaymentUpdate, onCancel }) => {
  const [billingInfo, setBillingInfo] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchBillingInfo();
    fetchPaymentHistory();
  }, []);

  const fetchBillingInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/payment/billing-info', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const billing = data.billingInfo;
          setBillingInfo({
            currentPlan: billing.currentPlan,
            paymentStatus: billing.paymentStatus,
            dueDate: billing.subscriptionEndsAt ? new Date(billing.subscriptionEndsAt) : null,
            overdueDays: billing.overdueDays || 0,
            amountDue: billing.amountDue || 0,
            nextBillingDate: billing.nextBillingDate ? new Date(billing.nextBillingDate) : null,
            paymentMethod: {
              type: 'card',
              last4: '1234',
              brand: 'visa',
              expired: false
            }
          });
        } else {
          setError('Erro ao carregar dados: ' + data.error);
        }
      } else {
        setError('Erro ao conectar com o servidor');
      }

    } catch (error) {
      console.error('Erro ao buscar informações de cobrança:', error);
      setError('Erro ao carregar informações de cobrança');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/payment/billing-info', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.paymentHistory) {
          const history = data.paymentHistory.map(payment => ({
            id: payment.id,
            date: new Date(payment.date),
            amount: payment.amount,
            status: payment.status,
            description: payment.description
          }));
          setPaymentHistory(history);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    }
  };

  const handleUpdatePayment = async () => {
    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Você precisa estar logado');
        return;
      }

      // Simular atualização de pagamento
      const response = await fetch('/api/payment/simulate-success', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('✅ Pagamento atualizado com sucesso! Sua conta está em dia.');
        
        // Atualizar informações de cobrança
        setBillingInfo(prev => ({
          ...prev,
          paymentStatus: 'active',
          overdueDays: 0,
          amountDue: 0
        }));

        setTimeout(() => {
          if (onPaymentUpdate) {
            onPaymentUpdate();
          }
        }, 2000);

      } else {
        setError(data.error || 'Erro ao atualizar pagamento');
      }

    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      setError('Erro ao processar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (amount, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusIcon = (status) => {
    const icons = {
      overdue: '⚠️',
      active: '✅',
      canceled: '❌',
      succeeded: '✅',
      failed: '❌',
      pending: '⏳'
    };
    return icons[status] || '❓';
  };

  const getStatusText = (status) => {
    const texts = {
      overdue: 'Em Atraso',
      active: 'Ativo',
      canceled: 'Cancelado',
      succeeded: 'Pago',
      failed: 'Falhou',
      pending: 'Pendente'
    };
    return texts[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      overdue: 'danger',
      active: 'success',
      canceled: 'danger',
      succeeded: 'success',
      failed: 'danger',
      pending: 'warning'
    };
    return colors[status] || 'secondary';
  };

  if (loading) {
    return (
      <div className="billing-container">
        <div className="billing-card">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando informações de cobrança...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!billingInfo) {
    return (
      <div className="billing-container">
        <div className="billing-card">
          <div className="error-container">
            <h2>❌ Erro ao carregar informações</h2>
            <p>Não foi possível carregar suas informações de cobrança.</p>
            <button onClick={onCancel} className="btn btn-primary">
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="billing-container">
      <div className="billing-header">
        <h1>💳 Gerenciar Cobrança</h1>
        <p>Acompanhe seus pagamentos e mantenha sua conta em dia</p>
      </div>

      <div className="billing-content">
        {/* Status da Conta */}
        <div className="billing-card status-card">
          <div className="card-header">
            <h2>📊 Status da Conta</h2>
          </div>

          <div className="status-info">
            <div className={`status-badge ${getStatusColor(billingInfo.paymentStatus)}`}>
              {getStatusIcon(billingInfo.paymentStatus)}
              {getStatusText(billingInfo.paymentStatus)}
            </div>

            {billingInfo.paymentStatus === 'overdue' && (
              <div className="overdue-warning">
                <h3>⚠️ Pagamento em Atraso</h3>
                <p>
                  Seu pagamento está em atraso há <strong>{billingInfo.overdueDays} dias</strong>
                </p>
                <p>
                  Valor em aberto: <strong>{formatPrice(billingInfo.amountDue)}</strong>
                </p>
                <p>
                  Vencimento: <strong>{formatDate(billingInfo.dueDate)}</strong>
                </p>
              </div>
            )}

            {billingInfo.paymentStatus === 'active' && (
              <div className="active-info">
                <h3>✅ Pagamento em Dia</h3>
                <p>Próxima cobrança: <strong>{formatDate(billingInfo.nextBillingDate)}</strong></p>
              </div>
            )}
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

          {billingInfo.paymentStatus === 'overdue' && (
            <div className="payment-actions">
              <button
                onClick={handleUpdatePayment}
                disabled={processing}
                className="btn btn-primary btn-pay"
              >
                {processing ? (
                  <>
                    <span className="loading-spinner"></span>
                    Processando...
                  </>
                ) : (
                  <>
                    💳 Atualizar Pagamento - {formatPrice(billingInfo.amountDue)}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Informações do Plano */}
        <div className="billing-card plan-card">
          <div className="card-header">
            <h2>📋 Plano Atual</h2>
          </div>

          <div className="plan-info">
            <div className="plan-details">
              <h3>{billingInfo.currentPlan.name}</h3>
              <p className="plan-price">
                {formatPrice(billingInfo.currentPlan.price)} por mês
              </p>
            </div>

            <div className="plan-actions">
              <button className="btn btn-secondary">
                📈 Fazer Upgrade
              </button>
              <button className="btn btn-text">
                ⚙️ Gerenciar Plano
              </button>
            </div>
          </div>
        </div>

        {/* Método de Pagamento */}
        <div className="billing-card payment-method-card">
          <div className="card-header">
            <h2>💳 Método de Pagamento</h2>
          </div>

          <div className="payment-method-info">
            {billingInfo.paymentMethod ? (
              <div className="method-details">
                <div className="card-info">
                  <span className="card-icon">💳</span>
                  <div className="card-details">
                    <p>**** **** **** {billingInfo.paymentMethod.last4}</p>
                    <p className="card-brand">{billingInfo.paymentMethod.brand.toUpperCase()}</p>
                  </div>
                </div>
                <button className="btn btn-secondary">
                  ✏️ Atualizar
                </button>
              </div>
            ) : (
              <div className="no-method">
                <p>Nenhum método de pagamento cadastrado</p>
                <button className="btn btn-primary">
                  ➕ Adicionar Cartão
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Histórico de Pagamentos */}
        <div className="billing-card history-card">
          <div className="card-header">
            <h2>📜 Histórico de Pagamentos</h2>
          </div>

          <div className="payment-history">
            {paymentHistory.length > 0 ? (
              <div className="history-list">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="history-item">
                    <div className="payment-info">
                      <div className="payment-details">
                        <h4>{payment.description}</h4>
                        <p className="payment-date">{formatDate(payment.date)}</p>
                      </div>
                      <div className="payment-amount">
                        <span className="amount">{formatPrice(payment.amount)}</span>
                        <span className={`status ${getStatusColor(payment.status)}`}>
                          {getStatusIcon(payment.status)} {getStatusText(payment.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-history">
                <p>Nenhum histórico de pagamentos encontrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="billing-footer">
        {onCancel && (
          <button onClick={onCancel} className="btn btn-text">
            ← Voltar ao Dashboard
          </button>
        )}

        <div className="support-info">
          <p>Precisa de ajuda? <a href="mailto:suporte@financas.com">Entre em contato</a></p>
        </div>
      </div>

      <style jsx>{`
        .billing-container {
          min-height: 100vh;
          background: var(--bg-secondary);
          padding: 2rem;
        }

        .billing-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .billing-header h1 {
          color: var(--text-primary);
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .billing-header p {
          color: var(--text-secondary);
          font-size: 1.125rem;
        }

        .billing-content {
          max-width: 1000px;
          margin: 0 auto;
          display: grid;
          gap: 2rem;
        }

        .billing-card {
          background: var(--bg-primary);
          border-radius: var(--radius-xl);
          padding: 2rem;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border-color);
        }

        .card-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .card-header h2 {
          color: var(--text-primary);
          font-size: 1.5rem;
          margin: 0;
        }

        .status-info {
          text-align: center;
          margin-bottom: 2rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          border-radius: var(--radius-full);
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }

        .status-badge.success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success-color);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-badge.danger {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger-color);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .status-badge.warning {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning-color);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .overdue-warning {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          text-align: left;
        }

        .overdue-warning h3 {
          color: var(--danger-color);
          margin-bottom: 1rem;
        }

        .overdue-warning p {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .active-info {
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          text-align: left;
        }

        .active-info h3 {
          color: var(--success-color);
          margin-bottom: 1rem;
        }

        .active-info p {
          color: var(--text-primary);
          margin: 0;
        }

        .payment-actions {
          margin-top: 2rem;
          text-align: center;
        }

        .btn-pay {
          min-width: 300px;
          min-height: 56px;
          font-size: 1.125rem;
        }

        .plan-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        .plan-details h3 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .plan-price {
          color: var(--text-secondary);
          font-size: 1.125rem;
          font-weight: 600;
        }

        .plan-actions {
          display: flex;
          gap: 1rem;
        }

        .payment-method-info .method-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .card-icon {
          font-size: 2rem;
        }

        .card-details p {
          margin: 0;
          color: var(--text-primary);
        }

        .card-brand {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .no-method {
          text-align: center;
          padding: 1rem;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .history-item {
          padding: 1rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          background: var(--bg-secondary);
        }

        .payment-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .payment-details h4 {
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .payment-date {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin: 0;
        }

        .payment-amount {
          text-align: right;
        }

        .amount {
          display: block;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .status {
          font-size: 0.875rem;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-weight: 500;
        }

        .status.success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success-color);
        }

        .status.danger {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger-color);
        }

        .status.warning {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning-color);
        }

        .no-history {
          text-align: center;
          padding: 2rem;
          color: var(--text-secondary);
        }

        .billing-footer {
          max-width: 1000px;
          margin: 2rem auto 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .support-info a {
          color: var(--primary-color);
          text-decoration: none;
        }

        .support-info a:hover {
          text-decoration: underline;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-lg);
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          border: none;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
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

        .btn-text {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid transparent;
        }

        .btn-text:hover {
          color: var(--text-primary);
          background: var(--bg-secondary);
        }

        .alert {
          padding: 1rem 1.5rem;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1rem 0;
        }

        .alert-danger {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--danger-color);
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--success-color);
        }

        .loading-container,
        .error-container {
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

        @media (max-width: 768px) {
          .billing-container {
            padding: 1rem;
          }

          .billing-header h1 {
            font-size: 2rem;
          }

          .plan-info {
            flex-direction: column;
            align-items: flex-start;
          }

          .plan-actions {
            width: 100%;
            justify-content: stretch;
          }

          .plan-actions .btn {
            flex: 1;
          }

          .payment-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .payment-amount {
            text-align: left;
            width: 100%;
          }

          .billing-footer {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default BillingPage; 