const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { authenticateToken } = require('./auth');

// GET - Listar todas as metas do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ano, mes } = req.query;
    
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];
    
    if (ano && mes) {
      whereClause += ' AND YEAR(created_date) = ? AND MONTH(created_date) = ?';
      params.push(ano, mes);
    }

    const metas = await query(`
      SELECT 
        m.*,
        CASE 
          WHEN m.tipo = 'economia' THEN 
            COALESCE((SELECT SUM(valor) FROM receitas WHERE user_id = m.user_id AND status = 'recebido'), 0) - 
            COALESCE((SELECT SUM(valor) FROM despesas WHERE user_id = m.user_id AND status = 'pago'), 0)
          WHEN m.tipo = 'investimento' THEN 
            COALESCE((SELECT SUM(valor_inicial) FROM investimentos WHERE user_id = m.user_id AND status = 'ativo'), 0)
          WHEN m.tipo = 'aumento_receita' THEN 
            COALESCE((SELECT SUM(valor) FROM receitas WHERE user_id = m.user_id AND status = 'recebido'), 0)
          ELSE 0
        END as progresso_atual
      FROM metas m
      ${whereClause}
      ORDER BY created_date DESC
    `, params);

    // Calcular progresso e estimativas
    const metasComProgresso = metas.map(meta => {
      const progresso = Math.min(meta.progresso_atual, meta.valor_meta);
      const percentual = (progresso / meta.valor_meta) * 100;
      
      // Calcular estimativa de conclusão
      const diasRestantes = calcularDiasParaConclusao(meta, progresso);
      
      return {
        ...meta,
        progresso: progresso,
        percentual: percentual.toFixed(2),
        dias_restantes: diasRestantes,
        status: percentual >= 100 ? 'concluida' : meta.status
      };
    });

    res.json({ metas: metasComProgresso });
  } catch (error) {
    console.error('Erro ao buscar metas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Criar nova meta
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { titulo, descricao, valor_meta, tipo, data_fim, categoria_id } = req.body;

    if (!titulo || !valor_meta || !tipo) {
      return res.status(400).json({ error: 'Título, valor e tipo são obrigatórios' });
    }

    const result = await query(`
      INSERT INTO metas (
        titulo, descricao, valor_meta, tipo, data_fim, 
        categoria_id, user_id, status, data_inicio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ativa', CURDATE())
    `, [titulo, descricao, valor_meta, tipo, data_fim, categoria_id, userId]);

    const novaMeta = await queryOne(`
      SELECT * FROM metas WHERE id = ?
    `, [result.insertId]);

    res.status(201).json({ 
      message: 'Meta criada com sucesso',
      meta: novaMeta
    });
  } catch (error) {
    console.error('Erro ao criar meta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT - Atualizar meta
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const metaId = req.params.id;
    const { titulo, descricao, valor_meta, tipo, data_fim, categoria_id, status } = req.body;

    // Verificar se a meta pertence ao usuário
    const metaExistente = await queryOne(`
      SELECT * FROM metas WHERE id = ? AND user_id = ?
    `, [metaId, userId]);

    if (!metaExistente) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    await query(`
      UPDATE metas SET 
        titulo = ?, descricao = ?, valor_meta = ?, tipo = ?, 
        data_fim = ?, categoria_id = ?, status = ?, updated_date = NOW()
      WHERE id = ? AND user_id = ?
    `, [titulo, descricao, valor_meta, tipo, data_fim, categoria_id, status, metaId, userId]);

    const metaAtualizada = await queryOne(`
      SELECT * FROM metas WHERE id = ?
    `, [metaId]);

    res.json({ 
      message: 'Meta atualizada com sucesso',
      meta: metaAtualizada
    });
  } catch (error) {
    console.error('Erro ao atualizar meta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE - Excluir meta
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const metaId = req.params.id;

    // Verificar se a meta pertence ao usuário
    const metaExistente = await queryOne(`
      SELECT * FROM metas WHERE id = ? AND user_id = ?
    `, [metaId, userId]);

    if (!metaExistente) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    await query(`
      DELETE FROM metas WHERE id = ? AND user_id = ?
    `, [metaId, userId]);

    res.json({ message: 'Meta excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir meta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Insights e recomendações para metas
router.get('/:id/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const metaId = req.params.id;

    const meta = await queryOne(`
      SELECT * FROM metas WHERE id = ? AND user_id = ?
    `, [metaId, userId]);

    if (!meta) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    // Calcular progresso atual
    const progressoAtual = await calcularProgressoMeta(meta, userId);
    const percentual = (progressoAtual / meta.valor_meta) * 100;
    
    // Gerar insights baseados no tipo de meta
    const insights = await gerarInsights(meta, progressoAtual, userId);

    res.json({
      meta,
      progresso: progressoAtual,
      percentual: percentual.toFixed(2),
      insights
    });
  } catch (error) {
    console.error('Erro ao buscar insights:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para calcular progresso da meta
async function calcularProgressoMeta(meta, userId) {
  try {
    let progresso = 0;
    
    switch (meta.tipo) {
      case 'economia':
        const receitas = await queryOne(`
          SELECT COALESCE(SUM(valor), 0) as total FROM receitas 
          WHERE user_id = ? AND status = 'recebido'
        `, [userId]);
        
        const despesas = await queryOne(`
          SELECT COALESCE(SUM(valor), 0) as total FROM despesas 
          WHERE user_id = ? AND status = 'pago'
        `, [userId]);
        
        progresso = receitas.total - despesas.total;
        break;
        
      case 'investimento':
        const investimentos = await queryOne(`
          SELECT COALESCE(SUM(valor_inicial), 0) as total FROM investimentos 
          WHERE user_id = ? AND status = 'ativo'
        `, [userId]);
        
        progresso = investimentos.total;
        break;
        
      case 'aumento_receita':
        const totalReceitas = await queryOne(`
          SELECT COALESCE(SUM(valor), 0) as total FROM receitas 
          WHERE user_id = ? AND status = 'recebido'
        `, [userId]);
        
        progresso = totalReceitas.total;
        break;
        
      case 'reducao_despesa':
        const despesasAtuais = await queryOne(`
          SELECT COALESCE(SUM(valor), 0) as total FROM despesas 
          WHERE user_id = ? AND status = 'pago'
        `, [userId]);
        
        progresso = meta.valor_meta - despesasAtuais.total;
        break;
    }
    
    return Math.max(0, progresso);
  } catch (error) {
    console.error('Erro ao calcular progresso:', error);
    return 0;
  }
}

// Função para gerar insights
async function gerarInsights(meta, progressoAtual, userId) {
  const insights = [];
  const percentual = (progressoAtual / meta.valor_meta) * 100;
  
  // Insight de progresso
  if (percentual >= 100) {
    insights.push({
      tipo: 'sucesso',
      titulo: 'Meta Concluída!',
      mensagem: `Parabéns! Você atingiu 100% da sua meta de ${meta.titulo}.`
    });
  } else if (percentual >= 75) {
    insights.push({
      tipo: 'alerta',
      titulo: 'Quase lá!',
      mensagem: `Você está a ${(100 - percentual).toFixed(1)}% de atingir sua meta. Continue assim!`
    });
  } else if (percentual >= 50) {
    insights.push({
      tipo: 'info',
      titulo: 'Bom progresso',
      mensagem: `Você já completou ${percentual.toFixed(1)}% da sua meta.`
    });
  } else {
    insights.push({
      tipo: 'warning',
      titulo: 'Ainda no início',
      mensagem: `Você completou ${percentual.toFixed(1)}% da meta. Foque nos próximos passos.`
    });
  }
  
  // Insight de tempo
  if (meta.data_limite) {
    const hoje = new Date();
    const dataLimite = new Date(meta.data_limite);
    const diasRestantes = Math.ceil((dataLimite - hoje) / (1000 * 60 * 60 * 24));
    
    if (diasRestantes < 0) {
      insights.push({
        tipo: 'danger',
        titulo: 'Prazo Expirado',
        mensagem: 'O prazo da meta já expirou. Considere ajustar o objetivo.'
      });
    } else if (diasRestantes <= 7) {
      insights.push({
        tipo: 'warning',
        titulo: 'Prazo Aproximando',
        mensagem: `Faltam apenas ${diasRestantes} dias para o prazo da meta.`
      });
    }
  }
  
  // Insight de recomendação baseada no tipo
  if (meta.tipo === 'economia' && percentual < 50) {
    insights.push({
      tipo: 'info',
      titulo: 'Dica de Economia',
      mensagem: 'Para economizar mais, analise suas despesas por categoria e identifique oportunidades de redução.'
    });
  } else if (meta.tipo === 'investimento' && percentual < 30) {
    insights.push({
      tipo: 'info',
      titulo: 'Dica de Investimento',
      mensagem: 'Considere diversificar seus investimentos para reduzir riscos e aumentar retornos.'
    });
  }
  
  return insights;
}

// Função para calcular dias para conclusão
function calcularDiasParaConclusao(meta, progressoAtual) {
  if (progressoAtual >= meta.valor_meta) return 0;
  
  const valorRestante = meta.valor_meta - progressoAtual;
  const diasDesdeCriacao = Math.ceil((new Date() - new Date(meta.data_inicio)) / (1000 * 60 * 60 * 24));
  
  if (diasDesdeCriacao === 0) return null;
  
  const velocidadeMedia = progressoAtual / diasDesdeCriacao;
  
  if (velocidadeMedia <= 0) return null;
  
  return Math.ceil(valorRestante / velocidadeMedia);
}

module.exports = router; 