const express = require('express');
const { query, queryOne, execute } = require('../database');
const RevenueRepository = require('../repositories/RevenueRepository');

const router = express.Router();

// Middleware para verificar token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_jwt';

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// GET - Listar todas as receitas do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      status, 
      categoria_id, 
      data_inicio, 
      data_fim, 
      recorrencia,
      page = 1, 
      limit = 20 
    } = req.query;

    let sql = `
      SELECT r.*, 
             c.nome as categoria_nome, 
             c.cor as categoria_cor,
             c.icone as categoria_icone
      FROM receitas r
      LEFT JOIN categorias c ON r.categoria_id = c.id
      WHERE r.user_id = ?
    `;
    const params = [req.user.id];

    // Filtros
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }

    if (categoria_id) {
      sql += ' AND r.categoria_id = ?';
      params.push(categoria_id);
    }

    if (data_inicio) {
      sql += ' AND r.data_recebimento >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      sql += ' AND r.data_recebimento <= ?';
      params.push(data_fim);
    }

    if (recorrencia) {
      sql += ' AND r.recorrencia = ?';
      params.push(recorrencia);
    }

    // Ordenação e paginação
    sql += ' ORDER BY r.data_recebimento DESC, r.created_date DESC';
    
    const offset = (page - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const receitas = await query(sql, params);

    // Contar total de registros para paginação
    let countSql = `
      SELECT COUNT(*) as total
      FROM receitas r
      WHERE r.user_id = ?
    `;
    const countParams = [req.user.id];

    if (status) {
      countSql += ' AND r.status = ?';
      countParams.push(status);
    }

    if (categoria_id) {
      countSql += ' AND r.categoria_id = ?';
      countParams.push(categoria_id);
    }

    if (data_inicio) {
      countSql += ' AND r.data_recebimento >= ?';
      countParams.push(data_inicio);
    }

    if (data_fim) {
      countSql += ' AND r.data_recebimento <= ?';
      countParams.push(data_fim);
    }

    if (recorrencia) {
      countSql += ' AND r.recorrencia = ?';
      countParams.push(recorrencia);
    }

    const totalResult = await queryOne(countSql, countParams);
    const total = totalResult.total;

    res.json({
      receitas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar receitas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Estatísticas das Receitas
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await queryOne(`
      SELECT 
        COALESCE(SUM(valor), 0) as totalReceitas,
        COALESCE(SUM(valor_liquido), 0) as totalLiquido,
        COALESCE(SUM(
          CASE 
            WHEN tem_impostos = 1 THEN 
              COALESCE(ir_valor, 0) + COALESCE(inss_valor, 0) + COALESCE(fgts_valor, 0)
            ELSE 0 
          END
        ), 0) as totalImpostos,
        COUNT(*) as totalRegistros,
        COUNT(CASE WHEN status = 'recebido' THEN 1 END) as receitasRecebidas,
        COUNT(CASE WHEN status = 'pendente' THEN 1 END) as receitasPendentes,
        COUNT(CASE WHEN tem_impostos = 1 THEN 1 END) as receitasComImpostos
      FROM receitas 
      WHERE user_id = ?
    `, [userId]);

    res.json({ stats });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Buscar receita por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const receita = await queryOne(
      `SELECT r.*, 
              c.nome as categoria_nome, 
              c.cor as categoria_cor,
              c.icone as categoria_icone
       FROM receitas r
       LEFT JOIN categorias c ON r.categoria_id = c.id
       WHERE r.id = ? AND r.user_id = ?`,
      [id, req.user.id]
    );

    if (!receita) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    res.json({ receita });
  } catch (error) {
    console.error('Erro ao buscar receita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Criar nova receita
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      titulo,
      descricao,
      valor,
      data_recebimento,
      categoria_id,
      recorrencia,
      data_fim_recorrencia,
      observacoes,
      // Novos campos para impostos
      tem_impostos,
      valor_ir,
      valor_inss,
      valor_fgts,
      outros_descontos
    } = req.body;

    // Validações
    if (!titulo || !valor || !data_recebimento) {
      return res.status(400).json({ error: 'Título, valor e data de recebimento são obrigatórios' });
    }

    if (valor <= 0) {
      return res.status(400).json({ error: 'Valor deve ser maior que zero' });
    }

    if (categoria_id) {
      const categoria = await queryOne(
        'SELECT id FROM categorias WHERE id = ? AND (user_id = ? OR user_id IS NULL) AND deleted_at IS NULL',
        [categoria_id, req.user.id]
      );
      if (!categoria) {
        return res.status(400).json({ error: 'Categoria inválida' });
      }
    }

    // Calcular valor líquido se houver impostos
    let valorLiquido = null;
    if (tem_impostos) {
      const valorNum = parseFloat(valor) || 0;
      const irNum = parseFloat(valor_ir) || 0;
      const inssNum = parseFloat(valor_inss) || 0;
      const fgtsNum = parseFloat(valor_fgts) || 0;
      const outrosNum = parseFloat(outros_descontos) || 0;
      
      valorLiquido = valorNum - irNum - inssNum - fgtsNum - outrosNum;
    }

    // Inserir receita
    const result = await execute(
      `INSERT INTO receitas (
        titulo, descricao, valor, valor_liquido, data_recebimento, categoria_id, user_id,
        recorrencia, data_fim_recorrencia, tem_impostos, ir_valor, inss_valor, fgts_valor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        titulo,
        descricao || '',
        valor,
        valorLiquido,
        data_recebimento,
        categoria_id || null,
        req.user.id,
        recorrencia || 'nenhuma',
        data_fim_recorrencia || null,
        tem_impostos || false,
        valor_ir || 0,
        valor_inss || 0,
        valor_fgts || 0
      ]
    );

    // Buscar receita criada
    const receita = await queryOne(
      `SELECT r.*, 
              c.nome as categoria_nome, 
              c.cor as categoria_cor,
              c.icone as categoria_icone
       FROM receitas r
       LEFT JOIN categorias c ON r.categoria_id = c.id
       WHERE r.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Receita criada com sucesso',
      receita
    });
  } catch (error) {
    console.error('Erro ao criar receita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT - Atualizar receita
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descricao,
      valor,
      data_recebimento,
      data_efetivacao,
      status,
      categoria_id,
      recorrencia,
      data_fim_recorrencia,
      observacoes,
      // Novos campos para impostos
      tem_impostos,
      valor_ir,
      valor_inss,
      valor_fgts,
      outros_descontos
    } = req.body;

    // Verificar se a receita existe e pertence ao usuário
    const existingReceita = await queryOne(
      'SELECT * FROM receitas WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existingReceita) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    // Validações
    if (!titulo || !valor || !data_recebimento) {
      return res.status(400).json({ error: 'Título, valor e data de recebimento são obrigatórios' });
    }

    if (valor <= 0) {
      return res.status(400).json({ error: 'Valor deve ser maior que zero' });
    }

    if (categoria_id) {
      const categoria = await queryOne(
        'SELECT id FROM categorias WHERE id = ? AND (user_id = ? OR user_id IS NULL) AND deleted_at IS NULL',
        [categoria_id, req.user.id]
      );
      if (!categoria) {
        return res.status(400).json({ error: 'Categoria inválida' });
      }
    }

    // Calcular valor líquido se houver impostos
    let valorLiquido = null;
    if (tem_impostos) {
      const valorNum = parseFloat(valor) || 0;
      const irNum = parseFloat(valor_ir) || 0;
      const inssNum = parseFloat(valor_inss) || 0;
      const fgtsNum = parseFloat(valor_fgts) || 0;
      const outrosNum = parseFloat(outros_descontos) || 0;
      
      valorLiquido = valorNum - irNum - inssNum - fgtsNum - outrosNum;
    }

    // Atualizar receita
    await execute(
      `UPDATE receitas SET 
        titulo = ?, descricao = ?, valor = ?, valor_liquido = ?, data_recebimento = ?, 
        data_recebimento_real = ?, status = ?, categoria_id = ?, recorrencia = ?,
        data_fim_recorrencia = ?, tem_impostos = ?, ir_valor = ?, inss_valor = ?, fgts_valor = ?
       WHERE id = ?`,
      [
        titulo,
        descricao || '',
        valor,
        valorLiquido,
        data_recebimento,
        data_efetivacao || null,
        status || 'pendente',
        categoria_id || null,
        recorrencia || 'nenhuma',
        data_fim_recorrencia || null,
        tem_impostos || false,
        valor_ir || 0,
        valor_inss || 0,
        valor_fgts || 0,
        id
      ]
    );

    // Buscar receita atualizada
    const receita = await queryOne(
      `SELECT r.*, 
              c.nome as categoria_nome, 
              c.cor as categoria_cor,
              c.icone as categoria_icone
       FROM receitas r
       LEFT JOIN categorias c ON r.categoria_id = c.id
       WHERE r.id = ?`,
      [id]
    );

    res.json({
      message: 'Receita atualizada com sucesso',
      receita
    });
  } catch (error) {
    console.error('Erro ao atualizar receita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE - Deletar receita
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a receita existe e pertence ao usuário
    const receita = await queryOne(
      'SELECT * FROM receitas WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!receita) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    // Deletar receita
    await execute('DELETE FROM receitas WHERE id = ?', [id]);

    res.json({ message: 'Receita deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar receita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT - Marcar receita como recebida
router.put('/:id/receber', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data_efetivacao } = req.body;

    // Buscar a receita antes de marcar como recebida para verificar recorrência
    const receitaData = await RevenueRepository.findById(id, req.user.id);
    if (!receitaData) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    const receita = await RevenueRepository.markAsReceived(id, req.user.id, data_efetivacao);

    // Se tem recorrência, criar próxima receita
    if (receitaData.recorrencia && receitaData.recorrencia !== 'nenhuma') {
      try {
        await createRecurrentRevenue(receitaData, req.user.id);
      } catch (recurrenceError) {
        console.error('Erro ao criar receita recorrente:', recurrenceError);
        // Não falha a operação principal, apenas loga o erro
      }
    }

    res.json({ 
      message: 'Receita marcada como recebida',
      receita
    });
  } catch (error) {
    console.error('Erro ao marcar receita como recebida:', error);
    
    if (error.message === 'Receita não encontrada') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message === 'Receita já foi recebida') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

async function createRecurrentRevenue(originalRevenue, userId) {
  const currentDate = new Date(originalRevenue.data_recebimento);
  let nextDate = new Date(currentDate);

  // Calcular próxima data baseada na recorrência
  switch (originalRevenue.recorrencia) {
    case 'diario':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'semanal':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'quinzenal':
      nextDate.setDate(nextDate.getDate() + 15);
      break;
    case 'mensal':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'bimestral':
      nextDate.setMonth(nextDate.getMonth() + 2);
      break;
    case 'trimestral':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'semestral':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'anual':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      return; // Recorrência não reconhecida
  }

  // Verificar se ainda está dentro do período de recorrência
  if (originalRevenue.data_fim_recorrencia) {
    const endDate = new Date(originalRevenue.data_fim_recorrencia);
    if (nextDate > endDate) {
      return; // Não criar nova receita, recorrência expirou
    }
  }

  // Criar nova receita
  const newRevenueData = {
    titulo: originalRevenue.titulo,
    descricao: originalRevenue.descricao,
    valor: originalRevenue.valor,
    categoria_id: originalRevenue.categoria_id,
    data_recebimento: nextDate.toISOString().split('T')[0],
    recorrencia: originalRevenue.recorrencia,
    data_fim_recorrencia: originalRevenue.data_fim_recorrencia,
    tem_impostos: originalRevenue.tem_impostos,
    ir_valor: originalRevenue.ir_valor,
    inss_valor: originalRevenue.inss_valor,
    fgts_valor: originalRevenue.fgts_valor,
    outros_descontos: originalRevenue.outros_descontos,
    user_id: userId,
    status: 'pendente'
  };

  await RevenueRepository.create(newRevenueData);
}

module.exports = router; 