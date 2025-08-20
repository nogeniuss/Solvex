const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// Importar serviços
const NotificationScheduler = require('./services/NotificationScheduler');
const AlertService = require('./services/AlertService');
const AutomatedNotificationService = require('./services/AutomatedNotificationService');
const logger = require('./config/logger');

// Importar middlewares
const { generalLimiter, authLimiter, apiLimiter, speedLimiter } = require('./middleware/rateLimit');

// Importar rotas
const { router: authRoutes, authorizeRoles, authenticateToken } = require('./routes/auth');
const categoriasRoutes = require('./routes/categorias');
const despesasRoutes = require('./routes/despesas');
const receitasRoutes = require('./routes/receitas');
const investimentosRoutes = require('./routes/investimentos');
const dashboardRoutes = require('./routes/dashboard');
const relatoriosRoutes = require('./routes/relatorios');
const metasRoutes = require('./routes/metas');
const conquistasRoutes = require('./routes/conquistas');
const cotacoesRoutes = require('./routes/cotacoes');
const recorrenciasRoutes = require('./routes/recorrencias');
const notificacoesRoutes = require('./routes/notificacoes');
const importacaoRoutes = require('./routes/importacao');
const insightsRoutes = require('./routes/insights');
const onboardingRoutes = require('./routes/onboarding');
const adminRoutes = require('./routes/admin');
const backupRoutes = require('./routes/backup');
const dreRoutes = require('./routes/dre');
const analyticsRoutes = require('./routes/analytics');
const { captureSession, captureEvent, captureFeatureUsage, captureBarriers } = require('./middleware/analytics');
const testeRoutes = require('./routes/teste');
const exportCsvRoutes = require('./routes/export');
const planningRoutes = require('./routes/planning');
const pdfRoutes = require('./routes/pdf');
const externalRoutes = require('./routes/external');

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

// Compressão
app.use(compression());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Rate limiting
app.use(generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);
app.use(speedLimiter);

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de Analytics - captura automática de eventos
app.use(captureSession);
app.use(captureBarriers());

// Middleware de auditoria
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.audit('api_request', req.user?.id, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      resource: req.path,
      method: req.method,
      status: res.statusCode,
      duration
    });
  });
  
  next();
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/migrations', require('./routes/migrations'));
app.use('/api/categorias', categoriasRoutes);
app.use('/api/despesas', despesasRoutes);
app.use('/api/receitas', receitasRoutes);
app.use('/api/investimentos', investimentosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/metas', metasRoutes);
app.use('/api/conquistas', conquistasRoutes);
app.use('/api/cotacoes', cotacoesRoutes);
app.use('/api/recorrencias', recorrenciasRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/importacao', importacaoRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/dre', dreRoutes);
// Proteger Analytics: somente admin e dev
app.use('/api/analytics', authenticateToken, authorizeRoles('admin', 'dev'), analyticsRoutes);
app.use('/api/test', testeRoutes);
app.use('/api/export', exportCsvRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/external', externalRoutes);

// Rota de teste
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de Finanças funcionando!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id
  });

  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message 
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicializar servidor
app.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  
  // Inicializar sistema de notificações
  const notificationScheduler = new NotificationScheduler();
  notificationScheduler.init();
  
  // Inicializar sistema de notificações automáticas
  AutomatedNotificationService.initialize().then(() => {
    logger.info('🤖 Serviço de notificações automáticas inicializado');
  }).catch(error => {
    logger.error('Erro ao inicializar AutomatedNotificationService:', error);
  });
  
  // Inicializar sistema de alertas
  const alertService = new AlertService();
  
  // Executar verificação de alertas a cada 6 horas
  setInterval(() => {
    alertService.runAlertCheck();
  }, 6 * 60 * 60 * 1000);
  
  // Executar primeira verificação após 5 minutos
  setTimeout(() => {
    alertService.runAlertCheck();
  }, 5 * 60 * 1000);

  logger.info('✅ Sistema inicializado com sucesso!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido, encerrando servidor...');
  process.exit(0);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app; 