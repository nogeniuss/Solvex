module.exports = {
  // Agendamento de tarefas (cron expressions)
  schedule: {
    despesasVencidas: '0 9 * * *',        // Diariamente às 9h
    metasVencendo: '0 10 * * *',          // Diariamente às 10h
    relatorioMensal: '0 8 1 * *',         // Primeiro dia do mês às 8h
    conquistas: '0 11 * * *',             // Diariamente às 11h
    backup: '0 2 * * 0',                  // Todo domingo às 2h
    receitasHoje: '0 8 * * *',            // Diariamente às 8h
    despesasHoje: '0 8 * * *',            // Diariamente às 8h
    investimentosResgateHoje: '0 8 * * *', // Diariamente às 8h
    metasAtualizacaoMensal: '0 9 1 * *'   // Primeiro dia do mês às 9h
  },

  // Configurações de email (Brevo/Sendinblue)
  email: {
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    fromEmail: 'noreply@solvex.com',
    sendDelayMs: 1000, // Delay entre envios de email (1 segundo)
    auth: {
      user: 'noreply@solvex.com',
      pass: process.env.SMTP
    }
  },

  // Configurações de alertas
  alerts: {
    metasVencimento: 7, // Alertar sobre metas vencendo em 7 dias
  },

  // Templates de email
  templates: {
    despesaVencida: {
      subject: '⚠️ Despesa Vencida'
    },
    metaVencimento: {
      subject: '🎯 Meta Próxima do Vencimento'
    },
    relatorioMensal: {
      subject: '📊 Seu Relatório Financeiro Mensal'
    },
    conquista: {
      subject: '🏆 Nova Conquista Desbloqueada!'
    }
  }
}; 