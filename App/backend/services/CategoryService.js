const { query, queryOne } = require('../database');

class CategoryService {
  async getCategories(userId) {
    return await query(`
      SELECT 
        c.*,
        CASE WHEN c.user_id IS NULL THEN 'sistema' ELSE 'personalizada' END as origem
      FROM categorias c
      WHERE (c.user_id IS NULL OR c.user_id = ?) AND c.deleted_at IS NULL
      ORDER BY c.nome
    `, [userId]);
  }

  async createCategory(userId, categoryData) {
    const { nome, descricao, cor, icone } = categoryData;

    // Verificar se já existe categoria com o mesmo nome (sistema ou usuário)
    const existingCategory = await queryOne(`
      SELECT id FROM categorias 
      WHERE nome = ? AND (user_id = ? OR user_id IS NULL) AND deleted_at IS NULL
    `, [nome, userId]);

    if (existingCategory) {
      throw new Error('Já existe uma categoria com este nome');
    }

    const result = await query(`
      INSERT INTO categorias (nome, descricao, cor, icone, user_id, created_date)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [nome, descricao, cor, icone, userId]);

    const newCategory = await queryOne(`
      SELECT 
        c.*,
        CASE WHEN c.user_id IS NULL THEN 'sistema' ELSE 'personalizada' END as origem
      FROM categorias c
      WHERE c.id = ?
    `, [result.insertId]);

    return newCategory;
  }

  async updateCategory(categoryId, userId, categoryData) {
    const { nome, descricao, cor, icone } = categoryData;

    // Verificar se a categoria existe e pertence ao usuário
    const existingCategory = await queryOne(`
      SELECT * FROM categorias WHERE id = ?
    `, [categoryId]);

    if (!existingCategory) {
      throw new Error('Categoria não encontrada');
    }

    // Verificar se já existe outra categoria com o mesmo nome (sistema ou usuário)
    if (existingCategory.user_id) {
      const duplicateCategory = await queryOne(`
        SELECT id FROM categorias 
        WHERE nome = ? AND (user_id = ? OR user_id IS NULL) AND id != ? AND deleted_at IS NULL
      `, [nome, userId, categoryId]);

      if (duplicateCategory) {
        throw new Error('Já existe uma categoria com este nome');
      }
    }

    await query(`
      UPDATE categorias SET 
        nome = ?, descricao = ?, cor = ?, icone = ?, updated_date = NOW()
      WHERE id = ?
    `, [nome, descricao, cor, icone, categoryId]);

    return await queryOne(`
      SELECT 
        c.*,
        CASE WHEN c.user_id IS NULL THEN 'sistema' ELSE 'personalizada' END as origem
      FROM categorias c
      WHERE c.id = ?
    `, [categoryId]);
  }

  async deleteCategory(categoryId, userId) {
    // Verificar se a categoria existe
    const existingCategory = await queryOne(`
      SELECT * FROM categorias WHERE id = ?
    `, [categoryId]);

    if (!existingCategory) {
      throw new Error('Categoria não encontrada');
    }

    // Soft delete - apenas marcar como deletada
    await query(`
      UPDATE categorias SET 
        deleted_at = NOW(), 
        deleted_by = ?
      WHERE id = ?
    `, [userId, categoryId]);

    return { message: 'Categoria excluída com sucesso' };
  }

  async getCategoryStats(userId) {
    const stats = await query(`
      SELECT 
        c.nome,
        COUNT(d.id) as total_despesas,
        SUM(d.valor) as valor_total_despesas,
        COUNT(r.id) as total_receitas,
        SUM(r.valor) as valor_total_receitas
      FROM categorias c
      LEFT JOIN despesas d ON d.categoria_id = c.id AND d.user_id = ?
      LEFT JOIN receitas r ON r.categoria_id = c.id AND r.user_id = ?
      WHERE (c.user_id IS NULL OR c.user_id = ?) AND c.deleted_at IS NULL
      GROUP BY c.id, c.nome
      ORDER BY valor_total_despesas DESC
    `, [userId, userId, userId]);

    return stats;
  }

  async getCategoryUsage(userId) {
    const usage = await query(`
      SELECT 
        c.nome,
        c.cor,
        COUNT(d.id) as despesas_count,
        COUNT(r.id) as receitas_count,
        COUNT(i.id) as investimentos_count
      FROM categorias c
      LEFT JOIN despesas d ON d.categoria_id = c.id AND d.user_id = ?
      LEFT JOIN receitas r ON r.categoria_id = c.id AND r.user_id = ?
      LEFT JOIN investimentos i ON i.categoria_id = c.id AND i.user_id = ?
      WHERE (c.user_id IS NULL OR c.user_id = ?) AND c.deleted_at IS NULL
      GROUP BY c.id, c.nome, c.cor
      ORDER BY (despesas_count + receitas_count + investimentos_count) DESC
    `, [userId, userId, userId, userId]);

    return usage;
  }
}

module.exports = new CategoryService(); 