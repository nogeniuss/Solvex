const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { authenticateToken } = require('./auth');
const { requireActiveSubscription, allowTrialAccess, requireFeature } = require('../middleware/subscription');

// GET - Dashboard principal de analytics (Trial limitado)
router.get('/dashboard', authenticateToken, allowTrialAccess(7), async (req, res) => {
  try {
    const { periodo, data_inicio, data_fim } = req.query;
    
    // Calcular datas baseado no período
    const { startDate, endDate } = calcularPeriodo(periodo, data_inicio, data_fim);
    
    const analyticsData = {
      overview: await calcularOverview(startDate, endDate),
      product: await calcularProductUsage(startDate, endDate),
      conversion: await calcularConversion(startDate, endDate),
      financial: await calcularFinancial(startDate, endDate),
      support: await calcularSupport(startDate, endDate)
    };
    
    res.json(analyticsData);
  } catch (error) {
    console.error('Erro ao calcular analytics:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Métricas de usuários ativos
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { periodo } = req.query;
    const { startDate, endDate } = calcularPeriodo(periodo);
    
    const usersData = {
      dau: await calcularDAU(startDate, endDate),
      wau: await calcularWAU(startDate, endDate),
      mau: await calcularMAU(startDate, endDate),
      retention: await calcularRetention(startDate, endDate)
    };
    
    res.json(usersData);
  } catch (error) {
    console.error('Erro ao calcular métricas de usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Feature adoption
router.get('/features', authenticateToken, async (req, res) => {
  try {
    const { periodo } = req.query;
    const { startDate, endDate } = calcularPeriodo(periodo);
    
    const featuresData = await calcularFeatureAdoption(startDate, endDate);
    res.json(featuresData);
  } catch (error) {
    console.error('Erro ao calcular feature adoption:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Funnel de conversão
router.get('/funnel', authenticateToken, async (req, res) => {
  try {
    const { periodo } = req.query;
    const { startDate, endDate } = calcularPeriodo(periodo);
    
    const funnelData = await calcularFunnel(startDate, endDate);
    res.json(funnelData);
  } catch (error) {
    console.error('Erro ao calcular funnel:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Métricas financeiras
router.get('/financial', authenticateToken, async (req, res) => {
  try {
    const { periodo } = req.query;
    const { startDate, endDate } = calcularPeriodo(periodo);
    
    const financialData = await calcularFinancial(startDate, endDate);
    res.json(financialData);
  } catch (error) {
    console.error('Erro ao calcular métricas financeiras:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Perfil do usuário com métricas
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const profileData = await calcularPerfilUsuario(userId);
    res.json(profileData);
  } catch (error) {
    console.error('Erro ao calcular perfil do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Alertas do usuário
router.get('/alerts/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const alerts = await buscarAlertasUsuario(userId);
    res.json({ alerts });
  } catch (error) {
    console.error('Erro ao buscar alertas do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para calcular período
function calcularPeriodo(periodo, dataInicio, dataFim) {
  const now = new Date();
  let startDate, endDate;
  
  switch (periodo) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case 'custom':
      startDate = new Date(dataInicio);
      endDate = new Date(dataFim);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
  }
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

// Função para calcular overview
async function calcularOverview(startDate, endDate) {
  // Usuários ativos
  const activeUsers = await query(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM user_sessions
    WHERE DATE(start_time) BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // MRR
  const mrr = await query(`
    SELECT COALESCE(SUM(mrr), 0) as total
    FROM financial_metrics
    WHERE metric_date BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // Churn rate
  const churnRate = await query(`
    SELECT AVG(churn_rate) as rate
    FROM financial_metrics
    WHERE metric_date BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // NPS
  const nps = await query(`
    SELECT AVG(score) as score
    FROM user_feedback
    WHERE feedback_type = 'nps'
    AND DATE(created_at) BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // Crescimento de usuários
  const userGrowth = await query(`
    SELECT 
      DATE(start_time) as date,
      COUNT(DISTINCT user_id) as users
    FROM user_sessions
    WHERE DATE(start_time) BETWEEN ? AND ?
    GROUP BY DATE(start_time)
    ORDER BY date
  `, [startDate, endDate]);
  
  // Crescimento de receita
  const revenueGrowth = await query(`
    SELECT 
      metric_date as date,
      SUM(mrr) as revenue
    FROM financial_metrics
    WHERE metric_date BETWEEN ? AND ?
    GROUP BY metric_date
    ORDER BY metric_date
  `, [startDate, endDate]);
  
  return {
    active_users: activeUsers[0]?.count || 0,
    active_users_variation: 5.2, // Mock - calcular variação real
    mrr: mrr[0]?.total || 0,
    mrr_variation: 12.5, // Mock
    churn_rate: churnRate[0]?.rate || 0,
    churn_variation: -2.1, // Mock
    nps: nps[0]?.score || 0,
    nps_variation: 3.4, // Mock
    user_growth: userGrowth,
    revenue_growth: revenueGrowth
  };
}

// Função para calcular product usage
async function calcularProductUsage(startDate, endDate) {
  // Tempo médio de sessão
  const avgSessionDuration = await query(`
    SELECT AVG(duration_seconds) as avg_duration
    FROM user_sessions
    WHERE DATE(start_time) BETWEEN ? AND ?
    AND duration_seconds IS NOT NULL
  `, [startDate, endDate]);
  
  // Eventos por sessão
  const eventsPerSession = await query(`
    SELECT AVG(event_count) as avg_events
    FROM (
      SELECT session_id, COUNT(*) as event_count
      FROM user_events
      WHERE DATE(timestamp) BETWEEN ? AND ?
      GROUP BY session_id
    ) as t
  `, [startDate, endDate]);
  
  // Feature adoption rate
  const featureAdoption = await query(`
    SELECT 
      COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(*) FROM users) as adoption_rate
    FROM feature_usage
    WHERE DATE(timestamp) BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // Barreiras encontradas
  const barriersCount = await query(`
    SELECT COUNT(*) as count
    FROM user_barriers
    WHERE DATE(timestamp) BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // Uso de funcionalidades
  const featureUsage = await query(`
    SELECT 
      feature_name,
      COUNT(DISTINCT user_id) as users,
      COUNT(*) as actions
    FROM feature_usage
    WHERE DATE(timestamp) BETWEEN ? AND ?
    GROUP BY feature_name
    ORDER BY users DESC
    LIMIT 10
  `, [startDate, endDate]);
  
  // Análise de sessões
  const sessionAnalysis = await query(`
    SELECT 
      duration_seconds,
      (
        SELECT COUNT(*)
        FROM user_events
        WHERE session_id = us.session_id
      ) as events_count
    FROM user_sessions us
    WHERE DATE(start_time) BETWEEN ? AND ?
    AND duration_seconds IS NOT NULL
    LIMIT 100
  `, [startDate, endDate]);
  
  return {
    avg_session_duration: avgSessionDuration[0]?.avg_duration || 0,
    events_per_session: eventsPerSession[0]?.avg_events || 0,
    feature_adoption_rate: featureAdoption[0]?.adoption_rate || 0,
    barriers_count: barriersCount[0]?.count || 0,
    feature_usage: featureUsage,
    session_analysis: sessionAnalysis
  };
}

// Função para calcular conversão
async function calcularConversion(startDate, endDate) {
  // Funnel de conversão
  const funnel = await query(`
    SELECT 
      step_name,
      step_order,
      COUNT(DISTINCT user_id) as users,
      COUNT(completed_at) as completed,
      ROUND(COUNT(completed_at) * 100.0 / COUNT(DISTINCT user_id), 2) as conversion_rate,
      COUNT(DISTINCT user_id) - COUNT(completed_at) as drop_off
    FROM conversion_funnel
    WHERE DATE(entered_at) BETWEEN ? AND ?
    GROUP BY step_name, step_order
    ORDER BY step_order
  `, [startDate, endDate]);
  
  // Activation rate
  const activationRate = await query(`
    SELECT 
      COUNT(DISTINCT user_id) * 100.0 / (
        SELECT COUNT(DISTINCT user_id) 
        FROM user_conversions 
        WHERE conversion_type = 'signup'
        AND DATE(conversion_date) BETWEEN ? AND ?
      ) as rate
    FROM user_conversions
    WHERE conversion_type = 'activation'
    AND DATE(conversion_date) BETWEEN ? AND ?
  `, [startDate, endDate, startDate, endDate]);
  
  // Time to value (média de dias entre signup e activation)
  const timeToValue = await query(`
    SELECT AVG(DATEDIFF(activation_date, signup_date)) as avg_days
    FROM (
      SELECT 
        u1.user_id,
        u1.conversion_date as signup_date,
        u2.conversion_date as activation_date
      FROM user_conversions u1
      JOIN user_conversions u2 ON u1.user_id = u2.user_id
      WHERE u1.conversion_type = 'signup'
      AND u2.conversion_type = 'activation'
      AND DATE(u1.conversion_date) BETWEEN ? AND ?
    ) t
  `, [startDate, endDate]);
  
  // Upgrade rate
  const upgradeRate = await query(`
    SELECT 
      COUNT(DISTINCT user_id) * 100.0 / (
        SELECT COUNT(DISTINCT user_id) 
        FROM user_conversions 
        WHERE conversion_type = 'payment'
        AND DATE(conversion_date) BETWEEN ? AND ?
      ) as rate
    FROM user_conversions
    WHERE conversion_type = 'upgrade'
    AND DATE(conversion_date) BETWEEN ? AND ?
  `, [startDate, endDate, startDate, endDate]);
  
  // Downgrade rate
  const downgradeRate = await query(`
    SELECT 
      COUNT(DISTINCT user_id) * 100.0 / (
        SELECT COUNT(DISTINCT user_id) 
        FROM user_conversions 
        WHERE conversion_type = 'payment'
        AND DATE(conversion_date) BETWEEN ? AND ?
      ) as rate
    FROM user_conversions
    WHERE conversion_type = 'downgrade'
    AND DATE(conversion_date) BETWEEN ? AND ?
  `, [startDate, endDate, startDate, endDate]);
  
  return {
    funnel: funnel,
    activation_rate: activationRate[0]?.rate || 0,
    time_to_value: timeToValue[0]?.avg_days || 0,
    upgrade_rate: upgradeRate[0]?.rate || 0,
    downgrade_rate: downgradeRate[0]?.rate || 0
  };
}

// Função para calcular métricas financeiras
async function calcularFinancial(startDate, endDate) {
  // MRR
  const mrr = await query(`
    SELECT COALESCE(SUM(mrr), 0) as total
    FROM financial_metrics
    WHERE metric_date BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // ARR
  const arr = await query(`
    SELECT COALESCE(SUM(arr), 0) as total
    FROM financial_metrics
    WHERE metric_date BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // LTV
  const ltv = await query(`
    SELECT AVG(ltv) as avg_ltv
    FROM financial_metrics
    WHERE metric_date BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // CAC
  const cac = await query(`
    SELECT AVG(cac) as avg_cac
    FROM financial_metrics
    WHERE metric_date BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // Breakdown de receita
  const revenueBreakdown = await query(`
    SELECT 
      plan_name,
      SUM(plan_value) as revenue,
      COUNT(DISTINCT user_id) as customers
    FROM user_conversions
    WHERE conversion_type = 'payment'
    AND DATE(conversion_date) BETWEEN ? AND ?
    GROUP BY plan_name
    ORDER BY revenue DESC
  `, [startDate, endDate]);
  
  // LTV/CAC ratio
  const ltvCacRatio = await query(`
    SELECT 
      metric_date,
      CASE 
        WHEN cac > 0 THEN ltv / cac 
        ELSE 0 
      END as ratio
    FROM financial_metrics
    WHERE metric_date BETWEEN ? AND ?
    ORDER BY metric_date
  `, [startDate, endDate]);
  
  return {
    mrr: mrr[0]?.total || 0,
    mrr_growth: 12.5, // Mock
    arr: arr[0]?.total || 0,
    arr_growth: 15.2, // Mock
    ltv: ltv[0]?.avg_ltv || 0,
    cac: cac[0]?.avg_cac || 0,
    revenue_breakdown: revenueBreakdown,
    ltv_cac_ratio: ltvCacRatio
  };
}

// Função para calcular métricas de suporte
async function calcularSupport(startDate, endDate) {
  // Tickets abertos
  const ticketsCount = await query(`
    SELECT COUNT(*) as count
    FROM support_tickets
    WHERE DATE(created_at) BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // Tempo médio de resposta
  const avgResponseTime = await query(`
    SELECT AVG(resolution_time_hours) as avg_time
    FROM support_tickets
    WHERE status = 'resolved'
    AND DATE(created_at) BETWEEN ? AND ?
    AND resolution_time_hours IS NOT NULL
  `, [startDate, endDate]);
  
  // CSAT
  const csat = await query(`
    SELECT AVG(satisfaction_score) as score
    FROM support_tickets
    WHERE satisfaction_score IS NOT NULL
    AND DATE(created_at) BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // NPS
  const nps = await query(`
    SELECT AVG(score) as score
    FROM user_feedback
    WHERE feedback_type = 'nps'
    AND DATE(created_at) BETWEEN ? AND ?
  `, [startDate, endDate]);
  
  // Categorias de tickets
  const ticketCategories = await query(`
    SELECT 
      category,
      COUNT(*) as count
    FROM support_tickets
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY category
    ORDER BY count DESC
  `, [startDate, endDate]);
  
  // Tendência de satisfação
  const satisfactionTrend = await query(`
    SELECT 
      DATE(created_at) as date,
      AVG(satisfaction_score) as csat,
      (
        SELECT AVG(score)
        FROM user_feedback
        WHERE feedback_type = 'nps'
        AND DATE(created_at) = DATE(st.created_at)
      ) as nps
    FROM support_tickets st
    WHERE DATE(created_at) BETWEEN ? AND ?
    AND satisfaction_score IS NOT NULL
    GROUP BY DATE(created_at)
    ORDER BY date
  `, [startDate, endDate]);
  
  return {
    tickets_count: ticketsCount[0]?.count || 0,
    avg_response_time: avgResponseTime[0]?.avg_time || 0,
    csat: csat[0]?.score || 0,
    nps: nps[0]?.score || 0,
    ticket_categories: ticketCategories,
    satisfaction_trend: satisfactionTrend
  };
}

// Funções auxiliares para métricas específicas
async function calcularDAU(startDate, endDate) {
  return await query(`
    SELECT 
      DATE(start_time) as date,
      COUNT(DISTINCT user_id) as users
    FROM user_sessions
    WHERE DATE(start_time) BETWEEN ? AND ?
    GROUP BY DATE(start_time)
    ORDER BY date
  `, [startDate, endDate]);
}

async function calcularWAU(startDate, endDate) {
  return await query(`
    SELECT 
      DATE_FORMAT(start_time, '%x-%v') as week,
      COUNT(DISTINCT user_id) as users
    FROM user_sessions
    WHERE DATE(start_time) BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(start_time, '%x-%v')
    ORDER BY week
  `, [startDate, endDate]);
}

async function calcularMAU(startDate, endDate) {
  return await query(`
    SELECT 
      DATE_FORMAT(start_time, '%Y-%m') as month,
      COUNT(DISTINCT user_id) as users
    FROM user_sessions
    WHERE DATE(start_time) BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(start_time, '%Y-%m')
    ORDER BY month
  `, [startDate, endDate]);
}

async function calcularRetention(startDate, endDate) {
  // Implementar cálculo de retenção
  return [];
}

async function calcularFeatureAdoption(startDate, endDate) {
  return await query(`
    SELECT 
      feature_name,
      COUNT(DISTINCT user_id) as users_using,
      COUNT(*) as total_actions,
      AVG(duration_seconds) as avg_duration
    FROM feature_usage
    WHERE DATE(timestamp) BETWEEN ? AND ?
    GROUP BY feature_name
    ORDER BY users_using DESC
  `, [startDate, endDate]);
}

async function calcularFunnel(startDate, endDate) {
  return await query(`
    SELECT 
      funnel_name,
      step_name,
      step_order,
      COUNT(DISTINCT user_id) as users_entered,
      COUNT(completed_at) as users_completed,
      ROUND(COUNT(completed_at) * 100.0 / COUNT(DISTINCT user_id), 2) as conversion_rate
    FROM conversion_funnel
    WHERE DATE(entered_at) BETWEEN ? AND ?
    GROUP BY funnel_name, step_name, step_order
    ORDER BY funnel_name, step_order
  `, [startDate, endDate]);
}

// Função para calcular perfil do usuário
async function calcularPerfilUsuario(userId) {
  try {
    // Buscar dados básicos do usuário
    const userData = await query(`
      SELECT id, name, email, created_at, plan
      FROM users
      WHERE id = ?
    `, [userId]);

    if (userData.length === 0) {
      throw new Error('Usuário não encontrado');
    }

    const user = userData[0];

    // Buscar métricas de saúde
    const healthData = await query(`
      SELECT *
      FROM customer_health
      WHERE user_id = ?
    `, [userId]);

    const health = healthData[0] || {};

    // Buscar estatísticas de sessão
    const sessionStats = await query(`
      SELECT 
        COUNT(*) as total_sessions,
        AVG(duration_seconds) as avg_session_duration,
        MAX(start_time) as last_login
      FROM user_sessions
      WHERE user_id = ?
    `, [userId]);

    // Buscar uso de features
    const featureUsage = await query(`
      SELECT 
        feature_name,
        COUNT(*) as usage_count
      FROM feature_usage
      WHERE user_id = ?
      GROUP BY feature_name
      ORDER BY usage_count DESC
      LIMIT 10
    `, [userId]);

    // Buscar histórico de sessões (últimos 30 dias)
    const sessionHistory = await query(`
      SELECT 
        DATE(start_time) as date,
        COUNT(*) as sessions,
        AVG(duration_seconds) as avg_duration
      FROM user_sessions
      WHERE user_id = ?
      AND start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(start_time)
      ORDER BY date
    `, [userId]);

    // Buscar uso por dispositivo
    const deviceUsage = await query(`
      SELECT 
        device_type,
        COUNT(*) as count
      FROM user_sessions
      WHERE user_id = ?
      GROUP BY device_type
    `, [userId]);

    // Calcular fatores de saúde
    const healthFactors = {
      engagement: Math.min(100, (sessionStats[0]?.total_sessions || 0) * 10),
      feature_adoption: Math.min(100, (featureUsage.length / 10) * 100),
      usage_frequency: Math.min(100, (sessionStats[0]?.total_sessions || 0) * 5),
      satisfaction: health.nps_score || 50
    };

    // Gerar recomendações
    const recommendations = [];
    if (healthFactors.engagement < 50) {
      recommendations.push('Aumente o engajamento usando mais funcionalidades do sistema');
    }
    if (healthFactors.feature_adoption < 30) {
      recommendations.push('Explore mais funcionalidades para aproveitar melhor o sistema');
    }
    if (healthFactors.usage_frequency < 20) {
      recommendations.push('Use o sistema com mais frequência para obter melhores resultados');
    }

    return {
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        plan: user.plan || 'Free',
        last_login: sessionStats[0]?.last_login
      },
      metrics: {
        health_score: health.health_score || 50,
        total_sessions: sessionStats[0]?.total_sessions || 0,
        avg_session_duration: sessionStats[0]?.avg_session_duration || 0,
        features_used_count: featureUsage.length,
        session_history: sessionHistory,
        feature_usage: featureUsage,
        device_usage: deviceUsage,
        health_factors: healthFactors,
        recommendations: recommendations
      }
    };
  } catch (error) {
    console.error('Erro ao calcular perfil do usuário:', error);
    throw error;
  }
}

// Função para buscar alertas do usuário
async function buscarAlertasUsuario(userId) {
  try {
    const alerts = await query(`
      SELECT id, titulo as title, mensagem as message, tipo as type, canal as channel, data_criacao as created_at
      FROM notificacoes
      WHERE user_id = ?
      AND tipo = 'lembrete'
      AND data_criacao >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY data_criacao DESC
    `, [userId]);

    return alerts;
  } catch (error) {
    console.error('Erro ao buscar alertas do usuário:', error);
    return [];
  }
}

module.exports = router; 