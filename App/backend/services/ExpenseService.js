const { query, queryOne } = require('../database');

class ExpenseService {
  async getExpenses(userId, filters = {}) {
    let whereClause = 'WHERE d.user_id = ?';
    const params = [userId];

    if (filters.mes && filters.ano) {
      whereClause += ' AND MONTH(d.data_vencimento) = ? AND YEAR(d.data_vencimento) = ?';
      params.push(filters.mes, filters.ano);
    }

    if (filters.categoria_id) {
      whereClause += ' AND d.categoria_id = ?';
      params.push(filters.categoria_id);
    }

    if (filters.status) {
      whereClause += ' AND d.status = ?';
      params.push(filters.status);
    }

    return await query(`
      SELECT 
        d.*,
        c.nome as categoria_nome,
        c.cor as categoria_cor
      FROM despesas d
      LEFT JOIN categorias c ON c.id = d.categoria_id
      ${whereClause}
      ORDER BY d.data_vencimento DESC
    `, params);
  }

  async createExpense(userId, expenseData) {
    const {
      titulo,
      descricao,
      valor,
      categoria_id,
      data_vencimento,
      recorrencia,
      data_fim_recorrencia,
      juros,
      multa
    } = expenseData;

    const result = await query(`
      INSERT INTO despesas (
        titulo, descricao, valor, categoria_id, user_id, 
        data_vencimento, recorrencia, data_fim_recorrencia, 
        juros, multa, status, created_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', NOW())
    `, [titulo, descricao, valor, categoria_id, userId, data_vencimento, recorrencia, data_fim_recorrencia, juros || 0, multa || 0]);

    return await this.getExpenseById(result.insertId, userId);
  }

  async updateExpense(expenseId, userId, expenseData) {
    const {
      titulo,
      descricao,
      valor,
      categoria_id,
      data_vencimento,
      recorrencia,
      data_fim_recorrencia,
      juros,
      multa
    } = expenseData;

    await query(`
      UPDATE despesas SET 
        titulo = ?, descricao = ?, valor = ?, categoria_id = ?,
        data_vencimento = ?, recorrencia = ?, data_fim_recorrencia = ?,
        juros = ?, multa = ?, updated_date = NOW()
      WHERE id = ? AND user_id = ?
    `, [titulo, descricao, valor, categoria_id, data_vencimento, recorrencia, data_fim_recorrencia, juros || 0, multa || 0, expenseId, userId]);

    return await this.getExpenseById(expenseId, userId);
  }

  async deleteExpense(expenseId, userId) {
    await query('DELETE FROM despesas WHERE id = ? AND user_id = ?', [expenseId, userId]);
    return { message: 'Despesa excluída com sucesso' };
  }

  async markAsPaid(expenseId, userId) {
    await query(`
      UPDATE despesas SET 
        status = 'pago', 
        data_pagamento = NOW(),
        updated_date = NOW()
      WHERE id = ? AND user_id = ?
    `, [expenseId, userId]);

    return await this.getExpenseById(expenseId, userId);
  }

  async getExpenseById(expenseId, userId) {
    return await queryOne(`
      SELECT 
        d.*,
        c.nome as categoria_nome,
        c.cor as categoria_cor
      FROM despesas d
      LEFT JOIN categorias c ON c.id = d.categoria_id
      WHERE d.id = ? AND d.user_id = ?
    `, [expenseId, userId]);
  }

  async getExpenseStats(userId, filters = {}) {
    let whereClause = 'WHERE d.user_id = ?';
    const params = [userId];

    if (filters.mes && filters.ano) {
      whereClause += ' AND MONTH(d.data_vencimento) = ? AND YEAR(d.data_vencimento) = ?';
      params.push(filters.mes, filters.ano);
    }

    const stats = await queryOne(`
      SELECT 
        COUNT(*) as total_despesas,
        SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as total_pago,
        SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as total_pendente,
        AVG(valor) as valor_medio,
        SUM(CASE WHEN data_vencimento < CURDATE() AND status = 'pendente' THEN valor ELSE 0 END) as total_vencido
      FROM despesas d
      ${whereClause}
    `, params);

    // Calcular juros e multas
    const jurosMultas = await queryOne(`
      SELECT 
        SUM(juros) as total_juros,
        SUM(multa) as total_multas
      FROM despesas d
      ${whereClause} AND d.status = 'pendente' AND d.data_vencimento < CURDATE()
    `, params);

    return {
      ...stats,
      total_juros: jurosMultas.total_juros || 0,
      total_multas: jurosMultas.total_multas || 0,
      total_com_juros: (stats.total_pendente || 0) + (jurosMultas.total_juros || 0) + (jurosMultas.total_multas || 0)
    };
  }

  async getExpensesByCategory(userId, filters = {}) {
    let whereClause = 'WHERE d.user_id = ?';
    const params = [userId];

    if (filters.mes && filters.ano) {
      whereClause += ' AND MONTH(d.data_vencimento) = ? AND YEAR(d.data_vencimento) = ?';
      params.push(filters.mes, filters.ano);
    }

    return await query(`
      SELECT 
        c.nome as categoria,
        c.cor as categoria_cor,
        COUNT(d.id) as quantidade,
        SUM(d.valor) as valor_total,
        AVG(d.valor) as valor_medio
      FROM despesas d
      LEFT JOIN categorias c ON c.id = d.categoria_id
      ${whereClause}
      GROUP BY c.id, c.nome, c.cor
      ORDER BY valor_total DESC
    `, params);
  }

  async getOverdueExpenses(userId) {
    return await query(`
      SELECT 
        d.*,
        c.nome as categoria_nome,
        c.cor as categoria_cor,
        DATEDIFF(CURDATE(), d.data_vencimento) as dias_vencido
      FROM despesas d
      LEFT JOIN categorias c ON c.id = d.categoria_id
      WHERE d.user_id = ? AND d.status = 'pendente' AND d.data_vencimento < CURDATE()
      ORDER BY d.data_vencimento ASC
    `, [userId]);
  }

  async calculateInterestAndPenalty(expenseId, userId) {
    const expense = await this.getExpenseById(expenseId, userId);
    
    if (!expense || expense.status === 'pago') {
      return { valor_original: 0, juros: 0, multa: 0, valor_total: 0 };
    }

    const valorOriginal = parseFloat(expense.valor);
    const juros = parseFloat(expense.juros || 0);
    const multa = parseFloat(expense.multa || 0);
    
    const diasVencido = Math.max(0, Math.floor((new Date() - new Date(expense.data_vencimento)) / (1000 * 60 * 60 * 24)));
    
    const valorJuros = (valorOriginal * juros / 100) * diasVencido;
    const valorMulta = valorOriginal * (multa / 100);
    const valorTotal = valorOriginal + valorJuros + valorMulta;

    return {
      valor_original: valorOriginal,
      juros: valorJuros,
      multa: valorMulta,
      valor_total: valorTotal,
      dias_vencido: diasVencido
    };
  }
}

module.exports = new ExpenseService(); 