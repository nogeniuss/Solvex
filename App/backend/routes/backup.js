const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const BackupService = require('../services/BackupService');
const { validate, schemas } = require('../middleware/validation');

const backupService = new BackupService();

// GET - Listar backups disponíveis
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await backupService.listBackups();
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      backups: result.backups,
      total: result.backups.length
    });
  } catch (error) {
    console.error('Erro ao listar backups:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Criar backup
router.post('/', authenticateToken, validate(schemas.backup), async (req, res) => {
  try {
    const { name, compress, structureOnly, dataOnly } = req.body;

    const result = await backupService.createBackup({
      name,
      compress: compress || false,
      structureOnly: structureOnly || false,
      dataOnly: dataOnly || false
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.status(201).json({
      message: 'Backup criado com sucesso',
      backup: result
    });
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Restaurar backup
router.post('/restore', authenticateToken, validate(schemas.restore), async (req, res) => {
  try {
    const { backupName } = req.body;

    // Buscar o arquivo de backup
    const backups = await backupService.listBackups();
    const backup = backups.backups.find(b => b.name === backupName);

    if (!backup) {
      return res.status(404).json({ error: 'Backup não encontrado' });
    }

    const result = await backupService.restoreBackup(backup.path);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      message: 'Backup restaurado com sucesso',
      result
    });
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE - Deletar backup
router.delete('/:backupName', authenticateToken, async (req, res) => {
  try {
    const { backupName } = req.params;

    const result = await backupService.deleteBackup(backupName);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      message: 'Backup deletado com sucesso',
      result
    });
  } catch (error) {
    console.error('Erro ao deletar backup:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Verificar integridade do backup
router.post('/verify', authenticateToken, validate(schemas.verify), async (req, res) => {
  try {
    const { backupName } = req.body;

    // Buscar o arquivo de backup
    const backups = await backupService.listBackups();
    const backup = backups.backups.find(b => b.name === backupName);

    if (!backup) {
      return res.status(404).json({ error: 'Backup não encontrado' });
    }

    const result = await backupService.verifyBackup(backup.path);

    res.json({
      message: 'Verificação concluída',
      result
    });
  } catch (error) {
    console.error('Erro ao verificar backup:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Exportar dados específicos
router.post('/export', authenticateToken, validate(schemas.export), async (req, res) => {
  try {
    const { tables, name, structureOnly, dataOnly } = req.body;

    const result = await backupService.exportData(tables || [], {
      name,
      structureOnly: structureOnly || false,
      dataOnly: dataOnly || false
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.status(201).json({
      message: 'Exportação concluída com sucesso',
      export: result
    });
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Limpar backups antigos
router.post('/cleanup', authenticateToken, validate(schemas.cleanup), async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;

    const result = await backupService.cleanupOldBackups(daysToKeep);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      message: 'Limpeza concluída com sucesso',
      result
    });
  } catch (error) {
    console.error('Erro na limpeza de backups:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Download do arquivo de backup
router.get('/download/:backupName', authenticateToken, async (req, res) => {
  try {
    const { backupName } = req.params;

    // Buscar o arquivo de backup
    const backups = await backupService.listBackups();
    const backup = backups.backups.find(b => b.name === backupName);

    if (!backup) {
      return res.status(404).json({ error: 'Backup não encontrado' });
    }

    // Verificar se o arquivo existe
    const fs = require('fs');
    if (!fs.existsSync(backup.path)) {
      return res.status(404).json({ error: 'Arquivo de backup não encontrado' });
    }

    // Configurar headers para download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.name}"`);
    res.setHeader('Content-Length', fs.statSync(backup.path).size);

    // Enviar arquivo
    const fileStream = fs.createReadStream(backup.path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Erro ao fazer download do backup:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Estatísticas de backup
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    
    if (!backups.success) {
      return res.status(500).json({ error: backups.error });
    }

    const stats = {
      total: backups.backups.length,
      totalSize: 0,
      compressed: 0,
      uncompressed: 0,
      oldest: null,
      newest: null
    };

    for (const backup of backups.backups) {
      stats.totalSize += parseFloat(backup.size);
      
      if (backup.compressed) {
        stats.compressed++;
      } else {
        stats.uncompressed++;
      }

      if (!stats.oldest || backup.created < stats.oldest) {
        stats.oldest = backup.created;
      }

      if (!stats.newest || backup.created > stats.newest) {
        stats.newest = backup.created;
      }
    }

    stats.totalSize = stats.totalSize.toFixed(2);

    res.json({
      stats
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de backup:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 