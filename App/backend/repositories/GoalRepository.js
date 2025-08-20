const { query, queryOne, execute } = require('../database');

class GoalRepository {
  async findAll(userId, filters = {}) {
    try {
      let sql = `
        SELECT m.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor,
               c.icone as categoria_icone
        FROM metas m
        LEFT JOIN categorias c ON m.categoria_id = c.id
        WHERE m.user_id = ?
      `;
      
      const params = [userId];
      
      // Aplicar filtros
      if (filters.status && filters.status !== 'todas') {
        sql += ' AND m.status = ?';
        params.push(filters.status);
      }
      
      if (filters.tipo && filters.tipo !== 'todos') {
        sql += ' AND m.tipo_meta = ?';
        params.push(filters.tipo);
      }
      
      if (filters.categoria_id) {
        sql += ' AND m.categoria_id = ?';
        params.push(filters.categoria_id);
      }
      
      sql += ' ORDER BY m.data_fim ASC, m.created_date DESC';
      
      return await query(sql, params);
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      throw error;
    }
  }

  async findById(id, userId) {
    try {
      return await queryOne(`
        SELECT m.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor,
               c.icone as categoria_icone
        FROM metas m
        LEFT JOIN categorias c ON m.categoria_id = c.id
        WHERE m.id = ? AND m.user_id = ?
      `, [id, userId]);
    } catch (error) {
      console.error('Erro ao buscar meta:', error);
      throw error;
    }
  }

  async create(goalData) {
    try {
      const {
        titulo, descricao, valor_meta, valor_atual, data_inicio, data_fim,
        categoria_id, tipo_meta, user_id
      } = goalData;

      const result = await execute(`
        INSERT INTO metas (
          titulo, descricao, valor_meta, valor_atual, data_inicio, data_fim,
          categoria_id, tipo_meta, user_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativa')
      `, [
        titulo, descricao || '', valor_meta, valor_atual || 0, data_inicio, data_fim,
        categoria_id || null, tipo_meta || 'economia', user_id
      ]);

      return await this.findById(result.insertId, user_id);
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      throw error;
    }
  }

  async update(id, userId, goalData) {
    try {
      const {
        titulo, descricao, valor_meta, valor_atual, data_inicio, data_fim,
        categoria_id, tipo_meta, status
      } = goalData;

      await execute(`
        UPDATE metas SET 
          titulo = ?, descricao = ?, valor_meta = ?, valor_atual = ?,
          data_inicio = ?, data_fim = ?, categoria_id = ?, tipo_meta = ?, status = ?
        WHERE id = ? AND user_id = ?
      `, [
        titulo, descricao || '', valor_meta, valor_atual || 0, data_inicio, data_fim,
        categoria_id || null, tipo_meta || 'economia', status || 'ativa', id, userId
      ]);

      return await this.findById(id, userId);
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      throw error;
    }
  }

  async delete(id, userId) {
    try {
      const result = await execute('DELETE FROM metas WHERE id = ? AND user_id = ?', [id, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar meta:', error);
      throw error;
    }
  }

  async updateProgress(id, userId, valorAtual) {
    try {
      const meta = await this.findById(id, userId);
      
      if (!meta) {
        throw new Error('Meta não encontrada');
      }

      if (meta.status !== 'ativa') {
        throw new Error('Não é possível atualizar uma meta que não está ativa');
      }

      // Verificar se a meta foi atingida
      let novoStatus = meta.status;
      if (valorAtual >= meta.valor_meta) {
        novoStatus = 'concluida';
      }

      await execute(`
        UPDATE metas SET 
          valor_atual = ?, status = ?
        WHERE id = ? AND user_id = ?
      `, [valorAtual, novoStatus, id, userId]);

      return await this.findById(id, userId);
    } catch (error) {
      console.error('Erro ao atualizar progresso da meta:', error);
      throw error;
    }
  }

  async getStats(userId, filters = {}) {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'ativa' THEN 1 ELSE 0 END) as ativas,
          SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as concluidas,
          SUM(CASE WHEN status = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
          SUM(valor_meta) as valor_total_meta,
          SUM(valor_atual) as valor_total_atual,
          AVG((valor_atual / valor_meta) * 100) as progresso_medio
        FROM metas 
        WHERE user_id = ?
      `;
      
      const params = [userId];
      
      if (filters.tipo) {
        sql += ' AND tipo_meta = ?';
        params.push(filters.tipo);
      }
      
      return await queryOne(sql, params);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de metas:', error);
      throw error;
    }
  }

  async getByType(userId, type) {
    try {
      return await query(`
        SELECT m.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor
        FROM metas m
        LEFT JOIN categorias c ON m.categoria_id = c.id
        WHERE m.user_id = ? AND m.tipo_meta = ?
        ORDER BY m.data_fim ASC
      `, [userId, type]);
    } catch (error) {
      console.error('Erro ao buscar metas por tipo:', error);
      throw error;
    }
  }

  async getActive(userId) {
    try {
      return await query(`
        SELECT m.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor
        FROM metas m
        LEFT JOIN categorias c ON m.categoria_id = c.id
        WHERE m.user_id = ? AND m.status = 'ativa'
        ORDER BY m.data_fim ASC
      `, [userId]);
    } catch (error) {
      console.error('Erro ao buscar metas ativas:', error);
      throw error;
    }
  }

  async getOverdue(userId) {
    try {
      return await query(`
        SELECT m.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor
        FROM metas m
        LEFT JOIN categorias c ON m.categoria_id = c.id
        WHERE m.user_id = ? AND m.status = 'ativa' AND m.data_fim < CURDATE()
        ORDER BY m.data_fim ASC
      `, [userId]);
    } catch (error) {
      console.error('Erro ao buscar metas vencidas:', error);
      throw error;
    }
  }

  async calculateProgress(id, userId) {
    try {
      const meta = await this.findById(id, userId);
      
      if (!meta) {
        throw new Error('Meta não encontrada');
      }

      const progresso = (meta.valor_atual / meta.valor_meta) * 100;
      const diasRestantes = Math.ceil((new Date(meta.data_fim) - new Date()) / (1000 * 60 * 60 * 24));
      
      return {
        progresso: Math.min(progresso, 100),
        diasRestantes: Math.max(diasRestantes, 0),
        valorRestante: Math.max(meta.valor_meta - meta.valor_atual, 0),
        status: meta.status
      };
    } catch (error) {
      console.error('Erro ao calcular progresso da meta:', error);
      throw error;
    }
  }
}

module.exports = new GoalRepository(); 