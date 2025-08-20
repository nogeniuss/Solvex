const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const FinancialPlanningService = require('../services/FinancialPlanningService');
const logger = require('../config/logger');

// POST - Simular aposentadoria
router.post('/retirement', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const params = req.body;

    // Validações
    if (!params.idadeAtual || !params.idadeAposentadoria || !params.salarioAtual) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios não fornecidos' });
    }

    const result = await FinancialPlanningService.calculateRetirement(userId, params);
    
    logger.audit('retirement_simulation', userId, {
      data: params,
      result: { patrimonioFinal: result.patrimonioFinal }
    });

    res.json(result);
  } catch (error) {
    logger.error('Error in retirement simulation:', error);
    res.status(500).json({ error: 'Erro ao calcular simulação de aposentadoria' });
  }
});

// POST - Simular financiamento
router.post('/loan', authenticateToken, async (req, res) => {
  try {
    const params = req.body;

    // Validações
    if (!params.valorFinanciamento || !params.prazoMeses || !params.taxaJurosAnual) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios não fornecidos' });
    }

    const result = await FinancialPlanningService.calculateLoan(params);
    
    logger.audit('loan_simulation', req.user.id, {
      data: params,
      result: { prestacao: result.prestacao, totalJuros: result.totalJuros }
    });

    res.json(result);
  } catch (error) {
    logger.error('Error in loan simulation:', error);
    res.status(500).json({ error: 'Erro ao calcular simulação de financiamento' });
  }
});

// POST - Simular investimento
router.post('/investment', authenticateToken, async (req, res) => {
  try {
    const params = req.body;

    // Validações
    if (!params.valorInicial || !params.aporteMensal || !params.prazoMeses || !params.rentabilidadeAnual) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios não fornecidos' });
    }

    const result = await FinancialPlanningService.calculateInvestment(params);
    
    logger.audit('investment_simulation', req.user.id, {
      data: params,
      result: { patrimonioFinal: result.patrimonioFinal, rendimentoTotal: result.rendimentoTotal }
    });

    res.json(result);
  } catch (error) {
    logger.error('Error in investment simulation:', error);
    res.status(500).json({ error: 'Erro ao calcular simulação de investimento' });
  }
});

// GET - Análise de fluxo de caixa futuro
router.get('/cashflow', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const meses = parseInt(req.query.meses) || 12;

    const result = await FinancialPlanningService.analyzeCashFlow(userId, meses);
    
    logger.audit('cashflow_analysis', userId, {
      meses,
      result: { periods: result.length }
    });

    res.json({ fluxoCaixa: result });
  } catch (error) {
    logger.error('Error in cash flow analysis:', error);
    res.status(500).json({ error: 'Erro ao analisar fluxo de caixa' });
  }
});

// GET - Análise de saúde financeira
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await FinancialPlanningService.analyzeFinancialHealth(userId);
    
    logger.audit('financial_health_analysis', userId, {
      result: { score: result.score, classificacao: result.classificacao }
    });

    res.json(result);
  } catch (error) {
    logger.error('Error in financial health analysis:', error);
    res.status(500).json({ error: 'Erro ao analisar saúde financeira' });
  }
});

module.exports = router; 