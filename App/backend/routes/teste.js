const express = require('express');
const router = express.Router();
const NotificationScheduler = require('../services/NotificationScheduler');
const AlertService = require('../services/AlertService');
const { query, queryOne, execute } = require('../database');
const bcrypt = require('bcryptjs');

// GET - Dispara todos os lembretes/agendamentos e alertas (rota pública para testes)
router.get('/trigger-all', async (req, res) => {
  const scheduler = new NotificationScheduler();
  const alertService = new AlertService();

  const results = {};

  try {
    results.receitasHoje = await safeCall(() => scheduler.verificarReceitasHoje());
    results.despesasHoje = await safeCall(() => scheduler.verificarDespesasHoje());
    results.investimentosResgateHoje = await safeCall(() => scheduler.verificarInvestimentosResgateHoje());
    results.metasAtualizacaoMensal = await safeCall(() => scheduler.enviarLembreteAtualizacaoMetas());

    results.despesasVencidas = await safeCall(() => scheduler.verificarDespesasVencidas());
    results.metasVencendo = await safeCall(() => scheduler.verificarMetasVencendo());
    results.relatorioMensal = await safeCall(() => scheduler.gerarRelatorioMensal());
    results.conquistas = await safeCall(() => scheduler.verificarConquistas());

    results.alertsCheck = await safeCall(() => alertService.runAlertCheck());

    res.json({ ok: true, triggeredAt: new Date().toISOString(), results });
  } catch (error) {
    console.error('Erro ao disparar gatilhos de teste:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST - Cria dados para disparar alertas/lembretes para um usuário (rota pública de teste)
router.post('/create-alerts', async (req, res) => {
  try {
    const { email, nome } = req.body || {};
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Informe o email' });
    }

    // Buscar ou criar usuário
    let user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      const senhaHash = bcrypt.hashSync('123456', 10);
      const result = await execute(
        `INSERT INTO users (nome, email, senha, status, role, data_ativacao)
         VALUES (?, ?, ?, 'ativo', 'user', NOW())`,
        [nome || email.split('@')[0], email, senhaHash]
      );
      user = await queryOne('SELECT * FROM users WHERE id = ?', [result.insertId]);
    }

    const userId = user.id;

    // Criar despesa vencendo hoje (pendente)
    const despesaId = (await execute(
      `INSERT INTO despesas (titulo, valor, categoria_id, user_id, data_vencimento, status, recorrencia)
       VALUES ('Conta de Teste', 120.50, NULL, ?, CURDATE(), 'pendente', 'nenhuma')`,
      [userId]
    )).insertId;

    // Criar receita a receber hoje (pendente)
    const receitaId = (await execute(
      `INSERT INTO receitas (titulo, valor, categoria_id, user_id, data_recebimento, status, recorrencia)
       VALUES ('Receita de Teste', 500.00, NULL, ?, CURDATE(), 'pendente', 'nenhuma')`,
      [userId]
    )).insertId;

    // Criar investimento com resgate hoje
    const investimentoId = (await execute(
      `INSERT INTO investimentos (titulo, descricao, tipo, valor_inicial, categoria_id, user_id, instituicao, data_inicio, data_resgate, status)
       VALUES ('Investimento de Teste', 'Teste', 'renda_fixa', 1000.00, NULL, ?, 'Banco Teste', CURDATE(), CURDATE(), 'ativo')`,
      [userId]
    )).insertId;

    // Criar meta ativa com data_fim futura
    const metaId = (await execute(
      `INSERT INTO metas (titulo, descricao, tipo, valor_meta, valor_atual, categoria_id, user_id, data_inicio, data_fim, status)
       VALUES ('Meta de Teste', 'Atualizar progresso mensal', 'economia', 5000.00, 1000.00, NULL, ?, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'ativa')`,
      [userId]
    )).insertId;

    // Disparar imediatamente os jobs relacionados
    const scheduler = new NotificationScheduler();

    const results = {};
    results.despesasHoje = await safeCall(() => scheduler.verificarDespesasHoje());
    results.receitasHoje = await safeCall(() => scheduler.verificarReceitasHoje());
    results.investimentosResgateHoje = await safeCall(() => scheduler.verificarInvestimentosResgateHoje());
    results.metasAtualizacaoMensal = await safeCall(() => scheduler.enviarLembreteAtualizacaoMetas());

    res.json({
      ok: true,
      user: { id: userId, email: user.email, nome: user.nome },
      created: { despesaId, receitaId, investimentoId, metaId },
      sent: results
    });
  } catch (error) {
    console.error('Erro ao criar alertas de teste:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

async function safeCall(fn) {
  try {
    const result = await fn();
    return { success: true, result: result || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = router; 