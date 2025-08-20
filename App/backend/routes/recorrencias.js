const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../database');
const { authenticateToken } = require('./auth');
const cron = require('node-cron');
const logger = require('../config/logger');

// GET - Listar recorrências do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, tipo, categoria_id } = req.query;
    
    let sql = `
      SELECT 
        r.*,
        c.nome as categoria_nome,
        c.cor as categoria_cor
      FROM recorrencias r
      LEFT JOIN categorias c ON c.id = r.categoria_id
      WHERE r.user_id = ?
    `;
    
    const params = [userId];
    
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    
    if (tipo) {
      sql += ' AND r.tipo = ?';
      params.push(tipo);
    }
    
    if (categoria_id) {
      sql += ' AND r.categoria_id = ?';
      params.push(categoria_id);
    }
    
    sql += ' ORDER BY r.data_criacao DESC';
    
    const recorrencias = await query(sql, params);
    
    logger.audit('recurrences_listed', userId, {
      count: recorrencias.length,
      filters: { status, tipo, categoria_id }
    });

    res.json({ recorrencias });
  } catch (error) {
    logger.error('Error fetching recurrences:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Recorrência específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const recorrenciaId = req.params.id;
    
    const recorrencia = await queryOne(`
      SELECT 
        r.*,
        c.nome as categoria_nome,
        c.cor as categoria_cor
      FROM recorrencias r
      LEFT JOIN categorias c ON c.id = r.categoria_id
      WHERE r.id = ? AND r.user_id = ?
    `, [recorrenciaId, userId]);

    if (!recorrencia) {
      return res.status(404).json({ error: 'Recorrência não encontrada' });
    }

    res.json({ recorrencia });
  } catch (error) {
    logger.error('Error fetching recurrence:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Criar nova recorrência
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      titulo,
      descricao,
      valor,
      tipo,
      categoria_id,
      frequencia,
      dia_mes,
      dia_semana,
      data_inicio,
      data_fim,
      status,
      juros_multa,
      imposto_ir,
      imposto_inss,
      imposto_fgts
    } = req.body;

    // Validações
    if (!titulo || !valor || !tipo || !frequencia) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    if (valor <= 0) {
      return res.status(400).json({ error: 'Valor deve ser maior que zero' });
    }

    if (!['receita', 'despesa'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo deve ser receita ou despesa' });
    }

    if (!['diaria', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual'].includes(frequencia)) {
      return res.status(400).json({ error: 'Frequência inválida' });
    }

    // Validar data de início
    if (data_inicio && new Date(data_inicio) < new Date()) {
      return res.status(400).json({ error: 'Data de início não pode ser no passado' });
    }

    const result = await execute(`
      INSERT INTO recorrencias (
        titulo, descricao, valor, tipo, categoria_id, frequencia,
        dia_mes, dia_semana, data_inicio, data_fim, status, user_id, 
        juros_multa, imposto_ir, imposto_inss, imposto_fgts, data_criacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [titulo, descricao, valor, tipo, categoria_id, frequencia, dia_mes, dia_semana, 
        data_inicio, data_fim, status || 'ativa', userId, juros_multa || 0, 
        imposto_ir || 0, imposto_inss || 0, imposto_fgts || 0]);

    const novaRecorrencia = await queryOne(`
      SELECT r.*, c.nome as categoria_nome, c.cor as categoria_cor
      FROM recorrencias r
      LEFT JOIN categorias c ON c.id = r.categoria_id
      WHERE r.id = ?
    `, [result.insertId]);

    logger.audit('recurrence_created', userId, {
      recurrenceId: result.insertId,
      tipo,
      valor,
      frequencia
    });

    res.status(201).json({
      message: 'Recorrência criada com sucesso',
      recorrencia: novaRecorrencia
    });
  } catch (error) {
    logger.error('Error creating recurrence:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT - Atualizar recorrência
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const recorrenciaId = req.params.id;
    const {
      titulo,
      descricao,
      valor,
      tipo,
      categoria_id,
      frequencia,
      dia_mes,
      dia_semana,
      data_inicio,
      data_fim,
      status,
      juros_multa,
      imposto_ir,
      imposto_inss,
      imposto_fgts
    } = req.body;

    // Verificar se a recorrência pertence ao usuário
    const recorrenciaExistente = await queryOne(`
      SELECT * FROM recorrencias WHERE id = ? AND user_id = ?
    `, [recorrenciaId, userId]);

    if (!recorrenciaExistente) {
      return res.status(404).json({ error: 'Recorrência não encontrada' });
    }

    // Validações
    if (valor && valor <= 0) {
      return res.status(400).json({ error: 'Valor deve ser maior que zero' });
    }

    if (tipo && !['receita', 'despesa'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo deve ser receita ou despesa' });
    }

    if (frequencia && !['diaria', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual'].includes(frequencia)) {
      return res.status(400).json({ error: 'Frequência inválida' });
    }

    await execute(`
      UPDATE recorrencias SET
        titulo = COALESCE(?, titulo),
        descricao = COALESCE(?, descricao),
        valor = COALESCE(?, valor),
        tipo = COALESCE(?, tipo),
        categoria_id = COALESCE(?, categoria_id),
        frequencia = COALESCE(?, frequencia),
        dia_mes = COALESCE(?, dia_mes),
        dia_semana = COALESCE(?, dia_semana),
        data_inicio = COALESCE(?, data_inicio),
        data_fim = COALESCE(?, data_fim),
        status = COALESCE(?, status),
        juros_multa = COALESCE(?, juros_multa),
        imposto_ir = COALESCE(?, imposto_ir),
        imposto_inss = COALESCE(?, imposto_inss),
        imposto_fgts = COALESCE(?, imposto_fgts),
        data_atualizacao = NOW()
      WHERE id = ? AND user_id = ?
    `, [titulo, descricao, valor, tipo, categoria_id, frequencia, dia_mes, dia_semana,
        data_inicio, data_fim, status, juros_multa, imposto_ir, imposto_inss, imposto_fgts,
        recorrenciaId, userId]);

    const recorrenciaAtualizada = await queryOne(`
      SELECT r.*, c.nome as categoria_nome, c.cor as categoria_cor
      FROM recorrencias r
      LEFT JOIN categorias c ON c.id = r.categoria_id
      WHERE r.id = ?
    `, [recorrenciaId]);

    logger.audit('recurrence_updated', userId, {
      recurrenceId: recorrenciaId,
      changes: req.body
    });

    res.json({
      message: 'Recorrência atualizada com sucesso',
      recorrencia: recorrenciaAtualizada
    });
  } catch (error) {
    logger.error('Error updating recurrence:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE - Deletar recorrência
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const recorrenciaId = req.params.id;

    // Verificar se a recorrência pertence ao usuário
    const recorrenciaExistente = await queryOne(`
      SELECT * FROM recorrencias WHERE id = ? AND user_id = ?
    `, [recorrenciaId, userId]);

    if (!recorrenciaExistente) {
      return res.status(404).json({ error: 'Recorrência não encontrada' });
    }

    await execute(`
      DELETE FROM recorrencias WHERE id = ? AND user_id = ?
    `, [recorrenciaId, userId]);

    logger.audit('recurrence_deleted', userId, {
      recurrenceId: recorrenciaId
    });

    res.json({ message: 'Recorrência deletada com sucesso' });
  } catch (error) {
    logger.error('Error deleting recurrence:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Executar recorrências
router.post('/executar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data_execucao } = req.body;
    
    const dataExecucao = data_execucao ? new Date(data_execucao) : new Date();
    
    // Buscar recorrências ativas que devem ser executadas
    const recorrenciasParaExecutar = await query(`
      SELECT * FROM recorrencias 
      WHERE user_id = ? AND status = 'ativa'
      AND (data_fim IS NULL OR data_fim >= ?)
      AND (data_inicio IS NULL OR data_inicio <= ?)
    `, [userId, dataExecucao, dataExecucao]);

    const resultados = [];
    
    for (const recorrencia of recorrenciasParaExecutar) {
      try {
        if (deveExecutarRecorrencia(recorrencia, dataExecucao)) {
          const resultado = await executarRecorrencia(recorrencia, dataExecucao);
          resultados.push(resultado);
        }
      } catch (error) {
        logger.error('Error executing recurrence:', error);
        resultados.push({
          id: recorrencia.id,
          titulo: recorrencia.titulo,
          sucesso: false,
          erro: error.message
        });
      }
    }

    logger.audit('recurrences_executed', userId, {
      dataExecucao: dataExecucao.toISOString(),
      total: recorrenciasParaExecutar.length,
      executadas: resultados.filter(r => r.sucesso).length
    });

    res.json({
      message: 'Execução de recorrências concluída',
      data_execucao: dataExecucao.toISOString(),
      total_processadas: recorrenciasParaExecutar.length,
      executadas: resultados.filter(r => r.sucesso).length,
      resultados
    });
  } catch (error) {
    logger.error('Error executing recurrences:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Estatísticas de recorrências
router.get('/estatisticas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { periodo } = req.query;
    
    const hoje = new Date();
    let dataInicio;
    
    switch (periodo) {
      case 'mes':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        break;
      case 'trimestre':
        dataInicio = new Date(hoje.getFullYear(), Math.floor(hoje.getMonth() / 3) * 3, 1);
        break;
      case 'ano':
        dataInicio = new Date(hoje.getFullYear(), 0, 1);
        break;
      default:
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    }

    const estatisticas = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN tipo = 'receita' THEN 1 ELSE 0 END) as receitas,
        SUM(CASE WHEN tipo = 'despesa' THEN 1 ELSE 0 END) as despesas,
        SUM(CASE WHEN status = 'ativa' THEN 1 ELSE 0 END) as ativas,
        SUM(CASE WHEN status = 'inativa' THEN 1 ELSE 0 END) as inativas,
        SUM(valor) as valor_total,
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) as valor_receitas,
        SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as valor_despesas
      FROM recorrencias 
      WHERE user_id = ? AND data_criacao >= ?
    `, [userId, dataInicio]);

    res.json({ estatisticas: estatisticas[0] });
  } catch (error) {
    logger.error('Error fetching recurrence statistics:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para verificar se deve executar a recorrência
function deveExecutarRecorrencia(recorrencia, dataExecucao) {
  const data = new Date(dataExecucao);
  const diaSemana = data.getDay(); // 0 = Domingo, 1 = Segunda, etc.
  const diaMes = data.getDate();
  
  switch (recorrencia.frequencia) {
    case 'diaria':
      return true;
    case 'semanal':
      return recorrencia.dia_semana == diaSemana;
    case 'mensal':
      return recorrencia.dia_mes == diaMes;
    case 'trimestral':
      return recorrencia.dia_mes == diaMes && [0, 3, 6, 9].includes(data.getMonth());
    case 'semestral':
      return recorrencia.dia_mes == diaMes && [0, 6].includes(data.getMonth());
    case 'anual':
      return recorrencia.dia_mes == diaMes && data.getMonth() == 0;
    default:
      return false;
  }
}

// Função para executar uma recorrência
async function executarRecorrencia(recorrencia, dataExecucao) {
  try {
    let valorFinal = recorrencia.valor;
    
    // Aplicar impostos se for receita
    if (recorrencia.tipo === 'receita') {
      if (recorrencia.imposto_ir) {
        valorFinal -= valorFinal * (recorrencia.imposto_ir / 100);
      }
      if (recorrencia.imposto_inss) {
        valorFinal -= valorFinal * (recorrencia.imposto_inss / 100);
      }
      if (recorrencia.imposto_fgts) {
        valorFinal -= valorFinal * (recorrencia.imposto_fgts / 100);
      }
    }
    
    // Aplicar juros/multa se for despesa
    if (recorrencia.tipo === 'despesa' && recorrencia.juros_multa) {
      valorFinal += valorFinal * (recorrencia.juros_multa / 100);
    }

    // Inserir na tabela correspondente
    if (recorrencia.tipo === 'receita') {
      await execute(`
        INSERT INTO receitas (
          titulo, descricao, valor, valor_liquido, categoria_id, 
          data_recebimento, status, user_id, recorrencia_id, data_criacao
        ) VALUES (?, ?, ?, ?, ?, ?, 'recebido', ?, ?, NOW())
      `, [recorrencia.titulo, recorrencia.descricao, recorrencia.valor, 
          valorFinal, recorrencia.categoria_id, dataExecucao, 
          recorrencia.user_id, recorrencia.id]);
    } else {
      await execute(`
        INSERT INTO despesas (
          titulo, descricao, valor, valor_final, categoria_id, 
          data_vencimento, status, user_id, recorrencia_id, data_criacao
        ) VALUES (?, ?, ?, ?, ?, ?, 'pago', ?, ?, NOW())
      `, [recorrencia.titulo, recorrencia.descricao, recorrencia.valor, 
          valorFinal, recorrencia.categoria_id, dataExecucao, 
          recorrencia.user_id, recorrencia.id]);
    }

    return {
      id: recorrencia.id,
      titulo: recorrencia.titulo,
      tipo: recorrencia.tipo,
      valor_original: recorrencia.valor,
      valor_final: valorFinal,
      sucesso: true
    };
  } catch (error) {
    throw error;
  }
}

module.exports = router; 