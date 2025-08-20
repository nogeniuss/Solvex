const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const ExternalAPIService = require('../services/ExternalAPIService');
const logger = require('../config/logger');

// GET - Cotação de ações brasileiras (melhorado)
router.get('/acoes/:codigo', authenticateToken, async (req, res) => {
  try {
    const { codigo } = req.params;
    
    logger.audit('stock_quote_request', req.user.id, { codigo });
    
    const quote = await ExternalAPIService.getStockQuote(codigo);
    res.json(quote);
  } catch (error) {
    logger.error('Error fetching stock quote:', error);
    res.status(500).json({ error: 'Erro ao buscar cotação da ação' });
  }
});

// GET - Cotação de criptomoedas (melhorado)
router.get('/cripto/:codigo', authenticateToken, async (req, res) => {
  try {
    const { codigo } = req.params;
    
    logger.audit('crypto_quote_request', req.user.id, { codigo });
    
    const quote = await ExternalAPIService.getCryptoQuote(codigo);
    res.json(quote);
  } catch (error) {
    logger.error('Error fetching crypto quote:', error);
    res.status(500).json({ error: 'Erro ao buscar cotação da criptomoeda' });
  }
});

// GET - Cotação de moedas (melhorado)
router.get('/moedas/:codigo', authenticateToken, async (req, res) => {
  try {
    const { codigo } = req.params;
    
    logger.audit('currency_quote_request', req.user.id, { codigo });
    
    const quote = await ExternalAPIService.getCurrencyQuote(codigo);
    res.json(quote);
  } catch (error) {
    logger.error('Error fetching currency quote:', error);
    res.status(500).json({ error: 'Erro ao buscar cotação da moeda' });
  }
});

// GET - Taxa de juros (SELIC)
router.get('/selic', authenticateToken, async (req, res) => {
  try {
    logger.audit('selic_rate_request', req.user.id);
    
    const rate = await ExternalAPIService.getInterestRate();
    res.json(rate);
  } catch (error) {
    logger.error('Error fetching SELIC rate:', error);
    res.status(500).json({ error: 'Erro ao buscar taxa SELIC' });
  }
});

// GET - Taxa de inflação (IPCA)
router.get('/ipca', authenticateToken, async (req, res) => {
  try {
    logger.audit('ipca_rate_request', req.user.id);
    
    const rate = await ExternalAPIService.getInflationRate();
    res.json(rate);
  } catch (error) {
    logger.error('Error fetching IPCA rate:', error);
    res.status(500).json({ error: 'Erro ao buscar taxa IPCA' });
  }
});

// GET - Cotação do dólar
router.get('/dolar', authenticateToken, async (req, res) => {
  try {
    logger.audit('dollar_rate_request', req.user.id);
    
    const rate = await ExternalAPIService.getDollarRate();
    res.json(rate);
  } catch (error) {
    logger.error('Error fetching dollar rate:', error);
    res.status(500).json({ error: 'Erro ao buscar cotação do dólar' });
  }
});

// POST - Múltiplas cotações de ações
router.post('/acoes/batch', authenticateToken, async (req, res) => {
  try {
    const { codigos } = req.body;
    
    if (!codigos || !Array.isArray(codigos) || codigos.length === 0) {
      return res.status(400).json({ error: 'Lista de códigos é obrigatória' });
    }

    if (codigos.length > 10) {
      return res.status(400).json({ error: 'Máximo de 10 códigos por requisição' });
    }

    logger.audit('batch_stock_quotes_request', req.user.id, { codigos });
    
    const quotes = await ExternalAPIService.getMultipleStockQuotes(codigos);
    res.json(quotes);
  } catch (error) {
    logger.error('Error fetching batch stock quotes:', error);
    res.status(500).json({ error: 'Erro ao buscar cotações em lote' });
  }
});

// GET - Cotação de fundos imobiliários (simulada)
router.get('/fiis/:codigo', authenticateToken, async (req, res) => {
  try {
    const { codigo } = req.params;
    
    // Simulação para FIIs (API real requer assinatura)
    const mockQuote = {
      codigo: codigo,
      preco: Math.random() * 100 + 10,
      variacao: (Math.random() - 0.5) * 2,
      variacaoPercentual: (Math.random() - 0.5) * 4,
      volume: Math.floor(Math.random() * 1000000),
      ultimaAtualizacao: new Date().toISOString().split('T')[0],
      rendimento: Math.random() * 0.8 + 0.2,
      patrimonio: Math.random() * 1000000000 + 100000000
    };
    
    logger.audit('fii_quote_request', req.user.id, { codigo });
    
    res.json(mockQuote);
  } catch (error) {
    logger.error('Error fetching FII quote:', error);
    res.status(500).json({ error: 'Erro ao buscar cotação do FII' });
  }
});

// GET - Cotação de títulos públicos (simulada)
router.get('/tesouro/:codigo', authenticateToken, async (req, res) => {
  try {
    const { codigo } = req.params;
    
    // Simulação para títulos do Tesouro
    const mockQuote = {
      codigo: codigo,
      preco: Math.random() * 1000 + 100,
      variacao: (Math.random() - 0.5) * 1,
      variacaoPercentual: (Math.random() - 0.5) * 2,
      vencimento: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      rentabilidade: Math.random() * 15 + 5,
      tipo: ['SELIC', 'IPCA', 'Prefixado'][Math.floor(Math.random() * 3)]
    };
    
    logger.audit('treasury_quote_request', req.user.id, { codigo });
    
    res.json(mockQuote);
  } catch (error) {
    logger.error('Error fetching treasury quote:', error);
    res.status(500).json({ error: 'Erro ao buscar cotação do título' });
  }
});

// GET - Todas as cotações principais
router.get('/todas', authenticateToken, async (req, res) => {
  try {
    logger.audit('all_quotes_request', req.user.id);
    
    const [selic, ipca, dolar, moedas] = await Promise.allSettled([
      ExternalAPIService.getInterestRate(),
      ExternalAPIService.getInflationRate(),
      ExternalAPIService.getDollarRate(),
      ExternalAPIService.getCurrencyQuote('USD')
    ]);

    const result = {
      selic: selic.status === 'fulfilled' ? selic.value : null,
      ipca: ipca.status === 'fulfilled' ? ipca.value : null,
      dolar: dolar.status === 'fulfilled' ? dolar.value : null,
      moedas: moedas.status === 'fulfilled' ? moedas.value : null
    };

    res.json(result);
  } catch (error) {
    logger.error('Error fetching all quotes:', error);
    res.status(500).json({ error: 'Erro ao buscar todas as cotações' });
  }
});

// GET - Histórico de cotações (simulado)
router.get('/historico/:tipo/:codigo', authenticateToken, async (req, res) => {
  try {
    const { tipo, codigo } = req.params;
    const { dias = 30 } = req.query;
    
    logger.audit('quote_history_request', req.user.id, { tipo, codigo, dias });
    
    // Simular histórico de cotações
    const historico = [];
    const hoje = new Date();
    
    for (let i = dias; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(data.getDate() - i);
      
      historico.push({
        data: data.toISOString().split('T')[0],
        preco: Math.random() * 100 + 10,
        volume: Math.floor(Math.random() * 1000000)
      });
    }
    
    res.json({ historico });
  } catch (error) {
    logger.error('Error fetching quote history:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// POST - Portfolio tracking
router.post('/portfolio', authenticateToken, async (req, res) => {
  try {
    const { portfolio } = req.body;
    
    if (!portfolio) {
      return res.status(400).json({ error: 'Portfolio é obrigatório' });
    }

    logger.audit('portfolio_tracking_request', req.user.id, {
      portfolioSize: Object.keys(portfolio).length
    });
    
    const quotes = await ExternalAPIService.getPortfolioQuotes(portfolio);
    res.json(quotes);
  } catch (error) {
    logger.error('Error tracking portfolio:', error);
    res.status(500).json({ error: 'Erro ao rastrear portfolio' });
  }
});

// POST - Calcular valor do portfolio
router.post('/portfolio/valor', authenticateToken, async (req, res) => {
  try {
    const { portfolio } = req.body;
    
    if (!portfolio) {
      return res.status(400).json({ error: 'Portfolio é obrigatório' });
    }

    logger.audit('portfolio_value_calculation', req.user.id, {
      portfolioSize: Object.keys(portfolio).length
    });
    
    const result = await ExternalAPIService.calculatePortfolioValue(portfolio);
    res.json(result);
  } catch (error) {
    logger.error('Error calculating portfolio value:', error);
    res.status(500).json({ error: 'Erro ao calcular valor do portfolio' });
  }
});

module.exports = router; 