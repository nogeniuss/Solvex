const { query, queryOne, execute } = require('../database');

class InvestmentRepository {
  async findAll(userId, filters = {}) {
    try {
      let sql = `
        SELECT i.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor,
               c.icone as categoria_icone
        FROM investimentos i
        LEFT JOIN categorias c ON i.categoria_id = c.id
        WHERE i.user_id = ?
      `;
      
      const params = [userId];
      
      // Aplicar filtros
      if (filters.status && filters.status !== '') {
        sql += ' AND i.status = ?';
        params.push(filters.status);
      }
      
      if (filters.tipo && filters.tipo !== '') {
        sql += ' AND i.tipo = ?';
        params.push(filters.tipo);
      }
      
      if (filters.categoria_id) {
        sql += ' AND i.categoria_id = ?';
        params.push(filters.categoria_id);
      }
      
      if (filters.instituicao) {
        sql += ' AND i.instituicao LIKE ?';
        params.push(`%${filters.instituicao}%`);
      }
      
      sql += ' ORDER BY i.data_investimento DESC';
      
      return await query(sql, params);
    } catch (error) {
      console.error('Erro ao buscar investimentos:', error);
      throw error;
    }
  }

  async findById(id, userId) {
    try {
      return await queryOne(`
        SELECT i.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor,
               c.icone as categoria_icone
        FROM investimentos i
        LEFT JOIN categorias c ON i.categoria_id = c.id
        WHERE i.id = ? AND i.user_id = ?
      `, [id, userId]);
    } catch (error) {
      console.error('Erro ao buscar investimento:', error);
      throw error;
    }
  }

  async create(investmentData) {
    try {
      const {
        titulo, descricao, valor_investido, valor_atual, data_investimento,
        data_vencimento, tipo, instituicao, rentabilidade, risco, categoria_id, user_id
      } = investmentData;

      const result = await execute(`
        INSERT INTO investimentos (
          titulo, descricao, valor_investido, valor_atual, data_investimento,
          data_vencimento, tipo, instituicao, rentabilidade, risco, categoria_id, user_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo')
      `, [
        titulo, descricao || '', valor_investido, valor_atual || valor_investido, data_investimento,
        data_vencimento || null, tipo, instituicao || '', rentabilidade || null, risco || 'medio',
        categoria_id || null, user_id
      ]);

      return await this.findById(result.insertId, user_id);
    } catch (error) {
      console.error('Erro ao criar investimento:', error);
      throw error;
    }
  }

  async update(id, userId, investmentData) {
    try {
      const {
        titulo, descricao, valor_investido, valor_atual, data_investimento,
        data_vencimento, tipo, instituicao, rentabilidade, risco, categoria_id, status
      } = investmentData;

      await execute(`
        UPDATE investimentos SET 
          titulo = ?, descricao = ?, valor_investido = ?, valor_atual = ?,
          data_investimento = ?, data_vencimento = ?, tipo = ?, instituicao = ?,
          rentabilidade = ?, risco = ?, categoria_id = ?, status = ?
        WHERE id = ? AND user_id = ?
      `, [
        titulo, descricao || '', valor_investido, valor_atual || valor_investido, data_investimento,
        data_vencimento || null, tipo, instituicao || '', rentabilidade || null, risco || 'medio',
        categoria_id || null, status || 'ativo', id, userId
      ]);

      return await this.findById(id, userId);
    } catch (error) {
      console.error('Erro ao atualizar investimento:', error);
      throw error;
    }
  }

  async delete(id, userId) {
    try {
      const result = await execute('DELETE FROM investimentos WHERE id = ? AND user_id = ?', [id, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar investimento:', error);
      throw error;
    }
  }

  async updateValue(id, userId, valorAtual) {
    try {
      const investimento = await this.findById(id, userId);
      
      if (!investimento) {
        throw new Error('Investimento não encontrado');
      }

      await execute(`
        UPDATE investimentos SET valor_atual = ?
        WHERE id = ? AND user_id = ?
      `, [valorAtual, id, userId]);

      return await this.findById(id, userId);
    } catch (error) {
      console.error('Erro ao atualizar valor do investimento:', error);
      throw error;
    }
  }

  async getStats(userId, filters = {}) {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as ativos,
          SUM(CASE WHEN status = 'resgatado' THEN 1 ELSE 0 END) as resgatados,
          SUM(CASE WHEN status = 'vencido' THEN 1 ELSE 0 END) as vencidos,
          SUM(valor_investido) as valor_total_investido,
          SUM(valor_atual) as valor_total_atual,
          SUM(valor_atual - valor_investido) as lucro_prejuizo_total,
          AVG(((valor_atual - valor_investido) / valor_investido) * 100) as rentabilidade_media
        FROM investimentos 
        WHERE user_id = ?
      `;
      
      const params = [userId];
      
      if (filters.tipo) {
        sql += ' AND tipo = ?';
        params.push(filters.tipo);
      }
      
      if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
      }
      
      return await queryOne(sql, params);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de investimentos:', error);
      throw error;
    }
  }

  async getByType(userId, type) {
    try {
      return await query(`
        SELECT i.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor
        FROM investimentos i
        LEFT JOIN categorias c ON i.categoria_id = c.id
        WHERE i.user_id = ? AND i.tipo = ?
        ORDER BY i.data_investimento DESC
      `, [userId, type]);
    } catch (error) {
      console.error('Erro ao buscar investimentos por tipo:', error);
      throw error;
    }
  }

  async getByStatus(userId, status) {
    try {
      return await query(`
        SELECT i.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor
        FROM investimentos i
        LEFT JOIN categorias c ON i.categoria_id = c.id
        WHERE i.user_id = ? AND i.status = ?
        ORDER BY i.data_investimento DESC
      `, [userId, status]);
    } catch (error) {
      console.error('Erro ao buscar investimentos por status:', error);
      throw error;
    }
  }

  async getActive(userId) {
    try {
      return await query(`
        SELECT i.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor
        FROM investimentos i
        LEFT JOIN categorias c ON i.categoria_id = c.id
        WHERE i.user_id = ? AND i.status = 'ativo'
        ORDER BY i.data_investimento DESC
      `, [userId]);
    } catch (error) {
      console.error('Erro ao buscar investimentos ativos:', error);
      throw error;
    }
  }

  async getMature(userId) {
    try {
      return await query(`
        SELECT i.*, 
               c.nome as categoria_nome, 
               c.cor as categoria_cor
        FROM investimentos i
        LEFT JOIN categorias c ON i.categoria_id = c.id
        WHERE i.user_id = ? AND i.status = 'ativo' AND i.data_vencimento <= CURDATE()
        ORDER BY i.data_vencimento ASC
      `, [userId]);
    } catch (error) {
      console.error('Erro ao buscar investimentos vencidos:', error);
      throw error;
    }
  }

  async calculatePerformance(id, userId) {
    try {
      const investimento = await this.findById(id, userId);
      
      if (!investimento) {
        throw new Error('Investimento não encontrado');
      }

      const lucroPrejuizo = investimento.valor_atual - investimento.valor_investido;
      const rentabilidade = ((investimento.valor_atual - investimento.valor_investido) / investimento.valor_investido) * 100;
      
      // Calcular tempo de investimento
      const dataInicio = new Date(investimento.data_investimento);
      const dataAtual = new Date();
      const diasInvestimento = Math.ceil((dataAtual - dataInicio) / (1000 * 60 * 60 * 24));
      
      // Rentabilidade anualizada
      const rentabilidadeAnualizada = diasInvestimento > 0 ? (rentabilidade / diasInvestimento) * 365 : 0;
      
      return {
        lucroPrejuizo,
        rentabilidade: rentabilidade.toFixed(2),
        rentabilidadeAnualizada: rentabilidadeAnualizada.toFixed(2),
        diasInvestimento,
        valorInvestido: investimento.valor_investido,
        valorAtual: investimento.valor_atual
      };
    } catch (error) {
      console.error('Erro ao calcular performance do investimento:', error);
      throw error;
    }
  }

  async getPortfolioSummary(userId) {
    try {
      const summary = await query(`
        SELECT 
          tipo,
          COUNT(*) as quantidade,
          SUM(valor_investido) as valor_investido,
          SUM(valor_atual) as valor_atual,
          SUM(valor_atual - valor_investido) as lucro_prejuizo,
          AVG(((valor_atual - valor_investido) / valor_investido) * 100) as rentabilidade_media
        FROM investimentos 
        WHERE user_id = ? AND status = 'ativo'
        GROUP BY tipo
        ORDER BY valor_atual DESC
      `, [userId]);

      return summary;
    } catch (error) {
      console.error('Erro ao buscar resumo do portfólio:', error);
      throw error;
    }
  }
}

module.exports = new InvestmentRepository(); 