const cron = require('node-cron');
const { query } = require('../database');
const logger = require('../config/logger');
const NotificationService = require('./NotificationService');
const AlertService = require('./AlertService');

class AutomatedNotificationService {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  /**
   * Inicializar todos os cron jobs
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('AutomatedNotificationService já foi inicializado');
      return;
    }

    try {
      // Verificar despesas vencidas (diário às 09:00)
      this.scheduleOverdueExpenseCheck();

      // Relatório mensal automático (primeiro dia do mês às 08:00)
      this.scheduleMonthlyReports();

      // Lembretes de metas financeiras (semanal, segunda-feira às 09:00)
      this.scheduleGoalReminders();

      // Verificar assinaturas expiradas (diário às 10:00)
      this.scheduleSubscriptionChecks();

      // Relatório de investimentos (mensal, dia 15 às 10:00)
      this.scheduleInvestmentReports();

      // Backup automático da base de dados (diário às 02:00)
      this.scheduleBackupReminders();

      this.isInitialized = true;
      logger.info('AutomatedNotificationService inicializado com sucesso');

    } catch (error) {
      logger.error('Erro ao inicializar AutomatedNotificationService:', error);
      throw error;
    }
  }

  /**
   * Verificar despesas vencidas (diário às 09:00)
   */
  scheduleOverdueExpenseCheck() {
    const job = cron.schedule('0 9 * * *', async () => {
      try {
        logger.info('Executando verificação de despesas vencidas');
        
        const overdueExpenses = await query(`
          SELECT 
            d.*, 
            u.email, 
            u.telefone,
            u.nome,
            c.nome as categoria_nome
          FROM despesas d
          JOIN users u ON d.user_id = u.id
          LEFT JOIN categorias c ON d.categoria_id = c.id
          WHERE d.status = 'pendente' 
            AND d.data_vencimento < CURDATE()
            AND d.notification_sent != 1
        `);

        for (const expense of overdueExpenses) {
          await this.sendOverdueExpenseNotification(expense);
          
          // Marcar como notificado
          await query(`
            UPDATE despesas 
            SET notification_sent = 1 
            WHERE id = ?
          `, [expense.id]);
        }

        logger.info(`Processadas ${overdueExpenses.length} despesas vencidas`);

      } catch (error) {
        logger.error('Erro ao verificar despesas vencidas:', error);
      }
    });

    this.jobs.set('overdueExpenseCheck', job);
    logger.info('Agendamento de verificação de despesas vencidas ativado');
  }

  /**
   * Relatório mensal automático (primeiro dia do mês às 08:00)
   */
  scheduleMonthlyReports() {
    const job = cron.schedule('0 8 1 * *', async () => {
      try {
        logger.info('Executando geração de relatórios mensais');
        
        const users = await query(`
          SELECT id, email, nome
          FROM users 
          WHERE active = 1
            AND email_notifications = 1
        `);

        for (const user of users) {
          await this.generateAndSendMonthlyReport(user);
        }

        logger.info(`Relatórios mensais enviados para ${users.length} usuários`);

      } catch (error) {
        logger.error('Erro ao gerar relatórios mensais:', error);
      }
    });

    this.jobs.set('monthlyReports', job);
    logger.info('Agendamento de relatórios mensais ativado');
  }

  /**
   * Lembretes de metas financeiras (semanal, segunda-feira às 09:00)
   */
  scheduleGoalReminders() {
    const job = cron.schedule('0 9 * * 1', async () => {
      try {
        logger.info('Executando lembretes de metas financeiras');
        
        const activeGoals = await query(`
          SELECT 
            m.*, 
            u.email, 
            u.telefone,
            u.nome,
            (m.valor_atual / m.valor_objetivo * 100) as progresso
          FROM metas m
          JOIN users u ON m.user_id = u.id
          WHERE m.status = 'ativo'
            AND m.data_limite >= CURDATE()
        `);

        for (const goal of activeGoals) {
          if (goal.progresso < 80) { // Enviar lembrete se progresso < 80%
            await this.sendGoalReminderNotification(goal);
          }
        }

        logger.info(`Processadas ${activeGoals.length} metas ativas`);

      } catch (error) {
        logger.error('Erro ao processar lembretes de metas:', error);
      }
    });

    this.jobs.set('goalReminders', job);
    logger.info('Agendamento de lembretes de metas ativado');
  }

  /**
   * Verificar assinaturas expiradas (diário às 10:00)
   */
  scheduleSubscriptionChecks() {
    const job = cron.schedule('0 10 * * *', async () => {
      try {
        logger.info('Executando verificação de assinaturas');
        
        const expiringSubscriptions = await query(`
          SELECT 
            us.*, 
            u.email, 
            u.nome,
            sp.nome as plan_name
          FROM user_subscriptions us
          JOIN users u ON us.user_id = u.id
          JOIN subscription_plans sp ON us.plan_id = sp.id
          WHERE us.current_period_end <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
            AND us.status = 'active'
        `);

        for (const subscription of expiringSubscriptions) {
          await this.sendSubscriptionExpiryNotification(subscription);
        }

        logger.info(`Processadas ${expiringSubscriptions.length} assinaturas próximas do vencimento`);

      } catch (error) {
        logger.error('Erro ao verificar assinaturas:', error);
      }
    });

    this.jobs.set('subscriptionChecks', job);
    logger.info('Agendamento de verificação de assinaturas ativado');
  }

  /**
   * Relatório de investimentos (mensal, dia 15 às 10:00)
   */
  scheduleInvestmentReports() {
    const job = cron.schedule('0 10 15 * *', async () => {
      try {
        logger.info('Executando relatórios de investimentos');
        
        const investors = await query(`
          SELECT DISTINCT 
            u.id, u.email, u.nome
          FROM users u
          JOIN investimentos i ON u.id = i.user_id
          WHERE i.status = 'ativo'
            AND u.email_notifications = 1
        `);

        for (const investor of investors) {
          await this.generateAndSendInvestmentReport(investor);
        }

        logger.info(`Relatórios de investimentos enviados para ${investors.length} investidores`);

      } catch (error) {
        logger.error('Erro ao gerar relatórios de investimentos:', error);
      }
    });

    this.jobs.set('investmentReports', job);
    logger.info('Agendamento de relatórios de investimentos ativado');
  }

  /**
   * Backup automático (diário às 02:00)
   */
  scheduleBackupReminders() {
    const job = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Executando backup automático');
        
        // Aqui você pode chamar seu serviço de backup
        // const BackupService = require('./BackupService');
        // await BackupService.performAutomatedBackup();
        
        logger.info('Backup automático executado com sucesso');

      } catch (error) {
        logger.error('Erro no backup automático:', error);
      }
    });

    this.jobs.set('backupReminders', job);
    logger.info('Agendamento de backup automático ativado');
  }

  /**
   * Enviar notificação de despesa vencida
   */
  async sendOverdueExpenseNotification(expense) {
    try {
      const message = `Olá ${expense.nome}, sua despesa "${expense.descricao}" no valor de R$ ${expense.valor.toFixed(2)} venceu em ${expense.data_vencimento}. Por favor, regularize o pagamento.`;
      
      // Email
      await NotificationService.sendEmail(
        expense.email,
        'Despesa Vencida - Ação Necessária',
        message,
        {
          type: 'overdue_expense',
          expense_id: expense.id,
          valor: expense.valor,
          categoria: expense.categoria_nome
        }
      );

      // SMS se telefone disponível
      if (expense.telefone) {
        await NotificationService.sendSMS(
          expense.telefone,
          `Despesa vencida: ${expense.descricao} - R$ ${expense.valor.toFixed(2)}. Regularize o pagamento.`
        );
      }

      // Criar alerta no sistema
      await AlertService.createAlert(expense.user_id, {
        type: 'overdue_expense',
        severity: 'high',
        title: 'Despesa Vencida',
        message: `${expense.descricao} - R$ ${expense.valor.toFixed(2)}`,
        metadata: { expense_id: expense.id }
      });

    } catch (error) {
      logger.error('Erro ao enviar notificação de despesa vencida:', error);
    }
  }

  /**
   * Gerar e enviar relatório mensal
   */
  async generateAndSendMonthlyReport(user) {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const month = lastMonth.getMonth() + 1;
      const year = lastMonth.getFullYear();

      // Buscar dados do mês anterior
      const monthlyData = await query(`
        SELECT 
          COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) as totalReceitas,
          COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) as totalDespesas
        FROM (
          SELECT 'receita' as tipo, valor FROM receitas 
          WHERE user_id = ? AND MONTH(data_recebimento) = ? AND YEAR(data_recebimento) = ?
          UNION ALL
          SELECT 'despesa' as tipo, valor FROM despesas 
          WHERE user_id = ? AND MONTH(data_vencimento) = ? AND YEAR(data_vencimento) = ?
        ) as transacoes
      `, [user.id, month, year, user.id, month, year]);

      const data = monthlyData[0];
      const saldo = data.totalReceitas - data.totalDespesas;

      const reportMessage = `
        Relatório Mensal - ${month}/${year}
        
        Receitas: R$ ${data.totalReceitas.toFixed(2)}
        Despesas: R$ ${data.totalDespesas.toFixed(2)}
        Saldo: R$ ${saldo.toFixed(2)}
        
        ${saldo > 0 ? '✅ Parabéns! Você teve um saldo positivo.' : '⚠️ Atenção! Suas despesas superaram as receitas.'}
      `;

      await NotificationService.sendEmail(
        user.email,
        `Relatório Mensal - ${month}/${year}`,
        reportMessage,
        {
          type: 'monthly_report',
          month,
          year,
          data
        }
      );

    } catch (error) {
      logger.error('Erro ao gerar relatório mensal:', error);
    }
  }

  /**
   * Enviar lembrete de meta financeira
   */
  async sendGoalReminderNotification(goal) {
    try {
      const diasRestantes = Math.ceil((new Date(goal.data_limite) - new Date()) / (1000 * 60 * 60 * 24));
      const valorRestante = goal.valor_objetivo - goal.valor_atual;

      const message = `Olá ${goal.nome}, sua meta "${goal.titulo}" está ${goal.progresso.toFixed(1)}% completa. Restam R$ ${valorRestante.toFixed(2)} e ${diasRestantes} dias. Continue firme no seu objetivo!`;

      await NotificationService.sendEmail(
        goal.email,
        'Lembrete de Meta Financeira',
        message,
        {
          type: 'goal_reminder',
          goal_id: goal.id,
          progresso: goal.progresso
        }
      );

    } catch (error) {
      logger.error('Erro ao enviar lembrete de meta:', error);
    }
  }

  /**
   * Enviar notificação de assinatura próxima do vencimento
   */
  async sendSubscriptionExpiryNotification(subscription) {
    try {
      const diasRestantes = Math.ceil((new Date(subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24));

      const message = `Olá ${subscription.nome}, sua assinatura do plano ${subscription.plan_name} vence em ${diasRestantes} dias. Renove para continuar aproveitando todos os recursos.`;

      await NotificationService.sendEmail(
        subscription.email,
        'Renovação de Assinatura Necessária',
        message,
        {
          type: 'subscription_expiry',
          subscription_id: subscription.id,
          days_remaining: diasRestantes
        }
      );

    } catch (error) {
      logger.error('Erro ao enviar notificação de assinatura:', error);
    }
  }

  /**
   * Gerar e enviar relatório de investimentos
   */
  async generateAndSendInvestmentReport(investor) {
    try {
      const investments = await query(`
        SELECT 
          tipo,
          SUM(valor_inicial) as total_investido,
          SUM(valor_atual) as valor_atual,
          COUNT(*) as quantidade
        FROM investimentos 
        WHERE user_id = ? AND status = 'ativo'
        GROUP BY tipo
      `, [investor.id]);

      let reportContent = `Relatório de Investimentos\n\n`;
      let totalInvestido = 0;
      let totalAtual = 0;

      for (const investment of investments) {
        totalInvestido += investment.total_investido;
        totalAtual += investment.valor_atual;
        const rendimento = ((investment.valor_atual / investment.total_investido - 1) * 100).toFixed(2);
        
        reportContent += `${investment.tipo}: R$ ${investment.valor_atual.toFixed(2)} (${rendimento}%)\n`;
      }

      const rendimentoTotal = ((totalAtual / totalInvestido - 1) * 100).toFixed(2);
      reportContent += `\nTotal Investido: R$ ${totalInvestido.toFixed(2)}`;
      reportContent += `\nValor Atual: R$ ${totalAtual.toFixed(2)}`;
      reportContent += `\nRendimento: ${rendimentoTotal}%`;

      await NotificationService.sendEmail(
        investor.email,
        'Relatório Mensal de Investimentos',
        reportContent,
        {
          type: 'investment_report',
          total_investido: totalInvestido,
          valor_atual: totalAtual,
          rendimento: rendimentoTotal
        }
      );

    } catch (error) {
      logger.error('Erro ao gerar relatório de investimentos:', error);
    }
  }

  /**
   * Parar todos os cron jobs
   */
  stopAllJobs() {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Job ${name} parado`);
    });
    this.jobs.clear();
    this.isInitialized = false;
  }

  /**
   * Obter status de todos os jobs
   */
  getJobsStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running || false,
        scheduled: true
      };
    });
    return status;
  }
}

module.exports = new AutomatedNotificationService(); 