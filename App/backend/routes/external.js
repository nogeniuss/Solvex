const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const ExternalAPIService = require('../services/ExternalAPIService');
const logger = require('../config/logger');

// GET - Cotação de ação
router.get('/stock/:symbol', authenticateToken, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Símbolo da ação é obrigatório' });
    }

    const quote = await ExternalAPIService.getStockQuote(symbol);
    
    logger.audit('stock_quote_request', req.user.id, {
      symbol,
      price: quote.price
    });

    res.json(quote);
  } catch (error) {
    logger.error('Error fetching stock quote:', error);
    res.status(500).json({ error: 'Erro ao buscar cotação da ação' });
  }
});

// GET - Cotação de criptomoeda
router.get('/crypto/:coinId', authenticateToken, async (req, res) => {
  try {
    const { coinId } = req.params;
    
    if (!coinId) {
      return res.status(400).json({ error: 'ID da criptomoeda é obrigatório' });
    }

    const quote = await ExternalAPIService.getCryptoQuote(coinId);
    
    logger.audit('crypto_quote_request', req.user.id, {
      coinId,
      priceBRL: quote.priceBRL
    });

    res.json(quote);
  } catch (error) {
    logger.error('Error fetching crypto quote:', error);
    res.status(500).json({ error: 'Erro ao buscar cotação da criptomoeda' });
  }
});

// GET - Cotação de moedas
router.get('/currency/:baseCurrency?', authenticateToken, async (req, res) => {
  try {
    const { baseCurrency = 'USD' } = req.params;

    const quote = await ExternalAPIService.getCurrencyQuote(baseCurrency);
    
    logger.audit('currency_quote_request', req.user.id, {
      baseCurrency
    });

    res.json(quote);
  } catch (error) {
    logger.error('Error fetching currency quote:', error);
    res.status(500).json({ error: 'Erro ao buscar cotação de moedas' });
  }
});

// GET - Taxa de juros (SELIC)
router.get('/interest-rate', authenticateToken, async (req, res) => {
  try {
    const rate = await ExternalAPIService.getInterestRate();
    
    logger.audit('interest_rate_request', req.user.id, {
      rate: rate.rate
    });

    res.json(rate);
  } catch (error) {
    logger.error('Error fetching interest rate:', error);
    res.status(500).json({ error: 'Erro ao buscar taxa de juros' });
  }
});

// GET - Taxa de inflação (IPCA)
router.get('/inflation-rate', authenticateToken, async (req, res) => {
  try {
    const rate = await ExternalAPIService.getInflationRate();
    
    logger.audit('inflation_rate_request', req.user.id, {
      rate: rate.rate
    });

    res.json(rate);
  } catch (error) {
    logger.error('Error fetching inflation rate:', error);
    res.status(500).json({ error: 'Erro ao buscar taxa de inflação' });
  }
});

// GET - Cotação do dólar
router.get('/dollar-rate', authenticateToken, async (req, res) => {
  try {
    const rate = await ExternalAPIService.getDollarRate();
    
    logger.audit('dollar_rate_request', req.user.id, {
      rate: rate.rate
    });

    res.json(rate);
  } catch (error) {
    logger.error('Error fetching dollar rate:', error);
    res.status(500).json({ error: 'Erro ao buscar cotação do dólar' });
  }
});

// POST - Múltiplas cotações de ações
router.post('/stocks/batch', authenticateToken, async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Lista de símbolos é obrigatória' });
    }

    if (symbols.length > 10) {
      return res.status(400).json({ error: 'Máximo de 10 símbolos por requisição' });
    }

    const quotes = await ExternalAPIService.getMultipleStockQuotes(symbols);
    
    logger.audit('batch_stock_quotes_request', req.user.id, {
      symbols,
      successful: quotes.successful.length,
      failed: quotes.failed.length
    });

    res.json(quotes);
  } catch (error) {
    logger.error('Error fetching batch stock quotes:', error);
    res.status(500).json({ error: 'Erro ao buscar cotações em lote' });
  }
});

// POST - Portfolio tracking
router.post('/portfolio/quotes', authenticateToken, async (req, res) => {
  try {
    const { portfolio } = req.body;
    
    if (!portfolio) {
      return res.status(400).json({ error: 'Portfolio é obrigatório' });
    }

    const quotes = await ExternalAPIService.getPortfolioQuotes(portfolio);
    
    logger.audit('portfolio_quotes_request', req.user.id, {
      portfolioSize: Object.keys(quotes).length
    });

    res.json(quotes);
  } catch (error) {
    logger.error('Error fetching portfolio quotes:', error);
    res.status(500).json({ error: 'Erro ao buscar cotações do portfolio' });
  }
});

// POST - Calcular valor atual do portfolio
router.post('/portfolio/value', authenticateToken, async (req, res) => {
  try {
    const { portfolio } = req.body;
    
    if (!portfolio) {
      return res.status(400).json({ error: 'Portfolio é obrigatório' });
    }

    const result = await ExternalAPIService.calculatePortfolioValue(portfolio);
    
    logger.audit('portfolio_value_calculation', req.user.id, {
      totalValue: result.totalValue,
      positionsCount: result.positions.length
    });

    res.json(result);
  } catch (error) {
    logger.error('Error calculating portfolio value:', error);
    res.status(500).json({ error: 'Erro ao calcular valor do portfolio' });
  }
});

// GET - Todas as cotações principais
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const [interestRate, inflationRate, dollarRate, currencyQuote] = await Promise.allSettled([
      ExternalAPIService.getInterestRate(),
      ExternalAPIService.getInflationRate(),
      ExternalAPIService.getDollarRate(),
      ExternalAPIService.getCurrencyQuote('USD')
    ]);

    const result = {
      interestRate: interestRate.status === 'fulfilled' ? interestRate.value : null,
      inflationRate: inflationRate.status === 'fulfilled' ? inflationRate.value : null,
      dollarRate: dollarRate.status === 'fulfilled' ? dollarRate.value : null,
      currencyQuote: currencyQuote.status === 'fulfilled' ? currencyQuote.value : null
    };
    
    logger.audit('all_quotes_request', req.user.id, {
      successful: Object.values(result).filter(v => v !== null).length
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching all quotes:', error);
    res.status(500).json({ error: 'Erro ao buscar todas as cotações' });
  }
});

module.exports = router; 