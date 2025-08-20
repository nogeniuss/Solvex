const { query, queryOne, execute } = require('../database');

class RevenueRepository {
  async findAll(userId, filters = {}) {
    try {
      let sql = `
        SELECT r.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor,
               c.icone as categoria_icone
        FROM receitas r
        LEFT JOIN categorias c ON r.categoria_id = c.id
        WHERE r.user_id = ?
      `;
      
      const params = [userId];
      
      // Aplicar filtros
      if (filters.status) {
        sql += ' AND r.status = ?';
        params.push(filters.status);
      }
      
      if (filters.categoria_id) {
        sql += ' AND r.categoria_id = ?';
        params.push(filters.categoria_id);
      }
      
      if (filters.data_inicio) {
        sql += ' AND r.data_recebimento >= ?';
        params.push(filters.data_inicio);
      }
      
      if (filters.data_fim) {
        sql += ' AND r.data_recebimento <= ?';
        params.push(filters.data_fim);
      }
      

      
      sql += ' ORDER BY r.data_recebimento DESC';
      
      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }
      
      return await query(sql, params);
    } catch (error) {
      console.error('Erro ao buscar receitas:', error);
      throw error;
    }
  }

  async findById(id, userId) {
    try {
      return await queryOne(`
        SELECT r.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor,
               c.icone as categoria_icone
        FROM receitas r
        LEFT JOIN categorias c ON r.categoria_id = c.id
        WHERE r.id = ? AND r.user_id = ?
      `, [id, userId]);
    } catch (error) {
      console.error('Erro ao buscar receita:', error);
      throw error;
    }
  }

  async create(revenueData) {
    try {
      const {
        titulo, descricao, valor, data_recebimento, categoria_id, user_id,
        recorrencia, data_fim_recorrencia,
        tem_impostos, valor_ir, valor_inss, valor_fgts, outros_descontos, observacoes
      } = revenueData;

      // Calcular valor líquido se houver impostos
      let valorLiquido = null;
      if (tem_impostos) {
        const valorNum = parseFloat(valor) || 0;
        const irNum = parseFloat(valor_ir) || 0;
        const inssNum = parseFloat(valor_inss) || 0;
        const fgtsNum = parseFloat(valor_fgts) || 0;
        const outrosNum = parseFloat(outros_descontos) || 0;
        
        valorLiquido = valorNum - irNum - inssNum - fgtsNum - outrosNum;
      }

      const result = await execute(`
        INSERT INTO receitas (
          titulo, descricao, valor, valor_liquido, data_recebimento, categoria_id, user_id,
          recorrencia, data_fim_recorrencia, tem_impostos, ir_valor, inss_valor, fgts_valor
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        titulo, descricao || '', valor, valorLiquido, data_recebimento, categoria_id || null, user_id,
        recorrencia || 'nenhuma', data_fim_recorrencia || null,
        tem_impostos || false, valor_ir || 0, valor_inss || 0, valor_fgts || 0
      ]);

      return await this.findById(result.insertId, user_id);
    } catch (error) {
      console.error('Erro ao criar receita:', error);
      throw error;
    }
  }

  async update(id, userId, revenueData) {
    try {
      const {
        titulo, descricao, valor, data_recebimento, categoria_id,
        recorrencia, data_fim_recorrencia,
        tem_impostos, valor_ir, valor_inss, valor_fgts, outros_descontos, observacoes,
        status, data_efetivacao
      } = revenueData;

      // Calcular valor líquido se houver impostos
      let valorLiquido = null;
      if (tem_impostos) {
        const valorNum = parseFloat(valor) || 0;
        const irNum = parseFloat(valor_ir) || 0;
        const inssNum = parseFloat(valor_inss) || 0;
        const fgtsNum = parseFloat(valor_fgts) || 0;
        const outrosNum = parseFloat(outros_descontos) || 0;
        
        valorLiquido = valorNum - irNum - inssNum - fgtsNum - outrosNum;
      }

      await execute(`
        UPDATE receitas SET 
          titulo = ?, descricao = ?, valor = ?, valor_liquido = ?,
          data_recebimento = ?, data_recebimento_real = ?, status = ?, categoria_id = ?,
          recorrencia = ?, data_fim_recorrencia = ?, tem_impostos = ?, ir_valor = ?, inss_valor = ?,
          fgts_valor = ?
        WHERE id = ? AND user_id = ?
      `, [
        titulo, descricao || '', valor, valorLiquido, data_recebimento,
        data_efetivacao || null, status || 'pendente', categoria_id || null,
        recorrencia || 'nenhuma', data_fim_recorrencia || null,
        tem_impostos || false, valor_ir || 0, valor_inss || 0,
        valor_fgts || 0, id, userId
      ]);

      return await this.findById(id, userId);
    } catch (error) {
      console.error('Erro ao atualizar receita:', error);
      throw error;
    }
  }

  async delete(id, userId) {
    try {
      const result = await execute('DELETE FROM receitas WHERE id = ? AND user_id = ?', [id, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar receita:', error);
      throw error;
    }
  }

  async markAsReceived(id, userId, dataEfetivacao) {
    try {
      const receita = await this.findById(id, userId);
      
      if (!receita) {
        throw new Error('Receita não encontrada');
      }

      if (receita.status === 'recebido') {
        throw new Error('Receita já foi recebida');
      }

      await execute(`
        UPDATE receitas SET 
          status = 'recebido', 
          data_recebimento_real = ?
        WHERE id = ? AND user_id = ?
      `, [
        dataEfetivacao || new Date().toISOString().split('T')[0],
        id, userId
      ]);

      return await this.findById(id, userId);
    } catch (error) {
      console.error('Erro ao marcar receita como recebida:', error);
      throw error;
    }
  }

  async getStats(userId, filters = {}) {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
          SUM(CASE WHEN status = 'recebido' THEN 1 ELSE 0 END) as recebidas,
          SUM(CASE WHEN status = 'recebido' THEN valor ELSE 0 END) as valor_recebido,
          SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as valor_pendente,
          SUM(valor) as valor_total
        FROM receitas 
        WHERE user_id = ?
      `;
      
      const params = [userId];
      
      if (filters.data_inicio) {
        sql += ' AND data_recebimento >= ?';
        params.push(filters.data_inicio);
      }
      
      if (filters.data_fim) {
        sql += ' AND data_recebimento <= ?';
        params.push(filters.data_fim);
      }
      
      return await queryOne(sql, params);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de receitas:', error);
      throw error;
    }
  }

  async getByCategory(userId, filters = {}) {
    try {
      let sql = `
        SELECT 
          c.nome as categoria,
          c.cor as categoria_cor,
          COUNT(*) as quantidade,
          SUM(r.valor) as valor_total,
          SUM(CASE WHEN r.status = 'recebido' THEN r.valor ELSE 0 END) as valor_recebido
        FROM receitas r
        LEFT JOIN categorias c ON r.categoria_id = c.id
        WHERE r.user_id = ?
      `;
      
      const params = [userId];
      
      if (filters.data_inicio) {
        sql += ' AND r.data_recebimento >= ?';
        params.push(filters.data_inicio);
      }
      
      if (filters.data_fim) {
        sql += ' AND r.data_recebimento <= ?';
        params.push(filters.data_fim);
      }
      
      sql += ' GROUP BY c.id, c.nome, c.cor ORDER BY valor_total DESC';
      
      return await query(sql, params);
    } catch (error) {
      console.error('Erro ao buscar receitas por categoria:', error);
      throw error;
    }
  }

  async getPending(userId) {
    try {
      return await query(`
        SELECT r.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor
        FROM receitas r
        LEFT JOIN categorias c ON r.categoria_id = c.id
        WHERE r.user_id = ? AND r.status = 'pendente'
        ORDER BY r.data_recebimento ASC
      `, [userId]);
    } catch (error) {
      console.error('Erro ao buscar receitas pendentes:', error);
      throw error;
    }
  }
}

module.exports = new RevenueRepository(); 