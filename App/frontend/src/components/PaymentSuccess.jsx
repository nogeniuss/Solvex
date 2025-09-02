import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './PaymentSuccess.css';

const PaymentSuccess = ({ onPaymentSuccess }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const processPaymentSuccess = async () => {
      try {
        const paymentStatus = searchParams.get('payment');
        const sessionId = searchParams.get('session_id');

        if (paymentStatus === 'success') {
          console.log('Processando pagamento bem-sucedido...');
          
          // Chamar API para confirmar pagamento
          const response = await fetch('/api/stripe/confirm-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              session_id: sessionId || 'manual_confirmation',
              payment_status: 'success',
              email: localStorage.getItem('userEmail') || 'test@example.com' // Fallback
            })
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Pagamento confirmado:', data);
            
            // Atualizar estado do usuário
            if (onPaymentSuccess) {
              onPaymentSuccess();
            }
            
            // Redirecionar para login
            navigate('/login', { replace: true });
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao confirmar pagamento');
          }
        } else {
          // Se não há parâmetros de pagamento, apenas redirecionar
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Erro ao processar pagamento:', err);
        setError(err.message);
        // Mesmo com erro, redirecionar para login
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    processPaymentSuccess();
  }, [searchParams, navigate, onPaymentSuccess]);

  if (loading) {
    return (
      <div className="payment-success-container">
        <div className="payment-success-card">
          <div className="loading-spinner">⏳</div>
          <h2>Processando pagamento...</h2>
          <p>Aguarde enquanto confirmamos seu pagamento.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-success-container">
        <div className="payment-success-card">
          <div className="error-icon">❌</div>
          <h2>Erro no pagamento</h2>
          <p>{error}</p>
          <p>Redirecionando para o dashboard...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default PaymentSuccess; 