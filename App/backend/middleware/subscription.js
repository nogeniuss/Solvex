const db = require('../database');
const logger = require('../config/logger');

/**
 * Middleware para verificar status de assinatura do usuário
 */
const requireActiveSubscription = (requiredPlan = null) => {
  return async (req, res, next) => {
    let connection;
    try {
      const userId = req.user.id;
      
      connection = await db.getConnection();
      
      // Buscar status da assinatura do usuário
      const [subscriptions] = await connection.query(`
        SELECT 
          us.id,
          us.plan_id,
          us.status,
          us.current_period_start,
          us.current_period_end,
          us.trial_start,
          us.trial_end,
          sp.nome as plan_name,
          sp.features,
          u.subscription_status
        FROM user_subscriptions us
        LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
        LEFT JOIN users u ON us.user_id = u.id
        WHERE us.user_id = ?
        ORDER BY us.created_at DESC
        LIMIT 1
      `, [userId]);

      // Se não tem subscription, verificar se está em trial
      if (subscriptions.length === 0) {
        return res.status(403).json({
          error: 'Assinatura requerida',
          message: 'Esta funcionalidade requer uma assinatura ativa.',
          requiresUpgrade: true,
          redirectTo: '/upgrade'
        });
      }

      const userSubscription = subscriptions[0];
      const now = new Date();

      // Verificar se a assinatura está ativa
      const isActive = userSubscription.status === 'active';
      const isTrialing = userSubscription.status === 'trialing';
      const isPastDue = userSubscription.status === 'past_due';

      // Verificar período trial
      let inTrialPeriod = false;
      if (userSubscription.trial_start && userSubscription.trial_end) {
        const trialStart = new Date(userSubscription.trial_start);
        const trialEnd = new Date(userSubscription.trial_end);
        inTrialPeriod = now >= trialStart && now <= trialEnd;
      }

      // Verificar período de assinatura
      let inSubscriptionPeriod = false;
      if (userSubscription.current_period_start && userSubscription.current_period_end) {
        const periodStart = new Date(userSubscription.current_period_start);
        const periodEnd = new Date(userSubscription.current_period_end);
        inSubscriptionPeriod = now >= periodStart && now <= periodEnd;
      }

      // Determinar se o usuário tem acesso
      const hasAccess = isActive && (inTrialPeriod || inSubscriptionPeriod);
      const hasTrialAccess = isTrialing && inTrialPeriod;

      if (!hasAccess && !hasTrialAccess) {
        let message = 'Sua assinatura expirou.';
        let redirectTo = '/billing';

        if (isPastDue) {
          message = 'Seu pagamento está em atraso.';
        } else if (userSubscription.status === 'canceled') {
          message = 'Sua assinatura foi cancelada.';
          redirectTo = '/upgrade';
        } else if (userSubscription.status === 'incomplete') {
          message = 'Complete sua assinatura para acessar esta funcionalidade.';
          redirectTo = '/upgrade';
        }

        return res.status(403).json({
          error: 'Assinatura inativa',
          message,
          requiresUpgrade: true,
          redirectTo,
          subscription: {
            status: userSubscription.status,
            plan: userSubscription.plan_name,
            expiresAt: userSubscription.current_period_end
          }
        });
      }

      // Verificar plano específico se requerido
      if (requiredPlan && userSubscription.plan_id !== requiredPlan) {
        const planHierarchy = { basic: 1, premium: 2, professional: 3 };
        const userPlanLevel = planHierarchy[userSubscription.plan_id] || 0;
        const requiredPlanLevel = planHierarchy[requiredPlan] || 0;

        if (userPlanLevel < requiredPlanLevel) {
          return res.status(403).json({
            error: 'Plano insuficiente',
            message: `Esta funcionalidade requer o plano ${requiredPlan} ou superior.`,
            requiresUpgrade: true,
            redirectTo: '/upgrade',
            currentPlan: userSubscription.plan_id,
            requiredPlan
          });
        }
      }

      // Adicionar informações da subscription ao request
      req.subscription = {
        id: userSubscription.id,
        planId: userSubscription.plan_id,
        planName: userSubscription.plan_name,
        status: userSubscription.status,
        features: userSubscription.features,
        isTrialing: hasTrialAccess,
        expiresAt: userSubscription.current_period_end
      };

      // Log da verificação
      logger.info(`Subscription verified for user ${userId}: ${userSubscription.plan_id} (${userSubscription.status})`);

      next();

    } catch (error) {
      logger.error('Erro na verificação de subscription:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Erro ao verificar status da assinatura'
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  };
};

/**
 * Middleware para verificar status de subscription sem bloquear
 */
const checkSubscriptionStatus = async (req, res, next) => {
  let connection;
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      req.subscriptionInfo = null;
      return next();
    }

    connection = await db.getConnection();
    const [subscriptions] = await connection.query(`
      SELECT 
        us.plan_id,
        us.status,
        us.current_period_end,
        sp.nome as plan_name
      FROM user_subscriptions us
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ?
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [userId]);

    if (subscriptions.length > 0) {
      const sub = subscriptions[0];
      const now = new Date();
      const expiresAt = sub.current_period_end ? new Date(sub.current_period_end) : null;
      
      req.subscriptionInfo = {
        planId: sub.plan_id,
        planName: sub.plan_name,
        status: sub.status,
        isActive: sub.status === 'active' && (!expiresAt || now < expiresAt),
        expiresAt: expiresAt
      };
    } else {
      req.subscriptionInfo = {
        planId: null,
        planName: null,
        status: 'none',
        isActive: false,
        expiresAt: null
      };
    }

    next();

  } catch (error) {
    logger.error('Erro ao verificar status de subscription:', error);
    req.subscriptionInfo = null;
    next();
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Middleware para permitir acesso durante trial
 */
const allowTrialAccess = (trialDays = 7) => {
  return async (req, res, next) => {
    let connection;
    try {
      const userId = req.user.id;
      
      // Verificar se usuário foi criado recentemente (dentro do período trial)
      connection = await db.getConnection();
      const [user] = await connection.query(`
        SELECT created_date, subscription_status 
        FROM users 
        WHERE id = ?
      `, [userId]);

      if (user.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const userCreated = new Date(user[0].created_date);
      const now = new Date();
      const daysDiff = Math.floor((now - userCreated) / (1000 * 60 * 60 * 24));

      // Se está dentro do período trial, permitir acesso
      if (daysDiff <= trialDays && user[0].subscription_status !== 'active') {
        req.trialAccess = {
          isTrialing: true,
          daysRemaining: trialDays - daysDiff,
          trialEndsAt: new Date(userCreated.getTime() + (trialDays * 24 * 60 * 60 * 1000))
        };
        return next();
      }

      // Se trial expirou, usar verificação normal de subscription
      return requireActiveSubscription()(req, res, next);

    } catch (error) {
      logger.error('Erro na verificação de trial:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Erro ao verificar período trial'
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  };
};

/**
 * Middleware para features específicas por plano
 */
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    let connection;
    try {
      const userId = req.user.id;
      
      connection = await db.getConnection();
      const [subscription] = await connection.query(`
        SELECT sp.features, sp.id as plan_id
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ? AND us.status IN ('active', 'trialing')
        ORDER BY us.created_at DESC
        LIMIT 1
      `, [userId]);

      if (subscription.length === 0) {
        return res.status(403).json({
          error: 'Feature não disponível',
          message: `A funcionalidade "${featureName}" requer uma assinatura ativa.`,
          requiresUpgrade: true
        });
      }

      const features = JSON.parse(subscription[0].features || '[]');
      const hasFeature = features.some(feature => 
        feature.toLowerCase().includes(featureName.toLowerCase())
      );

      if (!hasFeature) {
        return res.status(403).json({
          error: 'Feature não disponível',
          message: `A funcionalidade "${featureName}" não está disponível no seu plano atual.`,
          requiresUpgrade: true,
          currentPlan: subscription[0].plan_id
        });
      }

      next();

    } catch (error) {
      logger.error('Erro na verificação de feature:', error);
      res.status(500).json({
        error: 'Erro interno',
        message: 'Erro ao verificar disponibilidade da funcionalidade'
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  };
};

/**
 * Middleware para verificar se o usuário tem pagamento ativo
 */
async function checkPaymentStatus(req, res, next) {
  let connection;
  try {
    // Rotas públicas que não precisam de verificação
    const publicRoutes = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/stripe/webhook',
      '/api/stripe/create-checkout-session',
      '/api/payment/status'
    ];

    // Não verificar rotas públicas
    if (publicRoutes.includes(req.path)) {
      return next();
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    connection = await db.getConnection();
    // Verificar status do pagamento
    const [rows] = await connection.query(`
      SELECT payment_status, subscription_status, subscription_ends_at
      FROM users
      WHERE id = ?
    `, [userId]);

    const user = rows[0];

    // Se não tem status de pagamento ou assinatura, não está autorizado
    if (!user || !user.payment_status || user.payment_status !== 'completed') {
      return res.status(403).json({ 
        error: 'Pagamento pendente',
        payment_required: true
      });
    }

    // Verificar se assinatura está ativa e não expirou
    if (!user.subscription_status || user.subscription_status !== 'active' || 
        (user.subscription_ends_at && new Date(user.subscription_ends_at) < new Date())) {
      return res.status(403).json({ 
        error: 'Assinatura expirada',
        subscription_expired: true
      });
    }

    next();
  } catch (error) {
    logger.error('Erro ao verificar status do pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  requireActiveSubscription,
  checkSubscriptionStatus,
  allowTrialAccess,
  requireFeature,
  checkPaymentStatus
}; 