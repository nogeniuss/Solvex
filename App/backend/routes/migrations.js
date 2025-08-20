const express = require('express');
const router = express.Router();
const MigrationRunner = require('../migrations/migration-runner');
const { authenticateToken, authorizeRoles } = require('./auth');
const logger = require('../config/logger');

// Middleware para garantir que apenas admins acessem
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'dev'));

// GET - Status das migrations
router.get('/status', async (req, res) => {
  try {
    const runner = new MigrationRunner();
    const status = await runner.getMigrationStatus();
    
    res.json({
      success: true,
      message: 'Status das migrations obtido com sucesso',
      data: status
    });

  } catch (error) {
    logger.error('Erro ao obter status das migrations:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter status das migrations'
    });
  }
});

// POST - Executar migrations pendentes
router.post('/run', async (req, res) => {
  try {
    const runner = new MigrationRunner();
    const result = await runner.runPendingMigrations();
    
    logger.info(`Migrations executadas via API por usuário ${req.user.id}: ${result.migrations.join(', ')}`);
    
    res.json({
      success: true,
      message: result.executed === 0 
        ? 'Nenhuma migration pendente encontrada'
        : `${result.executed} migrations executadas com sucesso`,
      data: result
    });

  } catch (error) {
    logger.error('Erro ao executar migrations via API:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao executar migrations: ' + error.message
    });
  }
});

// POST - Executar migration específica
router.post('/run-specific', async (req, res) => {
  try {
    const { migrationName } = req.body;
    
    if (!migrationName) {
      return res.status(400).json({
        success: false,
        error: 'Nome da migration é obrigatório'
      });
    }

    const runner = new MigrationRunner();
    const result = await runner.runSpecificMigration(migrationName);
    
    logger.info(`Migration específica executada via API por usuário ${req.user.id}: ${migrationName}`);
    
    res.json({
      success: true,
      message: `Migration ${migrationName} executada com sucesso`,
      data: result
    });

  } catch (error) {
    logger.error(`Erro ao executar migration específica via API: ${req.body.migrationName}`, error);
    res.status(500).json({
      success: false,
      error: 'Erro ao executar migration: ' + error.message
    });
  }
});

// GET - Listar arquivos de migration disponíveis
router.get('/list', async (req, res) => {
  try {
    const runner = new MigrationRunner();
    const migrationFiles = runner.getMigrationFiles();
    
    res.json({
      success: true,
      message: 'Arquivos de migration listados com sucesso',
      data: {
        total: migrationFiles.length,
        migrations: migrationFiles.map(file => ({
          name: file,
          path: `/migrations/${file}`
        }))
      }
    });

  } catch (error) {
    logger.error('Erro ao listar migrations:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar migrations'
    });
  }
});

module.exports = router; 