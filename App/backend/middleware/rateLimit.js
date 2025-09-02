const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const Brute = require('express-brute');
const logger = require('../config/logger');

// Limiter específico para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 tentativas (aumentado para desenvolvimento)
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não contar tentativas bem-sucedidas
});

// Limiter geral mais permissivo para outras rotas
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requisições por minuto
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // máximo 60 requests por minuto
  message: {
    error: 'Limite de API excedido. Tente novamente em 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Slow down para requests muito frequentes
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 50, // começar a desacelerar após 50 requests
  delayMs: () => 500, // adicionar 500ms de delay por request (nova API)
  maxDelayMs: 20000, // máximo 20 segundos de delay
  validate: { delayMs: false } // desabilitar warning de compatibilidade
});

// Brute force protection para login
const bruteForce = new Brute({
  freeRetries: 3,
  minWait: 5 * 60 * 1000, // 5 minutos
  maxWait: 60 * 60 * 1000, // 1 hora
  lifetime: 24 * 60 * 60 * 1000, // 24 horas
  refreshTimeoutOnRequest: false,
  failCallback: (req, res, next, nextValidRequestDate) => {
    logger.security('Brute force attempt detected', {
      ip: req.ip,
      path: req.path,
      nextValidRequestDate
    });
    res.status(429).json({
      error: 'Muitas tentativas de login. Tente novamente mais tarde.',
      nextValidRequestDate
    });
  }
});

module.exports = {
  loginLimiter,
  generalLimiter,
  apiLimiter,
  speedLimiter,
  bruteForce
}; 