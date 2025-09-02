import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation, useNavigate } from 'react-router-dom';
import './PaymentPage.css';

const STRIPE_PUBLIC_KEY = 'pk_test_51PsXhrGhjpYUfyObXra74Y0C3QnLlb0VShey2PAw8SzieNsjgqhUk1FAZAtmfKSHXurXPvoBozIFxf7kL27jp1Yt00OXBw0l5L';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stripeInstance, setStripeInstance] = useState(null);

  useEffect(() => {
    const initializeStripe = async () => {
      const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
      setStripeInstance(stripe);
    };

    initializeStripe();
  }, []);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId: 'basic',
          email: location.state?.email,
          userId: location.state?.userId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao criar sessão de pagamento');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error('Erro no pagamento:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <div className="payment-card">
        <h1>Plano Básico</h1>
        <div className="price">R$ 29,90/mês</div>
        <ul className="features">
          <li>✓ Controle de despesas</li>
          <li>✓ Controle de receitas</li>
          <li>✓ Relatórios básicos</li>
          <li>✓ Suporte por email</li>
        </ul>
        <button 
          onClick={handlePayment}
          disabled={loading || !stripeInstance}
          className="payment-button"
        >
          {loading ? 'Processando...' : 'Pagar Agora'}
        </button>
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default PaymentPage; 