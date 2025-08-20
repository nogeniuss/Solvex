import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o state para mostrar a UI de fallback
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Captura detalhes do erro
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId: errorId
    });

    // Log do erro (em produção, enviar para serviço de monitoramento)
    console.error('Error Boundary capturou um erro:', error);
    console.error('Error Info:', errorInfo);

    // Opcional: Enviar erro para serviço de monitoramento
    this.logErrorToService(error, errorInfo, errorId);
  }

  logErrorToService = async (error, errorInfo, errorId) => {
    try {
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          errorId,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (logError) {
      console.error('Falha ao registrar erro:', logError);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null, 
      errorId: null 
    });
  };

  render() {
    if (this.state.hasError) {
      // UI de fallback personalizada
      return (
        <div className="error-boundary">
          <div className="error-boundary-container">
            <div className="error-boundary-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            
            <h2>Oops! Algo deu errado</h2>
            <p>Ocorreu um erro inesperado na aplicação.</p>
            
            {this.state.errorId && (
              <div className="error-boundary-id">
                <small>ID do erro: {this.state.errorId}</small>
              </div>
            )}

            <div className="error-boundary-actions">
              <button 
                onClick={this.handleRetry}
                className="btn-primary"
              >
                Tentar Novamente
              </button>
              
              <button 
                onClick={this.handleReload}
                className="btn-secondary"
              >
                Recarregar Página
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-boundary-details">
                <summary>Detalhes do erro (modo desenvolvimento)</summary>
                <pre className="error-boundary-stack">
                  {this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 