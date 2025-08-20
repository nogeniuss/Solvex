const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const ExpenseController = require('../controllers/ExpenseController');
const { validate, schemas } = require('../middleware/validation');
const { captureEvent, captureFeatureUsage } = require('../middleware/analytics');

// GET - Listar despesas do usuário
router.get('/', authenticateToken, captureEvent('page_view', 'despesas_list'), ExpenseController.getExpenses);

// GET - Buscar despesa específica
router.get('/:id', authenticateToken, captureEvent('page_view', 'despesa_detail'), ExpenseController.getExpenseById);

// POST - Criar nova despesa
router.post('/', authenticateToken, validate(schemas.despesa), captureFeatureUsage('despesas', 'create'), ExpenseController.createExpense);

// PUT - Atualizar despesa
router.put('/:id', authenticateToken, validate(schemas.despesa), ExpenseController.updateExpense);

// DELETE - Excluir despesa
router.delete('/:id', authenticateToken, ExpenseController.deleteExpense);

// PUT - Marcar despesa como paga
router.put('/:id/pagar', authenticateToken, ExpenseController.markAsPaid);

// GET - Estatísticas das despesas
router.get('/stats/overview', authenticateToken, ExpenseController.getExpenseStats);

// GET - Despesas por categoria
router.get('/stats/by-category', authenticateToken, ExpenseController.getExpensesByCategory);

// GET - Despesas vencidas
router.get('/overdue/list', authenticateToken, ExpenseController.getOverdueExpenses);

// GET - Calcular juros e multas
router.get('/:id/calculate-interest', authenticateToken, ExpenseController.calculateInterestAndPenalty);

// POST - Atualizar status em lote
router.post('/bulk-update-status', authenticateToken, ExpenseController.bulkUpdateStatus);

module.exports = router; 