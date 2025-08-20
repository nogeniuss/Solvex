const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { requireActiveSubscription, requireFeature } = require('../middleware/subscription');
const PDFService = require('../services/PDFService');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

// POST - Gerar relatório mensal em PDF (Funcionalidade Premium)
router.post('/monthly', authenticateToken, requireFeature('pdf_reports'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { mes, ano } = req.body;

    if (!mes || !ano) {
      return res.status(400).json({ error: 'Mês e ano são obrigatórios' });
    }

    const result = await PDFService.generateMonthlyReport(userId, mes, ano);
    
    logger.audit('pdf_monthly_report', userId, {
      mes,
      ano,
      filename: result.filename
    });

    // Enviar arquivo
    res.download(result.filepath, result.filename, (err) => {
      if (err) {
        logger.error('Error sending PDF file:', err);
      }
      // Limpar arquivo após download
      setTimeout(() => {
        if (fs.existsSync(result.filepath)) {
          fs.unlinkSync(result.filepath);
        }
      }, 60000); // 1 minuto
    });
  } catch (error) {
    logger.error('Error generating monthly PDF report:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório PDF' });
  }
});

// POST - Gerar relatório anual em PDF
router.post('/annual', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ano } = req.body;

    if (!ano) {
      return res.status(400).json({ error: 'Ano é obrigatório' });
    }

    const result = await PDFService.generateAnnualReport(userId, ano);
    
    logger.audit('pdf_annual_report', userId, {
      ano,
      filename: result.filename
    });

    // Enviar arquivo
    res.download(result.filepath, result.filename, (err) => {
      if (err) {
        logger.error('Error sending PDF file:', err);
      }
      // Limpar arquivo após download
      setTimeout(() => {
        if (fs.existsSync(result.filepath)) {
          fs.unlinkSync(result.filepath);
        }
      }, 60000); // 1 minuto
    });
  } catch (error) {
    logger.error('Error generating annual PDF report:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório PDF' });
  }
});

// GET - Listar relatórios disponíveis
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const reportsDir = path.join(__dirname, '../reports');
    
    if (!fs.existsSync(reportsDir)) {
      return res.json({ reports: [] });
    }

    const files = fs.readdirSync(reportsDir);
    const userReports = files
      .filter(file => file.includes(`-${userId}-`))
      .map(file => {
        const stats = fs.statSync(path.join(reportsDir, file));
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          type: file.includes('mensal') ? 'monthly' : 'annual'
        };
      })
      .sort((a, b) => b.created - a.created);

    res.json({ reports: userReports });
  } catch (error) {
    logger.error('Error listing PDF reports:', error);
    res.status(500).json({ error: 'Erro ao listar relatórios' });
  }
});

// GET - Download relatório específico
router.get('/download/:filename', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { filename } = req.params;
    
    // Verificar se o arquivo pertence ao usuário
    if (!filename.includes(`-${userId}-`)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const filepath = path.join(__dirname, '../reports', filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    logger.audit('pdf_download', userId, { filename });

    res.download(filepath, filename);
  } catch (error) {
    logger.error('Error downloading PDF report:', error);
    res.status(500).json({ error: 'Erro ao baixar relatório' });
  }
});

// DELETE - Deletar relatório
router.delete('/:filename', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { filename } = req.params;
    
    // Verificar se o arquivo pertence ao usuário
    if (!filename.includes(`-${userId}-`)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const filepath = path.join(__dirname, '../reports', filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    fs.unlinkSync(filepath);
    
    logger.audit('pdf_delete', userId, { filename });

    res.json({ message: 'Relatório deletado com sucesso' });
  } catch (error) {
    logger.error('Error deleting PDF report:', error);
    res.status(500).json({ error: 'Erro ao deletar relatório' });
  }
});

module.exports = router; 