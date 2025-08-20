const axios = require('axios');
const logger = require('../config/logger');

class ExternalAPIService {
  constructor() {
    this.apis = {
      alphaVantage: {
        baseURL: 'https://www.alphavantage.co/query',
        apiKey: process.env.ALPHA_VANTAGE_API_KEY
      },
      coinGecko: {
        baseURL: 'https://api.coingecko.com/api/v3'
      },
      exchangeRate: {
        baseURL: 'https://api.exchangerate-api.com/v4/latest'
      },
      bcb: {
        baseURL: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs'
      }
    };
  }

  // Cotação de ações brasileiras
  async getStockQuote(symbol) {
    try {
      if (!this.apis.alphaVantage.apiKey) {
        throw new Error('Alpha Vantage API key not configured');
      }

      const response = await axios.get(this.apis.alphaVantage.baseURL, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: `${symbol}.SAO`,
          apikey: this.apis.alphaVantage.apiKey
        },
        timeout: 10000
      });

      if (response.data['Global Quote']) {
        const quote = response.data['Global Quote'];
        return {
          symbol: symbol,
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
          volume: parseInt(quote['06. volume']),
          high: parseFloat(quote['03. high']),
          low: parseFloat(quote['04. low']),
          open: parseFloat(quote['02. open']),
          previousClose: parseFloat(quote['08. previous close']),
          lastUpdated: quote['07. latest trading day']
        };
      } else {
        throw new Error('Quote not found');
      }
    } catch (error) {
      logger.error('Error fetching stock quote:', error);
      throw error;
    }
  }

  // Cotação de criptomoedas
  async getCryptoQuote(coinId) {
    try {
      const response = await axios.get(`${this.apis.coinGecko.baseURL}/simple/price`, {
        params: {
          ids: coinId,
          vs_currencies: 'usd,brl',
          include_24hr_change: true,
          include_market_cap: true
        },
        timeout: 10000
      });

      if (response.data[coinId]) {
        const data = response.data[coinId];
        return {
          coinId: coinId,
          priceUSD: data.usd,
          priceBRL: data.brl,
          change24h: data.usd_24h_change,
          marketCap: data.usd_market_cap
        };
      } else {
        throw new Error('Crypto quote not found');
      }
    } catch (error) {
      logger.error('Error fetching crypto quote:', error);
      throw error;
    }
  }

  // Cotação de moedas
  async getCurrencyQuote(baseCurrency = 'USD') {
    try {
      const response = await axios.get(`${this.apis.exchangeRate.baseURL}/${baseCurrency}`, {
        timeout: 10000
      });

      return {
        base: response.data.base,
        date: response.data.date,
        rates: response.data.rates
      };
    } catch (error) {
      logger.error('Error fetching currency quote:', error);
      throw error;
    }
  }

  // Taxa de juros (SELIC)
  async getInterestRate() {
    try {
      const response = await axios.get(`${this.apis.bcb.baseURL}/11/dados/ultimos/1/periodo`, {
        timeout: 10000
      });

      if (response.data && response.data.length > 0) {
        return {
          rate: response.data[0].valor,
          date: response.data[0].data
        };
      } else {
        throw new Error('Interest rate not found');
      }
    } catch (error) {
      logger.error('Error fetching interest rate:', error);
      throw error;
    }
  }

  // IPCA (Inflação)
  async getInflationRate() {
    try {
      const response = await axios.get(`${this.apis.bcb.baseURL}/1737/dados/ultimos/1/periodo`, {
        timeout: 10000
      });

      if (response.data && response.data.length > 0) {
        return {
          rate: response.data[0].valor,
          date: response.data[0].data
        };
      } else {
        throw new Error('Inflation rate not found');
      }
    } catch (error) {
      logger.error('Error fetching inflation rate:', error);
      throw error;
    }
  }

  // Dólar comercial
  async getDollarRate() {
    try {
      const response = await axios.get(`${this.apis.bcb.baseURL}/1/dados/ultimos/1/periodo`, {
        timeout: 10000
      });

      if (response.data && response.data.length > 0) {
        return {
          rate: response.data[0].valor,
          date: response.data[0].data
        };
      } else {
        throw new Error('Dollar rate not found');
      }
    } catch (error) {
      logger.error('Error fetching dollar rate:', error);
      throw error;
    }
  }

  // Múltiplas cotações de ações
  async getMultipleStockQuotes(symbols) {
    try {
      const quotes = await Promise.allSettled(
        symbols.map(symbol => this.getStockQuote(symbol))
      );

      const results = {
        successful: [],
        failed: []
      };

      quotes.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.successful.push(result.value);
        } else {
          results.failed.push({
            symbol: symbols[index],
            error: result.reason.message
          });
        }
      });

      return results;
    } catch (error) {
      logger.error('Error fetching multiple stock quotes:', error);
      throw error;
    }
  }

  // Portfolio tracking com cotações em tempo real
  async getPortfolioQuotes(portfolio) {
    try {
      const quotes = {};
      
      // Buscar cotações de ações
      if (portfolio.stocks && portfolio.stocks.length > 0) {
        const stockSymbols = portfolio.stocks.map(stock => stock.symbol);
        const stockQuotes = await this.getMultipleStockQuotes(stockSymbols);
        
        stockQuotes.successful.forEach(quote => {
          quotes[quote.symbol] = {
            type: 'stock',
            ...quote
          };
        });
      }

      // Buscar cotações de criptomoedas
      if (portfolio.cryptos && portfolio.cryptos.length > 0) {
        for (const crypto of portfolio.cryptos) {
          try {
            const quote = await this.getCryptoQuote(crypto.coinId);
            quotes[crypto.coinId] = {
              type: 'crypto',
              ...quote
            };
          } catch (error) {
            logger.error(`Error fetching crypto quote for ${crypto.coinId}:`, error);
          }
        }
      }

      return quotes;
    } catch (error) {
      logger.error('Error fetching portfolio quotes:', error);
      throw error;
    }
  }

  // Calcular valor atual do portfolio
  async calculatePortfolioValue(portfolio) {
    try {
      const quotes = await this.getPortfolioQuotes(portfolio);
      let totalValue = 0;
      const positions = [];

      // Calcular valor das ações
      if (portfolio.stocks) {
        portfolio.stocks.forEach(stock => {
          const quote = quotes[stock.symbol];
          if (quote) {
            const currentValue = stock.quantity * quote.price;
            const gainLoss = currentValue - (stock.quantity * stock.averagePrice);
            const gainLossPercent = ((currentValue / (stock.quantity * stock.averagePrice)) - 1) * 100;

            positions.push({
              symbol: stock.symbol,
              type: 'stock',
              quantity: stock.quantity,
              averagePrice: stock.averagePrice,
              currentPrice: quote.price,
              currentValue: currentValue,
              gainLoss: gainLoss,
              gainLossPercent: gainLossPercent
            });

            totalValue += currentValue;
          }
        });
      }

      // Calcular valor das criptomoedas
      if (portfolio.cryptos) {
        portfolio.cryptos.forEach(crypto => {
          const quote = quotes[crypto.coinId];
          if (quote) {
            const currentValue = crypto.quantity * quote.priceBRL;
            const gainLoss = currentValue - (crypto.quantity * crypto.averagePrice);
            const gainLossPercent = ((currentValue / (crypto.quantity * crypto.averagePrice)) - 1) * 100;

            positions.push({
              symbol: crypto.coinId,
              type: 'crypto',
              quantity: crypto.quantity,
              averagePrice: crypto.averagePrice,
              currentPrice: quote.priceBRL,
              currentValue: currentValue,
              gainLoss: gainLoss,
              gainLossPercent: gainLossPercent
            });

            totalValue += currentValue;
          }
        });
      }

      return {
        totalValue: totalValue,
        positions: positions,
        quotes: quotes
      };
    } catch (error) {
      logger.error('Error calculating portfolio value:', error);
      throw error;
    }
  }
}

module.exports = new ExternalAPIService(); 