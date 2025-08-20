const { query, queryOne, execute } = require('../database');

class ExpenseRepository {
  async findAll(userId, filters = {}) {
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

    if (filters.data_inicio) {
      whereClause += ' AND d.data_vencimento >= ?';
      params.push(filters.data_inicio);
    }

    if (filters.data_fim) {
      whereClause += ' AND d.data_vencimento <= ?';
      params.push(filters.data_fim);
    }

    return await query(`
      SELECT 
        d.*,
        c.nome as categoria_nome,
        c.cor as categoria_cor,
        c.icone as categoria_icone
      FROM despesas d
      LEFT JOIN categorias c ON c.id = d.categoria_id
      ${whereClause}
      ORDER BY d.data_vencimento DESC
    `, params);
  }

  async findById(id, userId) {
    return await queryOne(`
      SELECT 
        d.*,
        c.nome as categoria_nome,
        c.cor as categoria_cor,
        c.icone as categoria_icone
      FROM despesas d
      LEFT JOIN categorias c ON c.id = d.categoria_id
      WHERE d.id = ? AND d.user_id = ?
    `, [id, userId]);
  }

  async create(expenseData) {
    const {
      titulo,
      descricao,
      valor,
      categoria_id,
      user_id,
      data_vencimento,
      recorrencia,
      data_fim_recorrencia,
      juros,
      multa
    } = expenseData;

    // Converter datas para formato MySQL (YYYY-MM-DD)
    const dataVencimento = data_vencimento ? new Date(data_vencimento).toISOString().split('T')[0] : null;
    const dataFimRecorrencia = data_fim_recorrencia ? new Date(data_fim_recorrencia).toISOString().split('T')[0] : null;

    const result = await execute(`
      INSERT INTO despesas (
        titulo, descricao, valor, categoria_id, user_id, 
        data_vencimento, recorrencia, data_fim_recorrencia, 
        juros, multa, status, created_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', NOW())
    `, [titulo, descricao, valor, categoria_id, user_id, dataVencimento, recorrencia, dataFimRecorrencia, juros || 0, multa || 0]);

    return await this.findById(result.insertId, user_id);
  }

  async update(id, userId, expenseData) {
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

    // Converter datas para formato MySQL (YYYY-MM-DD)
    const dataVencimento = data_vencimento ? new Date(data_vencimento).toISOString().split('T')[0] : null;
    const dataFimRecorrencia = data_fim_recorrencia ? new Date(data_fim_recorrencia).toISOString().split('T')[0] : null;

    await execute(`
      UPDATE despesas SET 
        titulo = ?, descricao = ?, valor = ?, categoria_id = ?,
        data_vencimento = ?, recorrencia = ?, data_fim_recorrencia = ?,
        juros = ?, multa = ?, updated_date = NOW()
      WHERE id = ? AND user_id = ?
    `, [titulo, descricao, valor, categoria_id, dataVencimento, recorrencia, dataFimRecorrencia, juros || 0, multa || 0, id, userId]);

    return await this.findById(id, userId);
  }

  async delete(id, userId) {
    await execute('DELETE FROM despesas WHERE id = ? AND user_id = ?', [id, userId]);
    return { message: 'Despesa excluída com sucesso' };
  }

  async markAsPaid(id, userId) {
    // Primeiro, buscar a despesa para verificar se é recorrente
    const expense = await this.findById(id, userId);
    
    if (!expense) {
      throw new Error('Despesa não encontrada');
    }

    // Marcar como paga
    await execute(`
      UPDATE despesas SET 
        status = 'pago', 
        data_pagamento = NOW(),
        updated_date = NOW()
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    // Se é recorrente, criar a próxima despesa
    if (expense.recorrencia && expense.recorrencia !== 'nenhuma') {
      await this.createNextRecurringExpense(expense);
    }

    return await this.findById(id, userId);
  }

  async createNextRecurringExpense(expense) {
    // Calcular próxima data de vencimento
    const currentDate = new Date(expense.data_vencimento);
    let nextDate = new Date(currentDate);

    switch (expense.recorrencia) {
      case 'mensal':
        nextDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'trimestral':
        nextDate.setMonth(currentDate.getMonth() + 3);
        break;
      case 'semestral':
        nextDate.setMonth(currentDate.getMonth() + 6);
        break;
      case 'anual':
        nextDate.setFullYear(currentDate.getFullYear() + 1);
        break;
      default:
        return; // Não criar próxima se não for recorrente
    }

    // Verificar se não passou da data fim de recorrência
    if (expense.data_fim_recorrencia) {
      const dataFim = new Date(expense.data_fim_recorrencia);
      if (nextDate > dataFim) {
        return; // Não criar próxima se passou da data fim
      }
    }

    // Criar próxima despesa
    await execute(`
      INSERT INTO despesas (
        titulo, descricao, valor, categoria_id, user_id, 
        data_vencimento, recorrencia, data_fim_recorrencia, 
        juros, multa, status, created_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', NOW())
    `, [
      expense.titulo,
      expense.descricao,
      expense.valor,
      expense.categoria_id,
      expense.user_id,
      nextDate.toISOString().split('T')[0],
      expense.recorrencia,
      expense.data_fim_recorrencia,
      expense.juros || 0,
      expense.multa || 0
    ]);
  }

  async getStats(userId, filters = {}) {
    let whereClause = 'WHERE d.user_id = ?';
    const params = [userId];

    if (filters.mes && filters.ano) {
      whereClause += ' AND MONTH(d.data_vencimento) = ? AND YEAR(d.data_vencimento) = ?';
      params.push(filters.mes, filters.ano);
    }

    return await queryOne(`
      SELECT 
        COALESCE(SUM(valor), 0) as total_despesas,
        COALESCE(SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END), 0) as total_pago,
        COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END), 0) as total_pendente,
        COALESCE(SUM(CASE WHEN status = 'vencido' THEN valor ELSE 0 END), 0) as total_vencido,
        COUNT(*) as total_registros,
        COUNT(CASE WHEN status = 'pago' THEN 1 END) as despesas_pagas,
        COUNT(CASE WHEN status = 'pendente' THEN 1 END) as despesas_pendentes,
        COUNT(CASE WHEN status = 'vencido' THEN 1 END) as despesas_vencidas
      FROM despesas d
      ${whereClause}
    `, params);
  }

  async getByCategory(userId, filters = {}) {
    let whereClause = 'WHERE d.user_id = ?';
    const params = [userId];

    if (filters.mes && filters.ano) {
      whereClause += ' AND MONTH(d.data_vencimento) = ? AND YEAR(d.data_vencimento) = ?';
      params.push(filters.mes, filters.ano);
    }

    return await query(`
      SELECT 
        c.nome as categoria_nome,
        c.cor as categoria_cor,
        COALESCE(SUM(d.valor), 0) as total,
        COUNT(*) as quantidade
      FROM despesas d
      LEFT JOIN categorias c ON c.id = d.categoria_id
      ${whereClause}
      GROUP BY c.id, c.nome, c.cor
      ORDER BY total DESC
    `, params);
  }

  async getOverdue(userId) {
    return await query(`
      SELECT 
        d.*,
        c.nome as categoria_nome,
        c.cor as categoria_cor
      FROM despesas d
      LEFT JOIN categorias c ON c.id = d.categoria_id
      WHERE d.user_id = ? 
        AND d.status = 'pendente' 
        AND d.data_vencimento < CURDATE()
      ORDER BY d.data_vencimento ASC
    `, [userId]);
  }

  async calculateInterestAndPenalty(id, userId) {
    const despesa = await this.findById(id, userId);
    
    if (!despesa) {
      throw new Error('Despesa não encontrada');
    }

    if (despesa.status === 'pago') {
      return { juros: 0, multa: 0, total: 0 };
    }

    const hoje = new Date();
    const vencimento = new Date(despesa.data_vencimento);
    const diasAtraso = Math.max(0, Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24)));

    const juros = (despesa.valor * (despesa.juros / 100) * diasAtraso) / 30;
    const multa = despesa.valor * (despesa.multa / 100);
    const total = despesa.valor + juros + multa;

    return {
      juros: Math.max(0, juros),
      multa: Math.max(0, multa),
      total: total,
      diasAtraso: diasAtraso
    };
  }

  async bulkUpdateStatus(ids, userId, status) {
    const placeholders = ids.map(() => '?').join(',');
    await execute(`
      UPDATE despesas 
      SET status = ?, updated_date = NOW()
      WHERE id IN (${placeholders}) AND user_id = ?
    `, [status, ...ids, userId]);

    return { message: `${ids.length} despesas atualizadas com sucesso` };
  }
}

module.exports = new ExpenseRepository(); 