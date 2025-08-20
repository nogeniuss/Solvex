const express = require('express');
const router = express.Router();
const { query } = require('../database');
const { authenticateToken } = require('./auth');
const logger = require('../config/logger');

// GET - Listar todos os planos ativos
router.get('/', async (req, res) => {
  try {
    const plans = await query(`
      SELECT 
        id as plan_id,
        nome as name,
        descricao as description,
        valor as price,
        moeda as currency,
        periodo as billing_interval,
        1 as interval_count,
        features,
        false as is_popular,
        ativo as is_active
      FROM subscription_plans 
      WHERE ativo = TRUE
      ORDER BY valor ASC
    `);

    // Processar features JSON
    const processedPlans = plans.map(plan => ({
      ...plan,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features
    }));

    res.json({
      success: true,
      plans: processedPlans
    });

  } catch (error) {
    logger.error('Erro ao buscar planos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar planos'
    });
  }
});

// GET - Buscar plano específico
router.get('/:planId', async (req, res) => {
  try {
    const { planId } = req.params;

    const plan = await query(`
      SELECT 
        id as plan_id,
        nome as name,
        descricao as description,
        valor as price,
        moeda as currency,
        periodo as billing_interval,
        1 as interval_count,
        features,
        false as is_popular,
        ativo as is_active,
        stripe_price_id,
        '' as stripe_product_id
      FROM subscription_plans 
      WHERE id = ? AND ativo = TRUE
    `, [planId]);

    if (plan.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Plano não encontrado'
      });
    }

    const processedPlan = {
      ...plan[0],
      features: typeof plan[0].features === 'string' ? JSON.parse(plan[0].features) : plan[0].features
    };

    res.json({
      success: true,
      plan: processedPlan
    });

  } catch (error) {
    logger.error('Erro ao buscar plano:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar plano'
    });
  }
});

// GET - Buscar plano atual do usuário
router.get('/user/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar subscription atual do usuário
    const userSubscription = await query(`
      SELECT 
        COALESCE(us.plan_id, 'basic') as plan_id,
        COALESCE(us.status, 'incomplete') as status,
        us.current_period_start,
        us.current_period_end,
        COALESCE(sp.nome, 'Plano Básico') as name,
        COALESCE(sp.valor, 20.00) as price,
        COALESCE(sp.moeda, 'BRL') as currency,
        COALESCE(sp.periodo, 'month') as billing_interval,
        sp.features
      FROM user_subscriptions us
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ?
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [userId]);

    if (userSubscription.length === 0) {
      // Usuário sem subscription, retornar plano básico
      const basicPlan = await query(`
        SELECT 
          id as plan_id,
          nome as name,
          valor as price,
          moeda as currency,
          periodo as billing_interval,
          features
        FROM subscription_plans 
        WHERE id = 'basic'
        LIMIT 1
      `);

      return res.json({
        success: true,
        currentPlan: basicPlan.length > 0 ? {
          ...basicPlan[0],
          features: typeof basicPlan[0].features === 'string' ? JSON.parse(basicPlan[0].features) : basicPlan[0].features,
          status: 'incomplete'
        } : null
      });
    }

    const currentPlan = {
      ...userSubscription[0],
      features: typeof userSubscription[0].features === 'string' ? JSON.parse(userSubscription[0].features) : userSubscription[0].features
    };

    res.json({
      success: true,
      currentPlan
    });

  } catch (error) {
    logger.error('Erro ao buscar plano atual do usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar plano atual'
    });
  }
});

// POST - Fazer upgrade de plano
router.post('/upgrade', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'ID do plano é obrigatório'
      });
    }

    // Verificar se o plano existe
    const targetPlan = await query(`
      SELECT id, id as plan_id, nome as name, valor as price
      FROM subscription_plans 
      WHERE id = ? AND ativo = TRUE
    `, [planId]);

    if (targetPlan.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Plano não encontrado'
      });
    }

    // Verificar plano atual do usuário
    const currentSubscription = await query(`
      SELECT id, plan_id, status
      FROM user_subscriptions 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    if (currentSubscription.length > 0 && currentSubscription[0].plan_id === planId) {
      return res.status(400).json({
        success: false,
        error: 'Usuário já possui este plano'
      });
    }

    // Atualizar ou criar subscription
    if (currentSubscription.length > 0) {
      // Atualizar subscription existente
      await query(`
        UPDATE user_subscriptions 
        SET plan_id = ?, updated_at = NOW()
        WHERE id = ?
      `, [planId, currentSubscription[0].id]);
    } else {
      // Criar nova subscription
      await query(`
        INSERT INTO user_subscriptions (user_id, plan_id, status, created_at, updated_at)
        VALUES (?, ?, 'active', NOW(), NOW())
      `, [userId, planId]);
    }

    res.json({
      success: true,
      message: `Upgrade para ${targetPlan[0].name} realizado com sucesso`,
      newPlan: targetPlan[0]
    });

  } catch (error) {
    logger.error('Erro ao fazer upgrade:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar upgrade'
    });
  }
});

module.exports = router; 