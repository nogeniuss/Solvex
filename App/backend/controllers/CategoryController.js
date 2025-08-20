const CategoryService = require('../services/CategoryService');

class CategoryController {
  async getCategories(req, res) {
    try {
      const userId = req.user.id;
      const categories = await CategoryService.getCategories(userId);
      
      res.json({ categories });
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async createCategory(req, res) {
    try {
      const userId = req.user.id;
      const { nome, descricao, cor, icone } = req.body;

      // Validações básicas
      if (!nome) {
        return res.status(400).json({ 
          error: 'Nome da categoria é obrigatório' 
        });
      }

      if (nome.length < 2) {
        return res.status(400).json({ 
          error: 'Nome da categoria deve ter pelo menos 2 caracteres' 
        });
      }

      const category = await CategoryService.createCategory(userId, {
        nome: nome.trim(),
        descricao: descricao?.trim() || '',
        cor: cor || '#3B82F6',
        icone: icone || 'money'
      });
      
      res.status(201).json({
        message: 'Categoria criada com sucesso',
        category
      });
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      
      if (error.message === 'Já existe uma categoria com este nome') {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async updateCategory(req, res) {
    try {
      const userId = req.user.id;
      const categoryId = parseInt(req.params.id);
      const { nome, descricao, cor, icone } = req.body;

      // Validações básicas
      if (!nome) {
        return res.status(400).json({ 
          error: 'Nome da categoria é obrigatório' 
        });
      }

      if (nome.length < 2) {
        return res.status(400).json({ 
          error: 'Nome da categoria deve ter pelo menos 2 caracteres' 
        });
      }

      if (!categoryId || isNaN(categoryId)) {
        return res.status(400).json({ 
          error: 'ID da categoria inválido' 
        });
      }

      const category = await CategoryService.updateCategory(categoryId, userId, {
        nome: nome.trim(),
        descricao: descricao?.trim() || '',
        cor: cor || '#3B82F6',
        icone: icone || 'money'
      });
      
      res.json({
        message: 'Categoria atualizada com sucesso',
        category
      });
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      
      if (error.message === 'Categoria não encontrada') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message === 'Já existe uma categoria com este nome') {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async deleteCategory(req, res) {
    try {
      const userId = req.user.id;
      const categoryId = parseInt(req.params.id);

      if (!categoryId || isNaN(categoryId)) {
        return res.status(400).json({ 
          error: 'ID da categoria inválido' 
        });
      }

      const result = await CategoryService.deleteCategory(categoryId, userId);
      
      res.json({
        message: result.message
      });
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      
      if (error.message === 'Categoria não encontrada') {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async getCategoryStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await CategoryService.getCategoryStats(userId);
      
      res.json({ stats });
    } catch (error) {
      console.error('Erro ao buscar estatísticas das categorias:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async getCategoryUsage(req, res) {
    try {
      const userId = req.user.id;
      const usage = await CategoryService.getCategoryUsage(userId);
      
      res.json({ usage });
    } catch (error) {
      console.error('Erro ao buscar uso das categorias:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async getCategoryById(req, res) {
    try {
      const userId = req.user.id;
      const categoryId = parseInt(req.params.id);

      if (!categoryId || isNaN(categoryId)) {
        return res.status(400).json({ 
          error: 'ID da categoria inválido' 
        });
      }

      const categories = await CategoryService.getCategories(userId);
      const category = categories.find(cat => cat.id === categoryId);
      
      if (!category) {
        return res.status(404).json({ 
          error: 'Categoria não encontrada' 
        });
      }

      res.json({ category });
    } catch (error) {
      console.error('Erro ao buscar categoria:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async getSystemCategories(req, res) {
    try {
      // Buscar apenas categorias do sistema (user_id IS NULL)
      const { query } = require('../database');
      
      const categories = await query(`
        SELECT 
          id, nome, descricao, cor, icone,
          'sistema' as origem
        FROM categorias 
        WHERE user_id IS NULL AND deleted_at IS NULL
        ORDER BY nome
      `);
      
      res.json({ categories });
    } catch (error) {
      console.error('Erro ao buscar categorias do sistema:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async getUserCategories(req, res) {
    try {
      const userId = req.user.id;
      
      const { query } = require('../database');
      
      const categories = await query(`
        SELECT 
          id, nome, descricao, cor, icone,
          'personalizada' as origem
        FROM categorias 
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY nome
      `, [userId]);
      
      res.json({ categories });
    } catch (error) {
      console.error('Erro ao buscar categorias do usuário:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async duplicateCategory(req, res) {
    try {
      const userId = req.user.id;
      const categoryId = parseInt(req.params.id);

      if (!categoryId || isNaN(categoryId)) {
        return res.status(400).json({ 
          error: 'ID da categoria inválido' 
        });
      }

      // Buscar categoria original
      const categories = await CategoryService.getCategories(userId);
      const originalCategory = categories.find(cat => cat.id === categoryId);
      
      if (!originalCategory) {
        return res.status(404).json({ 
          error: 'Categoria não encontrada' 
        });
      }

      // Criar cópia com nome modificado
      const newName = `${originalCategory.nome} (Cópia)`;
      const category = await CategoryService.createCategory(userId, {
        nome: newName,
        descricao: originalCategory.descricao,
        cor: originalCategory.cor,
        icone: originalCategory.icone
      });
      
      res.status(201).json({
        message: 'Categoria duplicada com sucesso',
        category
      });
    } catch (error) {
      console.error('Erro ao duplicar categoria:', error);
      
      if (error.message === 'Já existe uma categoria com este nome') {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }
}

module.exports = new CategoryController(); 