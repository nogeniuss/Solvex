const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const AuthController = require('../controllers/AuthController');
const { loginLimiter } = require('../middleware/rateLimit');

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware de autorização por role
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissão insuficiente' });
    }
    next();
  };
};

// Rotas públicas
router.post('/register', AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Rotas protegidas
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, AuthController.updateProfile);
router.put('/change-password', authenticateToken, AuthController.changePassword);
router.delete('/account', authenticateToken, AuthController.deleteAccount);

// Rota para desbloquear usuário (apenas admin)
router.put('/unblock/:userId', authenticateToken, authorizeRoles('admin'), AuthController.unblockUser);

module.exports = { router, authenticateToken, authorizeRoles }; 