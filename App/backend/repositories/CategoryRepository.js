const { query, queryOne, execute } = require('../database');

class CategoryRepository {
  async findAll(userId, filters = {}) {
    try {
      let sql = `
        SELECT * FROM categorias 
        WHERE (user_id = ? OR user_id IS NULL) AND ativo = TRUE
      `;
      
      const params = [userId];
      
      // Aplicar filtros
      if (filters.tipo) {
        sql += ' AND tipo = ?';
        params.push(filters.tipo);
      }
      
      if (filters.nome) {
        sql += ' AND nome LIKE ?';
        params.push(`%${filters.nome}%`);
      }
      
      sql += ' ORDER BY nome ASC';
      
      return await query(sql, params);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }
  }

  async findById(id, userId) {
    try {
      return await queryOne(`
        SELECT * FROM categorias 
        WHERE id = ? AND (user_id = ? OR user_id IS NULL) AND ativo = TRUE
      `, [id, userId]);
    } catch (error) {
      console.error('Erro ao buscar categoria:', error);
      throw error;
    }
  }

  async findByName(name, userId) {
    try {
      return await queryOne(`
        SELECT * FROM categorias 
        WHERE nome = ? AND (user_id = ? OR user_id IS NULL) AND ativo = TRUE
      `, [name, userId]);
    } catch (error) {
      console.error('Erro ao buscar categoria por nome:', error);
      throw error;
    }
  }

  async create(categoryData) {
    try {
      const {
        nome, descricao, cor, icone, tipo, meta_mensal, user_id
      } = categoryData;

      // Verificar se já existe uma categoria com o mesmo nome
      const existingCategory = await this.findByName(nome, user_id);
      if (existingCategory) {
        throw new Error('Já existe uma categoria com este nome');
      }

      const result = await execute(`
        INSERT INTO categorias (
          nome, descricao, cor, icone, tipo, meta_mensal, user_id, ativo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
      `, [
        nome, descricao || '', cor, icone || '', tipo || 'despesa', 
        meta_mensal || null, user_id
      ]);

      return await this.findById(result.insertId, user_id);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      throw error;
    }
  }

  async update(id, userId, categoryData) {
    try {
      const {
        nome, descricao, cor, icone, tipo, meta_mensal
      } = categoryData;

      // Verificar se a categoria existe e pertence ao usuário
      const existingCategory = await this.findById(id, userId);
      if (!existingCategory) {
        throw new Error('Categoria não encontrada');
      }

      // Verificar se já existe outra categoria com o mesmo nome
      const duplicateCategory = await queryOne(`
        SELECT * FROM categorias 
        WHERE nome = ? AND id != ? AND (user_id = ? OR user_id IS NULL) AND ativo = TRUE
      `, [nome, id, userId]);
      
      if (duplicateCategory) {
        throw new Error('Já existe uma categoria com este nome');
      }

      await execute(`
        UPDATE categorias SET 
          nome = ?, descricao = ?, cor = ?, icone = ?, tipo = ?, meta_mensal = ?
        WHERE id = ? AND (user_id = ? OR user_id IS NULL)
      `, [
        nome, descricao || '', cor, icone || '', tipo || 'despesa', 
        meta_mensal || null, id, userId
      ]);

      return await this.findById(id, userId);
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      throw error;
    }
  }

  async delete(id, userId) {
    try {
      // Verificar se a categoria existe e pertence ao usuário
      const category = await this.findById(id, userId);
      if (!category) {
        throw new Error('Categoria não encontrada');
      }

      // Verificar se há despesas ou receitas usando esta categoria
      const despesas = await queryOne(`
        SELECT COUNT(*) as count FROM despesas WHERE categoria_id = ? AND user_id = ?
      `, [id, userId]);

      const receitas = await queryOne(`
        SELECT COUNT(*) as count FROM receitas WHERE categoria_id = ? AND user_id = ?
      `, [id, userId]);

      if (despesas.count > 0 || receitas.count > 0) {
        throw new Error('Não é possível deletar uma categoria que possui despesas ou receitas associadas');
      }

      // Soft delete - marcar como inativa
      const result = await execute(`
        UPDATE categorias SET ativo = FALSE 
        WHERE id = ? AND (user_id = ? OR user_id IS NULL)
      `, [id, userId]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      throw error;
    }
  }

  async getStats(userId, filters = {}) {
    try {
      let sql = `
        SELECT 
          c.id,
          c.nome,
          c.cor,
          c.icone,
          COUNT(d.id) as total_despesas,
          SUM(d.valor) as total_valor_despesas,
          COUNT(r.id) as total_receitas,
          SUM(r.valor) as total_valor_receitas
        FROM categorias c
        LEFT JOIN despesas d ON c.id = d.categoria_id AND d.user_id = ?
        LEFT JOIN receitas r ON c.id = r.categoria_id AND r.user_id = ?
        WHERE (c.user_id = ? OR c.user_id IS NULL) AND c.ativo = TRUE
      `;
      
      const params = [userId, userId, userId];
      
      if (filters.data_inicio) {
        sql += ' AND (d.data_vencimento >= ? OR r.data_recebimento >= ?)';
        params.push(filters.data_inicio, filters.data_inicio);
      }
      
      if (filters.data_fim) {
        sql += ' AND (d.data_vencimento <= ? OR r.data_recebimento <= ?)';
        params.push(filters.data_fim, filters.data_fim);
      }
      
      sql += ' GROUP BY c.id, c.nome, c.cor, c.icone ORDER BY total_valor_despesas DESC';
      
      return await query(sql, params);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de categorias:', error);
      throw error;
    }
  }

  async getByType(userId, type) {
    try {
      return await query(`
        SELECT * FROM categorias 
        WHERE tipo = ? AND (user_id = ? OR user_id IS NULL) AND ativo = TRUE
        ORDER BY nome ASC
      `, [type, userId]);
    } catch (error) {
      console.error('Erro ao buscar categorias por tipo:', error);
      throw error;
    }
  }

  async getDefaultCategories() {
    try {
      return await query(`
        SELECT * FROM categorias 
        WHERE user_id IS NULL AND ativo = TRUE
        ORDER BY nome ASC
      `);
    } catch (error) {
      console.error('Erro ao buscar categorias padrão:', error);
      throw error;
    }
  }
}

module.exports = new CategoryRepository(); 