const express = require('express');
const router = express.Router();
const StripeService = require('../services/StripeService');
const { authenticateToken } = require('./auth');
const { checkSubscriptionStatus } = require('../middleware/subscription');
const logger = require('../config/logger');

// POST - Criar sessão de checkout
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { priceId } = req.body;
    const user = req.user;

    // Verificar se usuário já tem subscription ativa
    const subscriptionStatus = await StripeService.checkSubscriptionStatus(user.id);
    
    if (subscriptionStatus.hasActive) {
      return res.status(400).json({
        error: 'Usuário já possui uma assinatura ativa',
        subscription: subscriptionStatus
      });
    }

    const session = await StripeService.createCheckoutSession(user, priceId);
    
    res.json({
      message: 'Sessão de checkout criada com sucesso',
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    logger.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({
      error: 'Erro ao criar sessão de pagamento',
      details: error.message
    });
  }
});

// POST - Criar portal do cliente
router.post('/create-customer-portal', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    const session = await StripeService.createCustomerPortal(user);
    
    res.json({
      message: 'Portal do cliente criado com sucesso',
      url: session.url
    });

  } catch (error) {
    logger.error('Erro ao criar portal do cliente:', error);
    res.status(500).json({
      error: 'Erro ao acessar portal de cobrança',
      details: error.message
    });
  }
});

// GET - Verificar status da subscription
router.get('/subscription-status', authenticateToken, checkSubscriptionStatus, async (req, res) => {
  try {
    const subscriptionStatus = req.subscription;
    
    res.json({
      message: 'Status da subscription obtido com sucesso',
      subscription: subscriptionStatus,
      hasActive: subscriptionStatus.hasActive,
      status: subscriptionStatus.status
    });

  } catch (error) {
    logger.error('Erro ao obter status da subscription:', error);
    res.status(500).json({
      error: 'Erro ao verificar status da assinatura'
    });
  }
});

// GET - Histórico de pagamentos
router.get('/payment-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = require('../database');

    const payments = await query(`
      SELECT 
        id,
        stripe_payment_intent_id,
        stripe_invoice_id,
        amount,
        currency,
        status,
        payment_method,
        description,
        created_at
      FROM payment_history 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);

    res.json({
      message: 'Histórico de pagamentos obtido com sucesso',
      payments
    });

  } catch (error) {
    logger.error('Erro ao obter histórico de pagamentos:', error);
    res.status(500).json({
      error: 'Erro ao obter histórico de pagamentos'
    });
  }
});

// POST - Webhook do Stripe
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verificar assinatura do webhook (se configurado)
    if (endpointSecret) {
      const stripe = require('stripe')(process.env.STRIPE_BACKEND);
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      // Para desenvolvimento, aceitar sem verificação
      event = JSON.parse(req.body);
      logger.warn('Webhook sem verificação de assinatura (desenvolvimento)');
    }

    logger.info(`Webhook recebido: ${event.type}`);

    // Processar evento
    await StripeService.processWebhookEvent(event);

    res.json({ received: true });

  } catch (error) {
    logger.error('Erro no webhook:', error);
    res.status(400).json({
      error: 'Erro no webhook',
      details: error.message
    });
  }
});

// GET - Informações do produto
router.get('/product-info', async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_BACKEND);
    const productId = 'prod_Stlma15LeExwdw';

    // Buscar produto
    const product = await stripe.products.retrieve(productId);
    
    // Buscar preços do produto
    const prices = await stripe.prices.list({
      product: productId,
      active: true
    });

    res.json({
      message: 'Informações do produto obtidas com sucesso',
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
        features: product.features
      },
      prices: prices.data.map(price => ({
        id: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        interval_count: price.recurring?.interval_count
      }))
    });

  } catch (error) {
    logger.error('Erro ao obter informações do produto:', error);
    res.status(500).json({
      error: 'Erro ao obter informações do produto'
    });
  }
});

// POST - Cancelar subscription
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = require('../database');

    // Buscar subscription do usuário
    const subscription = await query(
      'SELECT stripe_subscription_id FROM user_subscriptions WHERE user_id = ? AND status = "active" LIMIT 1',
      [userId]
    );

    if (subscription.length === 0) {
      return res.status(404).json({
        error: 'Nenhuma assinatura ativa encontrada'
      });
    }

    const stripe = require('stripe')(process.env.STRIPE_BACKEND);
    
    // Cancelar no final do período atual
    const canceledSubscription = await stripe.subscriptions.update(
      subscription[0].stripe_subscription_id,
      {
        cancel_at_period_end: true
      }
    );

    res.json({
      message: 'Assinatura será cancelada no final do período atual',
      subscription: {
        id: canceledSubscription.id,
        cancel_at_period_end: canceledSubscription.cancel_at_period_end,
        current_period_end: new Date(canceledSubscription.current_period_end * 1000)
      }
    });

  } catch (error) {
    logger.error('Erro ao cancelar subscription:', error);
    res.status(500).json({
      error: 'Erro ao cancelar assinatura',
      details: error.message
    });
  }
});

module.exports = router; 