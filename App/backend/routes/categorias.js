const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const CategoryController = require('../controllers/CategoryController');

// GET - Listar categorias do usuário
router.get('/', authenticateToken, CategoryController.getCategories);

// GET - Buscar categoria específica
router.get('/:id', authenticateToken, CategoryController.getCategoryById);

// POST - Criar nova categoria
router.post('/', authenticateToken, CategoryController.createCategory);

// PUT - Atualizar categoria
router.put('/:id', authenticateToken, CategoryController.updateCategory);

// DELETE - Excluir categoria (soft delete)
router.delete('/:id', authenticateToken, CategoryController.deleteCategory);

// GET - Estatísticas das categorias
router.get('/stats/overview', authenticateToken, CategoryController.getCategoryStats);

// GET - Uso das categorias
router.get('/stats/usage', authenticateToken, CategoryController.getCategoryUsage);

// GET - Categorias do sistema
router.get('/system/list', authenticateToken, CategoryController.getSystemCategories);

// GET - Categorias do usuário
router.get('/user/list', authenticateToken, CategoryController.getUserCategories);

// POST - Duplicar categoria
router.post('/:id/duplicate', authenticateToken, CategoryController.duplicateCategory);

module.exports = router; 