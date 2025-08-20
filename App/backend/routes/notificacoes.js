const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { authenticateToken } = require('./auth');
const cron = require('node-cron');
const NotificationService = require('../services/NotificationService');
const vonageSMS = require('../services/VonageSMSService');
const config = require('../config/notifications');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// GET - Listar notificações do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const notificacoes = await query(`
      SELECT * FROM notificacoes 
      WHERE user_id = ?
      ORDER BY data_criacao DESC
      LIMIT 50
    `, [userId]);

    res.json({ notificacoes });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Criar notificação
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { titulo, mensagem, tipo, canal, agendamento } = req.body;

    if (!titulo || !mensagem || !tipo) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    const result = await query(`
      INSERT INTO notificacoes (
        titulo, mensagem, tipo, canal, agendamento, user_id, status, data_criacao
      ) VALUES (?, ?, ?, ?, ?, ?, 'pendente', NOW())
    `, [titulo, mensagem, tipo, canal || 'email', agendamento, userId]);

    const novaNotificacao = await queryOne(`
      SELECT * FROM notificacoes WHERE id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: 'Notificação criada com sucesso',
      notificacao: novaNotificacao
    });
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT - Marcar notificação como lida
router.put('/:id/lida', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificacaoId = req.params.id;

    await query(`
      UPDATE notificacoes SET 
        status = 'lida', data_leitura = NOW()
      WHERE id = ? AND user_id = ?
    `, [notificacaoId, userId]);

    res.json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Enviar notificação manualmente
router.post('/enviar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificacao_id } = req.body;

    const notificacao = await queryOne(`
      SELECT n.*, u.email, u.nome 
      FROM notificacoes n
      JOIN users u ON u.id = n.user_id
      WHERE n.id = ? AND n.user_id = ?
    `, [notificacao_id, userId]);

    if (!notificacao) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    const notificationService = new NotificationService();
    const enviadaResult = await notificationService.sendEmail({
      to: notificacao.email,
      subject: notificacao.titulo,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">${notificacao.titulo}</h2>
          <p>${notificacao.mensagem}</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            Sistema Financeiro Pessoal<br>
            Enviado em: ${new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      `
    });

    const enviada = enviadaResult?.success === true;

    if (enviada) {
      await query(`
        UPDATE notificacoes SET 
          status = 'enviada', data_envio = NOW()
        WHERE id = ?
      `, [notificacao_id]);
    }

    res.json({
      message: enviada ? 'Notificação enviada com sucesso' : 'Erro ao enviar notificação',
      enviada: enviada
    });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para enviar notificação (usada no cron)
async function enviarNotificacao(notificacao) {
  try {
    if (notificacao.canal === 'email') {
      const notificationService = new NotificationService();
      const result = await notificationService.sendEmail({
        to: notificacao.email,
        subject: notificacao.titulo,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">${notificacao.titulo}</h2>
            <p>${notificacao.mensagem}</p>
            <hr>
            <p style="font-size: 12px; color: #666;">
              Sistema Financeiro Pessoal<br>
              Enviado em: ${new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        `
      });
      return result?.success === true;
    }

    if (notificacao.canal === 'sms') {
      const notificationService = new NotificationService();
      const result = await notificationService.sendSMS({
        to: notificacao.telefone,
        message: `${notificacao.titulo}\n\n${notificacao.mensagem}`
      });
      return result?.success === true;
    }

    return false;
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return false;
  }
}

// Função para criar notificação automática
async function criarNotificacaoAutomatica(userId, titulo, mensagem, tipo = 'sistema') {
  try {
    await query(`
      INSERT INTO notificacoes (
        titulo, mensagem, tipo, canal, user_id, status, data_criacao
      ) VALUES (?, ?, ?, 'email', ?, 'pendente', NOW())
    `, [titulo, mensagem, tipo, userId]);
  } catch (error) {
    console.error('Erro ao criar notificação automática:', error);
  }
}

// Função para verificar e criar notificações automáticas
async function verificarNotificacoesAutomaticas() {
  try {
    // Buscar usuários ativos
    const usuarios = await query('SELECT id, nome, email FROM users WHERE status = "ativo"');
    
    for (const usuario of usuarios) {
      // Verificar despesas vencendo em 3 dias
      const despesasVencendo = await query(`
        SELECT COUNT(*) as total FROM despesas 
        WHERE user_id = ? AND status = 'pendente'
        AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
      `, [usuario.id]);

      if (despesasVencendo[0].total > 0) {
        await criarNotificacaoAutomatica(
          usuario.id,
          'Despesas Vencendo',
          `Você tem ${despesasVencendo[0].total} despesa(s) vencendo nos próximos 3 dias.`,
          'lembrete'
        );
      }

      // Verificar metas próximas de serem batidas
      const metasProximas = await query(`
        SELECT COUNT(*) as total FROM metas 
        WHERE user_id = ? AND status = 'ativa'
        AND (progresso / valor_meta) >= 0.8
      `, [usuario.id]);

      if (metasProximas[0].total > 0) {
        await criarNotificacaoAutomatica(
          usuario.id,
          'Metas Próximas',
          `Você tem ${metasProximas[0].total} meta(s) com mais de 80% de progresso!`,
          'motivacao'
        );
      }

      // Verificar inatividade (7 dias sem login)
      const ultimoLogin = await queryOne(`
        SELECT last_login FROM users WHERE id = ?
      `, [usuario.id]);

      if (ultimoLogin && ultimoLogin.last_login) {
        const diasInativo = Math.floor((new Date() - new Date(ultimoLogin.last_login)) / (1000 * 60 * 60 * 24));
        
        if (diasInativo >= 7) {
          await criarNotificacaoAutomatica(
            usuario.id,
            'Você está perdendo dinheiro!',
            'Não se esqueça de registrar suas transações. O controle financeiro é fundamental!',
            'reativacao'
          );
        }
      }
    }
  } catch (error) {
    console.error('Erro ao verificar notificações automáticas:', error);
  }
}

// Configurar cron job para verificar notificações diariamente
cron.schedule('0 9 * * *', async () => {
  console.log('Verificando notificações automáticas...');
  await verificarNotificacoesAutomaticas();
});

// Configurar cron job para enviar notificações pendentes
cron.schedule('0 */6 * * *', async () => {
  console.log('Enviando notificações pendentes...');
  try {
    const notificacoesPendentes = await query(`
      SELECT n.*, u.email, u.nome 
      FROM notificacoes n
      JOIN users u ON u.id = n.user_id
      WHERE n.status = 'pendente' AND n.canal = 'email' AND (n.agendamento IS NULL OR DATE(n.agendamento) = CURDATE())
    `);

    for (const notificacao of notificacoesPendentes) {
      const enviada = await enviarNotificacao(notificacao);
      
      if (enviada) {
        await query(`
          UPDATE notificacoes SET 
            status = 'enviada', data_envio = NOW()
          WHERE id = ?
        `, [notificacao.id]);
      }

      // Atraso entre envios
      await sleep(config.email.sendDelayMs);
    }
  } catch (error) {
    console.error('Erro ao enviar notificações pendentes:', error);
  }
});

// POST - Testar configuração SMS (Vonage/Twilio)
router.post('/test-sms-config', authenticateToken, async (req, res) => {
  try {
    const notificationService = new NotificationService();
    const testResult = await notificationService.testSMSConfig();
    
    res.json({
      message: testResult.success ? 'Configuração SMS testada com sucesso' : 'Erro na configuração SMS',
      ...testResult
    });
  } catch (error) {
    console.error('Erro ao testar configuração SMS:', error);
    res.status(500).json({ error: 'Erro ao testar configuração SMS' });
  }
});

// POST - Enviar SMS de teste via Vonage
router.post('/test-sms', authenticateToken, async (req, res) => {
  try {
    const { telefone, mensagem } = req.body;
    
    if (!telefone || !mensagem) {
      return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
    }

    // Testar diretamente com Vonage
    const vonageResult = await vonageSMS.sendSMS(telefone, mensagem);
    
    if (vonageResult.success) {
      res.json({
        message: 'SMS de teste enviado com sucesso via Vonage',
        success: true,
        provider: 'vonage',
        messageId: vonageResult.messageId,
        messagePrice: vonageResult.messagePrice,
        network: vonageResult.network,
        remainingBalance: vonageResult.remainingBalance
      });
    } else {
      res.status(400).json({
        message: 'Erro ao enviar SMS de teste',
        success: false,
        error: vonageResult.error,
        errorCode: vonageResult.errorCode
      });
    }
  } catch (error) {
    console.error('Erro ao enviar SMS de teste:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Enviar notificação SMS usando NotificationService
router.post('/send-sms', authenticateToken, async (req, res) => {
  try {
    const { telefone, titulo, mensagem } = req.body;
    
    if (!telefone || !titulo || !mensagem) {
      return res.status(400).json({ error: 'Telefone, título e mensagem são obrigatórios' });
    }

    const notificationService = new NotificationService();
    const result = await notificationService.sendSMS({
      to: telefone,
      message: `${titulo}\n\n${mensagem}`
    });
    
    if (result.success) {
      res.json({
        message: 'SMS enviado com sucesso',
        success: true,
        provider: result.provider,
        messageId: result.messageId,
        messagePrice: result.messagePrice,
        network: result.network
      });
    } else {
      res.status(400).json({
        message: 'Erro ao enviar SMS',
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erro ao enviar SMS:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Status da conta Vonage
router.get('/vonage-status', authenticateToken, async (req, res) => {
  try {
    const balanceResult = await vonageSMS.getAccountBalance();
    
    if (balanceResult.success) {
      res.json({
        message: 'Status da conta Vonage obtido com sucesso',
        balance: balanceResult.balance,
        autoReload: balanceResult.autoReload,
        success: true
      });
    } else {
      res.status(400).json({
        message: 'Erro ao obter status da conta Vonage',
        error: balanceResult.error,
        success: false
      });
    }
  } catch (error) {
    console.error('Erro ao obter status Vonage:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 