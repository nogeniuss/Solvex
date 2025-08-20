import React from 'react';

class PaymentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('PaymentPage Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="payment-error-container">
          <div className="payment-error-card">
            <div className="error-icon">⚠️</div>
            <h2>Erro ao carregar página de pagamento</h2>
            <p>Ocorreu um problema técnico. Tente novamente.</p>
            
            <div className="error-details">
              <p><strong>Detalhes:</strong> {this.state.error?.message}</p>
            </div>

            <div className="error-actions">
              <button 
                onClick={() => this.setState({ hasError: false, error: null })}
                className="btn btn-primary"
              >
                🔄 Tentar Novamente
              </button>
              
              {this.props.onCancel && (
                <button 
                  onClick={this.props.onCancel}
                  className="btn btn-secondary"
                >
                  ← Voltar
                </button>
              )}
            </div>
          </div>

          <style jsx>{`
            .payment-error-container {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2rem;
              background: linear-gradient(135deg, var(--danger-color) 0%, var(--warning-color) 100%);
            }

            .payment-error-card {
              background: var(--bg-primary);
              border-radius: var(--radius-2xl);
              box-shadow: var(--shadow-2xl);
              padding: 3rem 2rem;
              max-width: 500px;
              text-align: center;
              border: 1px solid var(--border-color);
            }

            .error-icon {
              font-size: 4rem;
              margin-bottom: 1.5rem;
              display: block;
            }

            .payment-error-card h2 {
              color: var(--text-primary);
              margin-bottom: 1rem;
              font-size: 1.5rem;
            }

            .payment-error-card p {
              color: var(--text-secondary);
              margin-bottom: 1.5rem;
              line-height: 1.6;
            }

            .error-details {
              background: var(--bg-secondary);
              border: 1px solid var(--border-color);
              border-radius: var(--radius-md);
              padding: 1rem;
              margin-bottom: 2rem;
              text-align: left;
            }

            .error-details p {
              margin: 0;
              font-size: 0.875rem;
              font-family: monospace;
              color: var(--text-primary);
            }

            .error-actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              flex-wrap: wrap;
            }

            .btn {
              padding: 0.75rem 1.5rem;
              border-radius: var(--radius-md);
              font-weight: 600;
              cursor: pointer;
              transition: var(--transition);
              border: none;
              font-size: 0.875rem;
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

            @media (max-width: 480px) {
              .payment-error-container {
                padding: 1rem;
              }
              
              .payment-error-card {
                padding: 2rem 1.5rem;
              }
              
              .error-actions {
                flex-direction: column;
              }
              
              .btn {
                width: 100%;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PaymentErrorBoundary; 