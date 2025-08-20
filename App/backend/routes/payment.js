const express = require('express');
const router = express.Router();
const PaymentService = require('../services/PaymentService');
const { authenticateToken } = require('./auth');
const logger = require('../config/logger');

// POST - Simular pagamento bem-sucedido (para desenvolvimento)
router.post('/simulate-success', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await PaymentService.simulatePaymentSuccess(userId);
    
    res.json({
      success: true,
      message: 'Pagamento simulado com sucesso',
      user: {
        ...req.user,
        subscription_status: 'active'
      }
    });

  } catch (error) {
    logger.error('Erro ao simular pagamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar pagamento'
    });
  }
});

// POST - Marcar usuário como pago
router.post('/mark-paid', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await PaymentService.markUserAsPaid(userId);
    
    res.json({
      success: true,
      message: 'Usuário marcado como pago com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao marcar usuário como pago:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar status de pagamento'
    });
  }
});

// GET - Verificar status de pagamento
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const isPaid = await PaymentService.isUserPaid(userId);
    
    res.json({
      success: true,
      isPaid,
      message: isPaid ? 'Usuário com pagamento em dia' : 'Usuário sem pagamento ativo'
    });

  } catch (error) {
    logger.error('Erro ao verificar status de pagamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar status de pagamento'
    });
  }
});

// GET - Buscar informações detalhadas de cobrança
router.get('/billing-info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = require('../database');
    
    // Buscar informações completas do usuário, subscription e plano
    const userInfo = await query(`
      SELECT 
        u.subscription_status,
        u.subscription_ends_at,
        us.current_period_start,
        us.current_period_end,
        us.status as subscription_status_detail,
        COALESCE(us.plan_id, 'basic') as plan_id,
        COALESCE(sp.nome, 'Plano Básico') as plan_name,
        COALESCE(sp.valor, 20.00) as plan_price,
        COALESCE(sp.moeda, 'BRL') as plan_currency,
        COALESCE(sp.periodo, 'month') as billing_interval
      FROM users u
      LEFT JOIN user_subscriptions us ON u.id = us.user_id
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE u.id = ?
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [userId]);

    if (userInfo.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    const user = userInfo[0];
    const now = new Date();
    const subscriptionEnd = user.subscription_ends_at ? new Date(user.subscription_ends_at) : null;
    
    // Determinar status de pagamento
    let paymentStatus = 'active';
    let overdueDays = 0;
    let amountDue = 0;
    
    if (user.subscription_status === 'incomplete' || !user.subscription_status) {
      paymentStatus = 'incomplete';
      amountDue = user.plan_price || 20.00;
    } else if (subscriptionEnd && subscriptionEnd < now) {
      paymentStatus = 'overdue';
      overdueDays = Math.floor((now - subscriptionEnd) / (1000 * 60 * 60 * 24));
      amountDue = user.plan_price || 20.00;
    } else if (user.subscription_status === 'canceled') {
      paymentStatus = 'canceled';
    }

    // Buscar histórico de pagamentos
    const paymentHistory = await query(`
      SELECT 
        id,
        amount,
        currency,
        status,
        description,
        created_at
      FROM payment_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    // Calcular próxima data de cobrança
    let nextBillingDate = null;
    if (user.current_period_end) {
      nextBillingDate = new Date(user.current_period_end);
    } else if (paymentStatus === 'active') {
      nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    res.json({
      success: true,
      billingInfo: {
        paymentStatus,
        overdueDays,
        amountDue,
        subscriptionEndsAt: subscriptionEnd,
        currentPeriodStart: user.current_period_start,
        currentPeriodEnd: user.current_period_end,
        nextBillingDate,
        subscriptionStatus: user.subscription_status,
        currentPlan: {
          planId: user.plan_id || 'basic',
          name: user.plan_name || 'Plano Básico',
          price: user.plan_price || 20.00,
          currency: user.plan_currency || 'BRL',
          billingCycle: user.billing_interval || 'month'
        }
      },
      paymentHistory: paymentHistory.map(payment => ({
        id: payment.id,
        date: payment.created_at,
        amount: payment.amount,
        currency: payment.currency || 'BRL',
        status: payment.status,
        description: payment.description
      }))
    });

  } catch (error) {
    logger.error('Erro ao buscar informações de cobrança:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar informações de cobrança'
    });
  }
});

// GET - Verificar se usuário precisa de cobrança no login
router.get('/check-login-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = require('../database');
    
    // Buscar status de subscription do usuário
    const userInfo = await query(`
      SELECT 
        subscription_status,
        subscription_ends_at
      FROM users 
      WHERE id = ?
    `, [userId]);

    if (userInfo.length === 0) {
      return res.json({
        success: true,
        requiresBilling: false,
        isNewUser: false
      });
    }

    const user = userInfo[0];
    const now = new Date();
    const subscriptionEnd = user.subscription_ends_at ? new Date(user.subscription_ends_at) : null;
    
    // Verificar se precisa ir para tela de cobrança
    let requiresBilling = false;
    let reason = '';
    
    if (!user.subscription_status || user.subscription_status === 'incomplete') {
      requiresBilling = true;
      reason = 'subscription_incomplete';
    } else if (subscriptionEnd && subscriptionEnd < now) {
      requiresBilling = true;
      reason = 'subscription_expired';
    } else if (user.subscription_status === 'past_due') {
      requiresBilling = true;
      reason = 'payment_overdue';
    }

    res.json({
      success: true,
      requiresBilling,
      reason,
      subscriptionStatus: user.subscription_status,
      subscriptionEndsAt: subscriptionEnd
    });

  } catch (error) {
    logger.error('Erro ao verificar status de login:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar status'
    });
  }
});

module.exports = router; 