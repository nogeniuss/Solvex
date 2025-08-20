const express = require('express');
const router = express.Router();
const { query, queryOne, execute } = require('../database');
const { authenticateToken } = require('./auth');
const logger = require('../config/logger');

// GET - Listar conquistas do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tipo, status } = req.query;
    
    let sql = `
      SELECT * FROM conquistas WHERE user_id = ?
    `;
    const params = [userId];
    
    if (tipo) {
      sql += ' AND tipo = ?';
      params.push(tipo);
    }
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY data_conquista DESC';
    
    const conquistas = await query(sql, params);
    
    logger.audit('achievements_listed', userId, {
      count: conquistas.length,
      filters: { tipo, status }
    });
    
    res.json({ conquistas });
  } catch (error) {
    logger.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Conquista específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conquistaId = req.params.id;
    
    const conquista = await queryOne(`
      SELECT * FROM conquistas WHERE id = ? AND user_id = ?
    `, [conquistaId, userId]);

    if (!conquista) {
      return res.status(404).json({ error: 'Conquista não encontrada' });
    }

    res.json({ conquista });
  } catch (error) {
    logger.error('Error fetching achievement:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Verificar e gerar novas conquistas
router.post('/verificar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const novasConquistas = await verificarConquistas(userId);
    
    logger.audit('achievements_checked', userId, {
      novasConquistas: novasConquistas.length
    });
    
    res.json({
      message: 'Verificação de conquistas concluída',
      novasConquistas: novasConquistas.length,
      conquistas: novasConquistas
    });
  } catch (error) {
    logger.error('Error checking achievements:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Estatísticas de progresso
router.get('/progresso', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const progresso = await calcularProgressoGeral(userId);
    
    res.json({ progresso });
  } catch (error) {
    logger.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Ranking de conquistas
router.get('/ranking', authenticateToken, async (req, res) => {
  try {
    const ranking = await query(`
      SELECT 
        u.nome,
        u.email,
        COUNT(c.id) as total_conquistas,
        SUM(c.pontos) as pontos_totais,
        MAX(c.data_conquista) as ultima_conquista
      FROM users u
      LEFT JOIN conquistas c ON u.id = c.user_id
      WHERE u.status = 'ativo'
      GROUP BY u.id, u.nome, u.email
      ORDER BY pontos_totais DESC, total_conquistas DESC
      LIMIT 10
    `);
    
    res.json({ ranking });
  } catch (error) {
    logger.error('Error fetching ranking:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para verificar e gerar novas conquistas
async function verificarConquistas(userId) {
  const novasConquistas = [];
  
  // Conquistas de consistência
  await verificarConquistaConsistencia(userId, novasConquistas);
  
  // Conquistas de metas
  await verificarConquistaMetas(userId, novasConquistas);
  
  // Conquistas de economia
  await verificarConquistaEconomia(userId, novasConquistas);
  
  // Conquistas de investimentos
  await verificarConquistaInvestimentos(userId, novasConquistas);
  
  // Conquistas de organização
  await verificarConquistaOrganizacao(userId, novasConquistas);
  
  // Conquistas de diversificação
  await verificarConquistaDiversificacao(userId, novasConquistas);
  
  // Conquistas de planejamento
  await verificarConquistaPlanejamento(userId, novasConquistas);
  
  // Conquistas de controle
  await verificarConquistaControle(userId, novasConquistas);
  
  return novasConquistas;
}

// Verificar conquistas de consistência
async function verificarConquistaConsistencia(userId, novasConquistas) {
  const conquistas = [
    {
      titulo: 'Usuário Consistente',
      descricao: 'Usou o sistema 7 dias seguidos',
      tipo: 'consistencia',
      pontos: 50,
      condicao: async () => await verificarUsoConsistente(userId, 7)
    },
    {
      titulo: 'Usuário Dedicado',
      descricao: 'Usou o sistema 30 dias seguidos',
      tipo: 'consistencia',
      pontos: 150,
      condicao: async () => await verificarUsoConsistente(userId, 30)
    },
    {
      titulo: 'Usuário Comprometido',
      descricao: 'Usou o sistema 100 dias seguidos',
      tipo: 'consistencia',
      pontos: 300,
      condicao: async () => await verificarUsoConsistente(userId, 100)
    }
  ];
  
  for (const conquista of conquistas) {
    if (await conquista.condicao() && !await conquistaExiste(userId, conquista.titulo)) {
      const novaConquista = await criarConquista(userId, conquista);
      if (novaConquista) novasConquistas.push(novaConquista);
    }
  }
}

// Verificar conquistas de metas
async function verificarConquistaMetas(userId, novasConquistas) {
  const conquistas = [
    {
      titulo: 'Conquistador de Metas',
      descricao: 'Bateu 3 metas seguidas',
      tipo: 'metas',
      pontos: 100,
      condicao: async () => await verificarMetasCumpridas(userId, 3)
    },
    {
      titulo: 'Mestre das Metas',
      descricao: 'Bateu 10 metas no total',
      tipo: 'metas',
      pontos: 250,
      condicao: async () => await verificarTotalMetas(userId, 10)
    },
    {
      titulo: 'Lenda das Metas',
      descricao: 'Bateu 50 metas no total',
      tipo: 'metas',
      pontos: 500,
      condicao: async () => await verificarTotalMetas(userId, 50)
    }
  ];
  
  for (const conquista of conquistas) {
    if (await conquista.condicao() && !await conquistaExiste(userId, conquista.titulo)) {
      const novaConquista = await criarConquista(userId, conquista);
      if (novaConquista) novasConquistas.push(novaConquista);
    }
  }
}

// Verificar conquistas de economia
async function verificarConquistaEconomia(userId, novasConquistas) {
  const conquistas = [
    {
      titulo: 'Economista',
      descricao: 'Economizou R$500 em um mês',
      tipo: 'economia',
      pontos: 75,
      condicao: async () => await verificarEconomia(userId, 500)
    },
    {
      titulo: 'Poupador',
      descricao: 'Economizou R$1.000 em um mês',
      tipo: 'economia',
      pontos: 150,
      condicao: async () => await verificarEconomia(userId, 1000)
    },
    {
      titulo: 'Milionário',
      descricao: 'Economizou R$10.000 no total',
      tipo: 'economia',
      pontos: 1000,
      condicao: async () => await verificarEconomiaTotal(userId, 10000)
    }
  ];
  
  for (const conquista of conquistas) {
    if (await conquista.condicao() && !await conquistaExiste(userId, conquista.titulo)) {
      const novaConquista = await criarConquista(userId, conquista);
      if (novaConquista) novasConquistas.push(novaConquista);
    }
  }
}

// Verificar conquistas de investimentos
async function verificarConquistaInvestimentos(userId, novasConquistas) {
  const conquistas = [
    {
      titulo: 'Investidor Iniciante',
      descricao: 'Fez seu primeiro investimento',
      tipo: 'investimento',
      pontos: 60,
      condicao: async () => await verificarPrimeiroInvestimento(userId)
    },
    {
      titulo: 'Investidor Diversificado',
      descricao: 'Investiu em 5 categorias diferentes',
      tipo: 'investimento',
      pontos: 200,
      condicao: async () => await verificarDiversificacaoInvestimentos(userId, 5)
    },
    {
      titulo: 'Investidor Experiente',
      descricao: 'Investiu R$50.000 no total',
      tipo: 'investimento',
      pontos: 400,
      condicao: async () => await verificarTotalInvestimentos(userId, 50000)
    }
  ];
  
  for (const conquista of conquistas) {
    if (await conquista.condicao() && !await conquistaExiste(userId, conquista.titulo)) {
      const novaConquista = await criarConquista(userId, conquista);
      if (novaConquista) novasConquistas.push(novaConquista);
    }
  }
}

// Verificar conquistas de organização
async function verificarConquistaOrganizacao(userId, novasConquistas) {
  const conquistas = [
    {
      titulo: 'Organizado',
      descricao: 'Categorizou 50 transações',
      tipo: 'organizacao',
      pontos: 80,
      condicao: async () => await verificarCategorizacao(userId, 50)
    },
    {
      titulo: 'Muito Organizado',
      descricao: 'Categorizou 200 transações',
      tipo: 'organizacao',
      pontos: 200,
      condicao: async () => await verificarCategorizacao(userId, 200)
    },
    {
      titulo: 'Perfeccionista',
      descricao: 'Categorizou 100% das transações do mês',
      tipo: 'organizacao',
      pontos: 150,
      condicao: async () => await verificarCategorizacaoCompleta(userId)
    }
  ];
  
  for (const conquista of conquistas) {
    if (await conquista.condicao() && !await conquistaExiste(userId, conquista.titulo)) {
      const novaConquista = await criarConquista(userId, conquista);
      if (novaConquista) novasConquistas.push(novaConquista);
    }
  }
}

// Verificar conquistas de diversificação
async function verificarConquistaDiversificacao(userId, novasConquistas) {
  const conquistas = [
    {
      titulo: 'Diversificado',
      descricao: 'Usou 10 categorias diferentes',
      tipo: 'diversificacao',
      pontos: 100,
      condicao: async () => await verificarCategoriasDiferentes(userId, 10)
    },
    {
      titulo: 'Explorador',
      descricao: 'Usou 20 categorias diferentes',
      tipo: 'diversificacao',
      pontos: 250,
      condicao: async () => await verificarCategoriasDiferentes(userId, 20)
    }
  ];
  
  for (const conquista of conquistas) {
    if (await conquista.condicao() && !await conquistaExiste(userId, conquista.titulo)) {
      const novaConquista = await criarConquista(userId, conquista);
      if (novaConquista) novasConquistas.push(novaConquista);
    }
  }
}

// Verificar conquistas de planejamento
async function verificarConquistaPlanejamento(userId, novasConquistas) {
  const conquistas = [
    {
      titulo: 'Planejador',
      descricao: 'Criou 5 metas',
      tipo: 'planejamento',
      pontos: 120,
      condicao: async () => await verificarMetasCriadas(userId, 5)
    },
    {
      titulo: 'Estrategista',
      descricao: 'Criou 20 metas',
      tipo: 'planejamento',
      pontos: 300,
      condicao: async () => await verificarMetasCriadas(userId, 20)
    },
    {
      titulo: 'Visionário',
      descricao: 'Criou metas para 12 meses seguidos',
      tipo: 'planejamento',
      pontos: 400,
      condicao: async () => await verificarMetasAnuais(userId)
    }
  ];
  
  for (const conquista of conquistas) {
    if (await conquista.condicao() && !await conquistaExiste(userId, conquista.titulo)) {
      const novaConquista = await criarConquista(userId, conquista);
      if (novaConquista) novasConquistas.push(novaConquista);
    }
  }
}

// Verificar conquistas de controle
async function verificarConquistaControle(userId, novasConquistas) {
  const conquistas = [
    {
      titulo: 'Controlado',
      descricao: 'Manteve despesas abaixo do orçamento por 3 meses',
      tipo: 'controle',
      pontos: 200,
      condicao: async () => await verificarControleOrcamento(userId, 3)
    },
    {
      titulo: 'Disciplinado',
      descricao: 'Manteve despesas abaixo do orçamento por 6 meses',
      tipo: 'controle',
      pontos: 400,
      condicao: async () => await verificarControleOrcamento(userId, 6)
    },
    {
      titulo: 'Mestre do Controle',
      descricao: 'Manteve despesas abaixo do orçamento por 12 meses',
      tipo: 'controle',
      pontos: 800,
      condicao: async () => await verificarControleOrcamento(userId, 12)
    }
  ];
  
  for (const conquista of conquistas) {
    if (await conquista.condicao() && !await conquistaExiste(userId, conquista.titulo)) {
      const novaConquista = await criarConquista(userId, conquista);
      if (novaConquista) novasConquistas.push(novaConquista);
    }
  }
}

// Funções auxiliares para verificar condições
async function verificarUsoConsistente(userId, dias) {
  const result = await query(`
    SELECT COUNT(DISTINCT DATE(created_date)) as dias_uso
    FROM (
      SELECT created_date FROM despesas WHERE user_id = ?
      UNION
      SELECT created_date FROM receitas WHERE user_id = ?
      UNION
      SELECT created_date FROM investimentos WHERE user_id = ?
    ) as atividades
    WHERE created_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
  `, [userId, userId, userId, dias]);
  
  return result[0].dias_uso >= dias;
}

async function verificarMetasCumpridas(userId, quantidade) {
  const result = await query(`
    SELECT COUNT(*) as metas_cumpridas
    FROM metas 
    WHERE user_id = ? AND status = 'concluida'
    ORDER BY data_fim DESC
    LIMIT ?
  `, [userId, quantidade]);
  
  return result[0].metas_cumpridas >= quantidade;
}

async function verificarTotalMetas(userId, quantidade) {
  const result = await query(`
    SELECT COUNT(*) as total_metas
    FROM metas 
    WHERE user_id = ? AND status = 'concluida'
  `, [userId]);
  
  return result[0].total_metas >= quantidade;
}

async function verificarEconomia(userId, valor) {
  const result = await query(`
    SELECT 
      COALESCE(SUM(r.valor), 0) as receitas,
      COALESCE(SUM(d.valor), 0) as despesas
    FROM (
      SELECT valor FROM receitas 
      WHERE user_id = ? AND MONTH(data_recebimento) = MONTH(NOW()) 
      AND YEAR(data_recebimento) = YEAR(NOW())
    ) r,
    (
      SELECT valor FROM despesas 
      WHERE user_id = ? AND MONTH(data_vencimento) = MONTH(NOW()) 
      AND YEAR(data_vencimento) = YEAR(NOW())
    ) d
  `, [userId, userId]);
  
  const economia = result[0].receitas - result[0].despesas;
  return economia >= valor;
}

async function verificarEconomiaTotal(userId, valor) {
  const result = await query(`
    SELECT 
      COALESCE(SUM(r.valor), 0) as receitas,
      COALESCE(SUM(d.valor), 0) as despesas
    FROM receitas r, despesas d
    WHERE r.user_id = ? AND d.user_id = ?
  `, [userId, userId]);
  
  const economia = result[0].receitas - result[0].despesas;
  return economia >= valor;
}

async function verificarPrimeiroInvestimento(userId) {
  const result = await query(`
    SELECT COUNT(*) as total
    FROM investimentos 
    WHERE user_id = ?
  `, [userId]);
  
  return result[0].total > 0;
}

async function verificarDiversificacaoInvestimentos(userId, categorias) {
  const result = await query(`
    SELECT COUNT(DISTINCT categoria_id) as categorias
    FROM investimentos 
    WHERE user_id = ?
  `, [userId]);
  
  return result[0].categorias >= categorias;
}

async function verificarTotalInvestimentos(userId, valor) {
  const result = await query(`
    SELECT COALESCE(SUM(valor_inicial), 0) as total
    FROM investimentos 
    WHERE user_id = ?
  `, [userId]);
  
  return result[0].total >= valor;
}

async function verificarCategorizacao(userId, quantidade) {
  const result = await query(`
    SELECT COUNT(*) as total
    FROM (
      SELECT categoria_id FROM despesas WHERE user_id = ? AND categoria_id IS NOT NULL
      UNION
      SELECT categoria_id FROM receitas WHERE user_id = ? AND categoria_id IS NOT NULL
    ) as categorizadas
  `, [userId, userId]);
  
  return result[0].total >= quantidade;
}

async function verificarCategorizacaoCompleta(userId) {
  const result = await query(`
    SELECT 
      COUNT(*) as total_transacoes,
      SUM(CASE WHEN categoria_id IS NOT NULL THEN 1 ELSE 0 END) as categorizadas
    FROM (
      SELECT categoria_id FROM despesas 
      WHERE user_id = ? AND MONTH(data_vencimento) = MONTH(NOW()) 
      AND YEAR(data_vencimento) = YEAR(NOW())
      UNION
      SELECT categoria_id FROM receitas 
      WHERE user_id = ? AND MONTH(data_recebimento) = MONTH(NOW()) 
      AND YEAR(data_recebimento) = YEAR(NOW())
    ) as transacoes
  `, [userId, userId]);
  
  return result[0].total_transacoes > 0 && 
         result[0].categorizadas === result[0].total_transacoes;
}

async function verificarCategoriasDiferentes(userId, quantidade) {
  const result = await query(`
    SELECT COUNT(DISTINCT categoria_id) as categorias
    FROM (
      SELECT categoria_id FROM despesas WHERE user_id = ? AND categoria_id IS NOT NULL
      UNION
      SELECT categoria_id FROM receitas WHERE user_id = ? AND categoria_id IS NOT NULL
    ) as categorias
  `, [userId, userId]);
  
  return result[0].categorias >= quantidade;
}

async function verificarMetasCriadas(userId, quantidade) {
  const result = await query(`
    SELECT COUNT(*) as total
    FROM metas 
    WHERE user_id = ?
  `, [userId]);
  
  return result[0].total >= quantidade;
}

async function verificarMetasAnuais(userId) {
  const result = await query(`
    SELECT COUNT(DISTINCT YEAR(data_inicio)) as anos
    FROM metas 
    WHERE user_id = ?
  `, [userId]);
  
  return result[0].anos >= 1;
}

async function verificarControleOrcamento(userId, meses) {
  // Implementação simplificada - verificar se manteve despesas controladas
  const result = await query(`
    SELECT COUNT(*) as meses_controlados
    FROM (
      SELECT 
        YEAR(data_vencimento) as ano,
        MONTH(data_vencimento) as mes,
        SUM(valor) as total_despesas
      FROM despesas 
      WHERE user_id = ?
      GROUP BY YEAR(data_vencimento), MONTH(data_vencimento)
      ORDER BY ano DESC, mes DESC
      LIMIT ?
    ) as meses
    WHERE total_despesas <= 5000  -- Valor exemplo para controle
  `, [userId, meses]);
  
  return result[0].meses_controlados >= meses;
}

// Função para verificar se conquista já existe
async function conquistaExiste(userId, titulo) {
  const result = await queryOne(`
    SELECT id FROM conquistas 
    WHERE user_id = ? AND titulo = ?
  `, [userId, titulo]);
  
  return !!result;
}

// Função para criar nova conquista
async function criarConquista(userId, conquista) {
  try {
    const result = await execute(`
      INSERT INTO conquistas (
        titulo, descricao, tipo, pontos, user_id, data_conquista, status
      ) VALUES (?, ?, ?, ?, ?, NOW(), 'ativa')
    `, [conquista.titulo, conquista.descricao, conquista.tipo, 
        conquista.pontos, userId]);

    const novaConquista = await queryOne(`
      SELECT * FROM conquistas WHERE id = ?
    `, [result.insertId]);

    logger.audit('achievement_earned', userId, {
      achievementId: result.insertId,
      titulo: conquista.titulo,
      pontos: conquista.pontos
    });

    return novaConquista;
  } catch (error) {
    logger.error('Error creating achievement:', error);
    return null;
  }
}

// Função para calcular progresso geral
async function calcularProgressoGeral(userId) {
  try {
    const [conquistas, totalPontos, ranking] = await Promise.all([
      query('SELECT COUNT(*) as total FROM conquistas WHERE user_id = ?', [userId]),
      query('SELECT COALESCE(SUM(pontos), 0) as pontos FROM conquistas WHERE user_id = ?', [userId]),
      query(`
        SELECT COUNT(*) + 1 as posicao
        FROM (
          SELECT user_id, SUM(pontos) as pontos_totais
          FROM conquistas
          GROUP BY user_id
          HAVING SUM(pontos) > (
            SELECT COALESCE(SUM(pontos), 0)
            FROM conquistas
            WHERE user_id = ?
          )
        ) as ranking
      `, [userId])
    ]);

    return {
      total_conquistas: conquistas[0].total,
      pontos_totais: totalPontos[0].pontos,
      ranking: ranking[0].posicao
    };
  } catch (error) {
    logger.error('Error calculating progress:', error);
    return { total_conquistas: 0, pontos_totais: 0, ranking: 0 };
  }
}

module.exports = router; 