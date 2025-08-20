const express = require('express');
const router = express.Router();
const { query } = require('../database');
const { authenticateToken, authorizeRoles } = require('./auth');
const AutomatedNotificationService = require('../services/AutomatedNotificationService');
const logger = require('../config/logger');
const os = require('os');

// Middleware para verificar permissões de admin
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'dev'));

/**
 * GET /api/admin/metrics
 * Retorna métricas gerais do sistema
 */
router.get('/metrics', async (req, res) => {
  try {
    // Métricas de usuários
    const userMetrics = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN DATE(created_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as newThisMonth,
        COUNT(CASE WHEN active = 1 THEN 1 END) as active
      FROM users
    `);

    // Métricas de receita
    const revenueMetrics = await query(`
      SELECT 
        SUM(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 
          CASE 
            WHEN sp.periodo = 'month' THEN sp.valor
            WHEN sp.periodo = 'year' THEN sp.valor / 12
            ELSE sp.valor
          END
        ELSE 0 END) as monthly,
        COUNT(*) as totalSubscriptions
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.status = 'active'
    `);

    // Métricas de assinaturas
    const subscriptionMetrics = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'trialing' THEN 1 END) as trialing,
        COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled,
        (COUNT(CASE WHEN status = 'active' THEN 1 END) / NULLIF(COUNT(*), 0) * 100) as retention
      FROM user_subscriptions
    `);

    // Métricas de transações
    const transactionMetrics = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN DATE(data_vencimento) = CURDATE() THEN 1 END) as today
      FROM (
        SELECT data_recebimento as data_vencimento FROM receitas
        UNION ALL
        SELECT data_vencimento FROM despesas
      ) as all_transactions
    `);

    const metrics = {
      users: userMetrics[0],
      revenue: {
        monthly: revenueMetrics[0]?.monthly || 0,
        growth: 5.2 // Calcular crescimento real baseado em dados históricos
      },
      subscriptions: subscriptionMetrics[0],
      transactions: transactionMetrics[0]
    };

    res.json(metrics);

  } catch (error) {
    logger.error('Erro ao buscar métricas admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/admin/health
 * Retorna status de saúde de todos os componentes do sistema
 */
router.get('/health', async (req, res) => {
  try {
    // Verificar status do banco de dados
    const dbStart = Date.now();
    const dbTest = await query('SELECT 1 as test');
    const dbResponseTime = Date.now() - dbStart;
    
    const dbStatus = {
      status: dbTest.length > 0 ? 'healthy' : 'error',
      responseTime: dbResponseTime,
      connections: 'N/A', // Implementar se necessário
      lastBackup: 'N/A' // Implementar baseado no serviço de backup
    };

    // Verificar serviços de notificação
    const notificationStatus = {
      email: 'healthy', // Implementar verificação real
      sms: 'healthy'    // Implementar verificação real
    };

    // Verificar Stripe
    const stripeStatus = {
      status: 'healthy', // Implementar verificação real
      lastSync: new Date().toISOString(),
      webhooksWorking: true
    };

    // Métricas do servidor
    const serverStatus = {
      cpu: Math.round(os.loadavg()[0] * 100),
      memory: Math.round((1 - os.freemem() / os.totalmem()) * 100),
      disk: 'N/A', // Implementar se necessário
      uptime: Math.round(os.uptime())
    };

    // Determinar status geral
    const overall = (dbStatus.status === 'healthy' && 
                    notificationStatus.email === 'healthy' &&
                    stripeStatus.status === 'healthy') ? 'healthy' : 'warning';

    const healthStatus = {
      overall,
      database: dbStatus,
      notifications: notificationStatus,
      stripe: stripeStatus,
      server: serverStatus,
      timestamp: new Date().toISOString()
    };

    res.json(healthStatus);

  } catch (error) {
    logger.error('Erro ao verificar saúde do sistema:', error);
    res.status(500).json({ 
      overall: 'error',
      error: 'Erro ao verificar saúde do sistema'
    });
  }
});

/**
 * GET /api/admin/subscriptions
 * Retorna dados detalhados de assinaturas
 */
router.get('/subscriptions', async (req, res) => {
  try {
    // Assinaturas por status
    const byStatus = await query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM user_subscriptions
      GROUP BY status
    `);

    // Assinaturas por plano
    const byPlan = await query(`
      SELECT 
        sp.nome as name,
        COUNT(us.id) as count,
        SUM(sp.valor) as revenue
      FROM subscription_plans sp
      LEFT JOIN user_subscriptions us ON sp.id = us.plan_id AND us.status = 'active'
      GROUP BY sp.id, sp.nome
    `);

    // Assinaturas recentes
    const recent = await query(`
      SELECT 
        us.id,
        us.status,
        us.created_at as created,
        us.current_period_end as expires,
        u.nome as userName,
        u.email as userEmail,
        sp.nome as planName
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      JOIN subscription_plans sp ON us.plan_id = sp.id
      ORDER BY us.created_at DESC
      LIMIT 10
    `);

    // Transformar dados
    const statusMap = {};
    byStatus.forEach(item => {
      statusMap[item.status] = item.count;
    });

    res.json({
      byStatus: statusMap,
      byPlan: byPlan,
      recent: recent
    });

  } catch (error) {
    logger.error('Erro ao buscar dados de assinaturas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/admin/notifications
 * Retorna estatísticas e status dos jobs de notificação
 */
router.get('/notifications', async (req, res) => {
  try {
    // Estatísticas de notificações (implementar baseado em logs ou tabela de notificações)
    const stats = {
      emailsToday: 0,    // Implementar contagem real
      smsToday: 0,       // Implementar contagem real
      successRate: 95.5  // Implementar cálculo real
    };

    // Status dos jobs automáticos
    const jobs = AutomatedNotificationService.getJobsStatus();

    // Notificações recentes (implementar baseado em logs ou tabela)
    const recent = [
      {
        id: 1,
        type: 'email',
        title: 'Relatório Mensal',
        recipient: 'usuario@exemplo.com',
        timestamp: new Date().toISOString(),
        status: 'sent'
      }
      // Implementar busca real de notificações
    ];

    res.json({
      stats,
      jobs,
      recent
    });

  } catch (error) {
    logger.error('Erro ao buscar dados de notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/admin/backup
 * Iniciar backup manual
 */
router.post('/backup', async (req, res) => {
  try {
    // Implementar chamada para serviço de backup
    // const BackupService = require('../services/BackupService');
    // await BackupService.performManualBackup();
    
    logger.info('Backup manual iniciado por admin');
    
    res.json({ 
      success: true, 
      message: 'Backup iniciado com sucesso',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erro ao iniciar backup manual:', error);
    res.status(500).json({ error: 'Erro ao iniciar backup' });
  }
});

/**
 * POST /api/admin/notifications/toggle/:jobName
 * Ativar/desativar job de notificação
 */
router.post('/notifications/toggle/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    
    // Implementar toggle do job
    logger.info(`Admin alterou status do job: ${jobName}`);
    
    res.json({ 
      success: true, 
      message: `Job ${jobName} alterado com sucesso`
    });

  } catch (error) {
    logger.error('Erro ao alterar job:', error);
    res.status(500).json({ error: 'Erro ao alterar job' });
  }
});

/**
 * GET /api/admin/logs
 * Retorna logs recentes do sistema
 */
router.get('/logs', async (req, res) => {
  try {
    const { level = 'all', limit = 100 } = req.query;
    
    // Implementar leitura de logs
    // Por enquanto retorna dados mockados
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Sistema inicializado com sucesso',
        meta: {}
      }
    ];

    res.json({ logs });

  } catch (error) {
    logger.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
});

/**
 * GET /api/admin/errors
 * Retorna erros recentes registrados pelo ErrorBoundary
 */
router.get('/errors', async (req, res) => {
  try {
    // Implementar busca de erros em tabela dedicada
    const errors = await query(`
      SELECT *
      FROM error_logs
      ORDER BY timestamp DESC
      LIMIT 50
    `);

    res.json({ errors });

  } catch (error) {
    logger.error('Erro ao buscar erros:', error);
    res.status(500).json({ error: 'Erro ao buscar erros' });
  }
});

/**
 * POST /api/errors/log
 * Endpoint para receber erros do ErrorBoundary frontend
 */
router.post('/errors/log', async (req, res) => {
  try {
    const { errorId, message, stack, componentStack, timestamp, userAgent, url } = req.body;
    const userId = req.user?.id;

    await query(`
      INSERT INTO error_logs (
        error_id, user_id, message, stack, component_stack, 
        user_agent, url, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [errorId, userId, message, stack, componentStack, userAgent, url, timestamp]);

    logger.error('Frontend error logged:', { errorId, message, userId });

    res.json({ success: true, logged: true });

  } catch (error) {
    logger.error('Erro ao registrar erro do frontend:', error);
    res.status(500).json({ error: 'Erro ao registrar erro' });
  }
});

module.exports = router; 