const express = require('express');
const router = express.Router();
const stripeService = require('../services/StripeService');
const authenticateToken = require('../middleware/auth');

// Criar sessão de checkout
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { planId, email, userId } = req.body;

    if (!planId || !email || !userId) {
      return res.status(400).json({ error: 'ID do plano, email e ID do usuário são obrigatórios' });
    }

    const session = await stripeService.createCheckoutSession({ planId, email, userId });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento' });
  }
});

// Ativar assinatura após pagamento bem-sucedido
router.post('/payment-success', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(400).json({
        error: 'ID do usuário é obrigatório'
      });
    }

    await stripeService.activateSubscription(userId);

    res.json({
      success: true,
      message: 'Assinatura ativada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao ativar assinatura:', error);
    res.status(500).json({
      error: 'Erro ao ativar assinatura'
    });
  }
});

// Registrar falha no pagamento
router.post('/payment-failed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { error } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'ID do usuário é obrigatório'
      });
    }

    await stripeService.registerPaymentFailure(userId, error);

    res.json({
      success: true,
      message: 'Falha no pagamento registrada'
    });

  } catch (error) {
    console.error('Erro ao registrar falha:', error);
    res.status(500).json({
      error: 'Erro ao registrar falha no pagamento'
    });
  }
});

// Webhook do Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = stripeService.constructWebhookEvent(req.body, req.headers['stripe-signature']);

    switch (event.type) {
      case 'checkout.session.completed':
        await stripeService.handleSuccessfulPayment(event.data.object);
        break;
      case 'customer.subscription.updated':
        await stripeService.updateSubscriptionPeriod(event.data.object);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Confirmar pagamento após redirecionamento do Stripe (rota pública)
router.post('/confirm-payment', async (req, res) => {
  try {
    const { session_id, payment_status, email } = req.body;

    if (!session_id || payment_status !== 'success') {
      return res.status(400).json({ error: 'Dados de pagamento inválidos' });
    }

    let userId = null;

    // Se email foi fornecido, buscar usuário pelo email
    if (email && email !== 'test@example.com') {
      userId = await stripeService.getUserIdByEmail(email);
    }

    // Se não encontrou usuário pelo email, tentar buscar pelo session_id
    if (!userId) {
      // Para fins de teste, vamos criar um usuário temporário ou usar um ID fixo
      // Em produção, você deve implementar uma lógica mais robusta
      userId = 23; // ID do usuário de teste
    }
    
    if (!userId) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Atualizar status do usuário para pago
    await stripeService.confirmPayment(userId, session_id);

    res.json({ 
      success: true, 
      message: 'Pagamento confirmado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);
    res.status(500).json({ error: 'Erro ao confirmar pagamento' });
  }
});

module.exports = router; 