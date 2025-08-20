const { query, queryOne } = require('../database');
const TaxService = require('./TaxService');

class RevenueService {
  constructor() {
    this.taxService = new TaxService();
  }

  async getRevenues(userId, filters = {}) {
    let whereClause = 'WHERE r.user_id = ?';
    const params = [userId];

    if (filters.mes && filters.ano) {
      whereClause += ' AND MONTH(r.data_recebimento) = ? AND YEAR(r.data_recebimento) = ?';
      params.push(filters.mes, filters.ano);
    }

    if (filters.categoria_id) {
      whereClause += ' AND r.categoria_id = ?';
      params.push(filters.categoria_id);
    }

    if (filters.status) {
      whereClause += ' AND r.status = ?';
      params.push(filters.status);
    }

    return await query(`
      SELECT 
        r.*,
        c.nome as categoria_nome,
        c.cor as categoria_cor
      FROM receitas r
      LEFT JOIN categorias c ON c.id = r.categoria_id
      ${whereClause}
      ORDER BY r.data_recebimento DESC
    `, params);
  }

  async createRevenue(userId, revenueData) {
    const {
      titulo,
      descricao,
      valor,
      categoria_id,
      data_recebimento,
      recorrencia,
      data_fim_recorrencia,
      tem_impostos,
      ir_percentual,
      inss_percentual,
      fgts_percentual
    } = revenueData;

    let valorLiquido = valor;
    let irValor = 0;
    let inssValor = 0;
    let fgtsValor = 0;

    // Calcular impostos automaticamente se for salário
    if (tem_impostos) {
      const impostos = await this.taxService.calculateSalaryTaxes(valor);
      valorLiquido = impostos.valor_liquido;
      irValor = impostos.ir_valor;
      inssValor = impostos.inss_valor;
      fgtsValor = impostos.fgts_valor;
    }

    const result = await query(`
      INSERT INTO receitas (
        titulo, descricao, valor, valor_liquido, categoria_id, user_id,
        data_recebimento, recorrencia, data_fim_recorrencia,
        tem_impostos, ir_percentual, ir_valor, inss_percentual, inss_valor,
        fgts_percentual, fgts_valor, status, created_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', NOW())
    `, [
      titulo, descricao, valor, valorLiquido, categoria_id, userId,
      data_recebimento, recorrencia, data_fim_recorrencia,
      tem_impostos, ir_percentual || 0, irValor, inss_percentual || 0, inssValor,
      fgts_percentual || 0, fgtsValor
    ]);

    return await this.getRevenueById(result.insertId, userId);
  }

  async updateRevenue(revenueId, userId, revenueData) {
    const {
      titulo,
      descricao,
      valor,
      categoria_id,
      data_recebimento,
      recorrencia,
      data_fim_recorrencia,
      tem_impostos,
      ir_percentual,
      inss_percentual,
      fgts_percentual
    } = revenueData;

    let valorLiquido = valor;
    let irValor = 0;
    let inssValor = 0;
    let fgtsValor = 0;

    // Recalcular impostos se necessário
    if (tem_impostos) {
      const impostos = await this.taxService.calculateSalaryTaxes(valor);
      valorLiquido = impostos.valor_liquido;
      irValor = impostos.ir_valor;
      inssValor = impostos.inss_valor;
      fgtsValor = impostos.fgts_valor;
    }

    await query(`
      UPDATE receitas SET 
        titulo = ?, descricao = ?, valor = ?, valor_liquido = ?, categoria_id = ?,
        data_recebimento = ?, recorrencia = ?, data_fim_recorrencia = ?,
        tem_impostos = ?, ir_percentual = ?, ir_valor = ?, inss_percentual = ?, inss_valor = ?,
        fgts_percentual = ?, fgts_valor = ?, updated_date = NOW()
      WHERE id = ? AND user_id = ?
    `, [
      titulo, descricao, valor, valorLiquido, categoria_id,
      data_recebimento, recorrencia, data_fim_recorrencia,
      tem_impostos, ir_percentual || 0, irValor, inss_percentual || 0, inssValor,
      fgts_percentual || 0, fgtsValor, revenueId, userId
    ]);

    return await this.getRevenueById(revenueId, userId);
  }

  async deleteRevenue(revenueId, userId) {
    await query('DELETE FROM receitas WHERE id = ? AND user_id = ?', [revenueId, userId]);
    return { message: 'Receita excluída com sucesso' };
  }

  async markAsReceived(revenueId, userId) {
    await query(`
      UPDATE receitas SET 
        status = 'recebido', 
        data_recebimento_real = NOW(),
        updated_date = NOW()
      WHERE id = ? AND user_id = ?
    `, [revenueId, userId]);

    return await this.getRevenueById(revenueId, userId);
  }

  async getRevenueById(revenueId, userId) {
    return await queryOne(`
      SELECT 
        r.*,
        c.nome as categoria_nome,
        c.cor as categoria_cor
      FROM receitas r
      LEFT JOIN categorias c ON c.id = r.categoria_id
      WHERE r.id = ? AND r.user_id = ?
    `, [revenueId, userId]);
  }

  async getRevenueStats(userId, filters = {}) {
    let whereClause = 'WHERE r.user_id = ?';
    const params = [userId];

    if (filters.mes && filters.ano) {
      whereClause += ' AND MONTH(r.data_recebimento) = ? AND YEAR(r.data_recebimento) = ?';
      params.push(filters.mes, filters.ano);
    }

    const stats = await queryOne(`
      SELECT 
        COUNT(*) as total_receitas,
        SUM(CASE WHEN status = 'recebido' THEN valor ELSE 0 END) as total_recebido,
        SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as total_pendente,
        AVG(valor) as valor_medio,
        SUM(CASE WHEN tem_impostos = 1 THEN valor_liquido ELSE valor END) as total_liquido,
        SUM(CASE WHEN tem_impostos = 1 THEN (valor - valor_liquido) ELSE 0 END) as total_impostos
      FROM receitas r
      ${whereClause}
    `, params);

    return stats;
  }

  async getRevenuesByCategory(userId, filters = {}) {
    let whereClause = 'WHERE r.user_id = ?';
    const params = [userId];

    if (filters.mes && filters.ano) {
      whereClause += ' AND MONTH(r.data_recebimento) = ? AND YEAR(r.data_recebimento) = ?';
      params.push(filters.mes, filters.ano);
    }

    return await query(`
      SELECT 
        c.nome as categoria,
        c.cor as categoria_cor,
        COUNT(r.id) as quantidade,
        SUM(r.valor) as valor_total,
        SUM(CASE WHEN r.tem_impostos = 1 THEN r.valor_liquido ELSE r.valor END) as valor_liquido_total,
        AVG(r.valor) as valor_medio
      FROM receitas r
      LEFT JOIN categorias c ON c.id = r.categoria_id
      ${whereClause}
      GROUP BY c.id, c.nome, c.cor
      ORDER BY valor_total DESC
    `, params);
  }

  async getTaxSummary(userId, filters = {}) {
    let whereClause = 'WHERE r.user_id = ? AND r.tem_impostos = 1';
    const params = [userId];

    if (filters.mes && filters.ano) {
      whereClause += ' AND MONTH(r.data_recebimento) = ? AND YEAR(r.data_recebimento) = ?';
      params.push(filters.mes, filters.ano);
    }

    return await queryOne(`
      SELECT 
        SUM(r.valor) as total_bruto,
        SUM(r.valor_liquido) as total_liquido,
        SUM(r.ir_valor) as total_ir,
        SUM(r.inss_valor) as total_inss,
        SUM(r.fgts_valor) as total_fgts,
        SUM(r.valor - r.valor_liquido) as total_impostos
      FROM receitas r
      ${whereClause}
    `, params);
  }

  async recalculateTaxes(revenueId, userId) {
    const revenue = await this.getRevenueById(revenueId, userId);
    
    if (!revenue || !revenue.tem_impostos) {
      return revenue;
    }

    const impostos = await this.taxService.calculateSalaryTaxes(revenue.valor);
    
    await query(`
      UPDATE receitas SET 
        valor_liquido = ?,
        ir_valor = ?,
        inss_valor = ?,
        fgts_valor = ?,
        updated_date = NOW()
      WHERE id = ? AND user_id = ?
    `, [
      impostos.valor_liquido,
      impostos.ir_valor,
      impostos.inss_valor,
      impostos.fgts_valor,
      revenueId,
      userId
    ]);

    return await this.getRevenueById(revenueId, userId);
  }
}

module.exports = new RevenueService(); 