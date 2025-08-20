const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { authenticateToken } = require('./auth');

// GET - Insights gerais do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { periodo } = req.query;
    
    const insights = await gerarInsightsGerais(userId, periodo);
    
    res.json({ insights });
  } catch (error) {
    console.error('Erro ao gerar insights:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Previsões financeiras
router.get('/previsoes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { meses } = req.query;
    
    const previsoes = await gerarPrevisoes(userId, parseInt(meses) || 3);
    
    res.json({ previsoes });
  } catch (error) {
    console.error('Erro ao gerar previsões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Análise de padrões
router.get('/padroes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const padroes = await analisarPadroes(userId);
    
    res.json({ padroes });
  } catch (error) {
    console.error('Erro ao analisar padrões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Recomendações personalizadas
router.get('/recomendacoes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const recomendacoes = await gerarRecomendacoes(userId);
    
    res.json({ recomendacoes });
  } catch (error) {
    console.error('Erro ao gerar recomendações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para gerar insights gerais
async function gerarInsightsGerais(userId, periodo = 'mes') {
  const insights = [];
  
  try {
    // 1. Análise de gastos por categoria
    const gastosPorCategoria = await query(`
      SELECT 
        c.nome as categoria,
        SUM(d.valor) as total,
        COUNT(*) as quantidade,
        AVG(d.valor) as media
      FROM despesas d
      JOIN categorias c ON c.id = d.categoria_id
      WHERE d.user_id = ? AND d.status = 'pago'
      ${periodo === 'mes' ? 'AND MONTH(d.data_vencimento) = MONTH(CURDATE()) AND YEAR(d.data_vencimento) = YEAR(CURDATE())' : ''}
      GROUP BY c.id, c.nome
      ORDER BY total DESC
      LIMIT 5
    `, [userId]);

    if (gastosPorCategoria.length > 0) {
      const maiorGasto = gastosPorCategoria[0];
      insights.push({
        tipo: 'gasto_categoria',
        titulo: 'Maior gasto por categoria',
        descricao: `${maiorGasto.categoria} representa ${((maiorGasto.total / gastosPorCategoria.reduce((sum, g) => sum + g.total, 0)) * 100).toFixed(1)}% dos seus gastos`,
        valor: maiorGasto.total,
        categoria: maiorGasto.categoria,
        prioridade: 'alta'
      });
    }

    // 2. Análise de receitas vs despesas
    const receitas = await queryOne(`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM receitas 
      WHERE user_id = ? AND status = 'recebido'
      ${periodo === 'mes' ? 'AND MONTH(data_recebimento) = MONTH(CURDATE()) AND YEAR(data_recebimento) = YEAR(CURDATE())' : ''}
    `, [userId]);

    const despesas = await queryOne(`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM despesas 
      WHERE user_id = ? AND status = 'pago'
      ${periodo === 'mes' ? 'AND MONTH(data_vencimento) = MONTH(CURDATE()) AND YEAR(data_vencimento) = YEAR(CURDATE())' : ''}
    `, [userId]);

    const saldo = receitas.total - despesas.total;
    const percentualGasto = (despesas.total / receitas.total) * 100;

    if (percentualGasto > 90) {
      insights.push({
        tipo: 'alerta_gasto',
        titulo: 'Atenção: Gastos muito altos',
        descricao: `Você está gastando ${percentualGasto.toFixed(1)}% da sua receita. Considere reduzir gastos.`,
        valor: percentualGasto,
        prioridade: 'alta'
      });
    } else if (saldo > 0) {
      insights.push({
        tipo: 'positivo_saldo',
        titulo: 'Saldo positivo',
        descricao: `Parabéns! Você economizou R$ ${saldo.toFixed(2)} este ${periodo}.`,
        valor: saldo,
        prioridade: 'baixa'
      });
    }

    // 3. Análise de tendências
    const tendencia = await analisarTendencia(userId, periodo);
    if (tendencia) {
      insights.push(tendencia);
    }

    // 4. Análise de investimentos
    const investimentos = await queryOne(`
      SELECT 
        COALESCE(SUM(valor), 0) as total_investido,
        COUNT(*) as quantidade
      FROM investimentos 
      WHERE user_id = ? AND status = 'ativo'
    `, [userId]);

    if (investimentos.total_investido > 0) {
      const percentualInvestimento = (investimentos.total_investido / receitas.total) * 100;
      
      if (percentualInvestimento < 10) {
        insights.push({
          tipo: 'investimento_baixo',
          titulo: 'Investimentos baixos',
          descricao: `Você está investindo apenas ${percentualInvestimento.toFixed(1)}% da sua receita. Considere aumentar.`,
          valor: percentualInvestimento,
          prioridade: 'media'
        });
      } else {
        insights.push({
          tipo: 'investimento_bom',
          titulo: 'Bom nível de investimentos',
          descricao: `Você está investindo ${percentualInvestimento.toFixed(1)}% da sua receita. Continue assim!`,
          valor: percentualInvestimento,
          prioridade: 'baixa'
        });
      }
    }

    // 5. Análise de metas
    const metas = await query(`
      SELECT * FROM metas 
      WHERE user_id = ? AND status = 'ativa'
      ORDER BY (progresso / valor_meta) DESC
      LIMIT 3
    `, [userId]);

    if (metas.length > 0) {
      const metaMaisProxima = metas[0];
      const percentual = (metaMaisProxima.progresso / metaMaisProxima.valor_meta) * 100;
      
      if (percentual >= 80) {
        insights.push({
          tipo: 'meta_proxima',
          titulo: 'Meta próxima de ser batida',
          descricao: `Sua meta "${metaMaisProxima.titulo}" está ${percentual.toFixed(1)}% completa!`,
          valor: percentual,
          meta: metaMaisProxima.titulo,
          prioridade: 'media'
        });
      }
    }

  } catch (error) {
    console.error('Erro ao gerar insights gerais:', error);
  }

  return insights;
}

// Função para gerar previsões
async function gerarPrevisoes(userId, meses) {
  const previsoes = [];
  
  try {
    // 1. Previsão de receitas
    const receitasHistoricas = await query(`
      SELECT 
        DATE_FORMAT(data_recebimento, '%Y-%m') as mes,
        SUM(valor) as total
      FROM receitas 
      WHERE user_id = ? AND status = 'recebido'
      AND data_recebimento >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(data_recebimento, '%Y-%m')
      ORDER BY mes
    `, [userId]);

    if (receitasHistoricas.length >= 2) {
      const mediaReceitas = receitasHistoricas.reduce((sum, r) => sum + r.total, 0) / receitasHistoricas.length;
      const tendenciaReceitas = calcularTendencia(receitasHistoricas.map(r => r.total));
      
      for (let i = 1; i <= meses; i++) {
        const dataPrevisao = new Date();
        dataPrevisao.setMonth(dataPrevisao.getMonth() + i);
        
        const previsaoReceita = mediaReceitas * (1 + (tendenciaReceitas * i));
        
        previsoes.push({
          tipo: 'receita',
          mes: dataPrevisao.toISOString().slice(0, 7),
          valor: previsaoReceita,
          confianca: 0.8
        });
      }
    }

    // 2. Previsão de despesas
    const despesasHistoricas = await query(`
      SELECT 
        DATE_FORMAT(data_vencimento, '%Y-%m') as mes,
        SUM(valor) as total
      FROM despesas 
      WHERE user_id = ? AND status = 'pago'
      AND data_vencimento >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(data_vencimento, '%Y-%m')
      ORDER BY mes
    `, [userId]);

    if (despesasHistoricas.length >= 2) {
      const mediaDespesas = despesasHistoricas.reduce((sum, d) => sum + d.total, 0) / despesasHistoricas.length;
      const tendenciaDespesas = calcularTendencia(despesasHistoricas.map(d => d.total));
      
      for (let i = 1; i <= meses; i++) {
        const dataPrevisao = new Date();
        dataPrevisao.setMonth(dataPrevisao.getMonth() + i);
        
        const previsaoDespesa = mediaDespesas * (1 + (tendenciaDespesas * i));
        
        previsoes.push({
          tipo: 'despesa',
          mes: dataPrevisao.toISOString().slice(0, 7),
          valor: previsaoDespesa,
          confianca: 0.7
        });
      }
    }

    // 3. Previsão de saldo
    const receitasFuturas = previsoes.filter(p => p.tipo === 'receita');
    const despesasFuturas = previsoes.filter(p => p.tipo === 'despesa');
    
    for (let i = 0; i < Math.min(receitasFuturas.length, despesasFuturas.length); i++) {
      const saldo = receitasFuturas[i].valor - despesasFuturas[i].valor;
      
      previsoes.push({
        tipo: 'saldo',
        mes: receitasFuturas[i].mes,
        valor: saldo,
        confianca: Math.min(receitasFuturas[i].confianca, despesasFuturas[i].confianca)
      });
    }

  } catch (error) {
    console.error('Erro ao gerar previsões:', error);
  }

  return previsoes;
}

// Função para analisar padrões
async function analisarPadroes(userId) {
  const padroes = [];
  
  try {
    // 1. Padrão de gastos por dia da semana
    const gastosPorDia = await query(`
      SELECT 
        DAYOFWEEK(data_vencimento) as dia_semana,
        AVG(valor) as media,
        COUNT(*) as quantidade
      FROM despesas 
      WHERE user_id = ? AND status = 'pago'
      AND data_vencimento >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
      GROUP BY DAYOFWEEK(data_vencimento)
      ORDER BY media DESC
    `, [userId]);

    if (gastosPorDia.length > 0) {
      const diaMaisGasto = gastosPorDia[0];
      const nomesDias = ['', 'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      
      padroes.push({
        tipo: 'dia_semana',
        titulo: 'Dia da semana com mais gastos',
        descricao: `${nomesDias[diaMaisGasto.dia_semana]} é o dia com maior gasto médio (R$ ${diaMaisGasto.media.toFixed(2)})`,
        valor: diaMaisGasto.media,
        detalhes: nomesDias[diaMaisGasto.dia_semana]
      });
    }

    // 2. Padrão de gastos por categoria ao longo do tempo
    const gastosCategoriaTempo = await query(`
      SELECT 
        c.nome as categoria,
        DATE_FORMAT(d.data_vencimento, '%Y-%m') as mes,
        SUM(d.valor) as total
      FROM despesas d
      JOIN categorias c ON c.id = d.categoria_id
      WHERE d.user_id = ? AND d.status = 'pago'
      AND d.data_vencimento >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY c.id, c.nome, DATE_FORMAT(d.data_vencimento, '%Y-%m')
      ORDER BY c.nome, mes
    `, [userId]);

    // Agrupar por categoria e analisar tendência
    const categorias = {};
    gastosCategoriaTempo.forEach(g => {
      if (!categorias[g.categoria]) {
        categorias[g.categoria] = [];
      }
      categorias[g.categoria].push(g.total);
    });

    Object.entries(categorias).forEach(([categoria, valores]) => {
      if (valores.length >= 3) {
        const tendencia = calcularTendencia(valores);
        if (Math.abs(tendencia) > 0.1) {
          padroes.push({
            tipo: 'tendencia_categoria',
            titulo: `Tendência em ${categoria}`,
            descricao: `${categoria} está ${tendencia > 0 ? 'aumentando' : 'diminuindo'} ${(Math.abs(tendencia) * 100).toFixed(1)}% por mês`,
            valor: tendencia,
            categoria: categoria,
            direcao: tendencia > 0 ? 'aumento' : 'diminuicao'
          });
        }
      }
    });

  } catch (error) {
    console.error('Erro ao analisar padrões:', error);
  }

  return padroes;
}

// Função para gerar recomendações
async function gerarRecomendacoes(userId) {
  const recomendacoes = [];
  
  try {
    // 1. Análise de gastos por categoria
    const gastosPorCategoria = await query(`
      SELECT 
        c.nome as categoria,
        SUM(d.valor) as total,
        COUNT(*) as quantidade
      FROM despesas d
      JOIN categorias c ON c.id = d.categoria_id
      WHERE d.user_id = ? AND d.status = 'pago'
      AND MONTH(d.data_vencimento) = MONTH(CURDATE()) AND YEAR(d.data_vencimento) = YEAR(CURDATE())
      GROUP BY c.id, c.nome
      ORDER BY total DESC
      LIMIT 3
    `, [userId]);

    if (gastosPorCategoria.length > 0) {
      const maiorGasto = gastosPorCategoria[0];
      const totalGastos = gastosPorCategoria.reduce((sum, g) => sum + g.total, 0);
      const percentual = (maiorGasto.total / totalGastos) * 100;
      
      if (percentual > 40) {
        recomendacoes.push({
          tipo: 'reducao_gasto',
          titulo: 'Reduzir gastos em ' + maiorGasto.categoria,
          descricao: `${maiorGasto.categoria} representa ${percentual.toFixed(1)}% dos seus gastos. Considere reduzir.`,
          acao: `Analise seus gastos em ${maiorGasto.categoria} e identifique oportunidades de economia.`,
          prioridade: 'alta'
        });
      }
    }

    // 2. Recomendação de investimentos
    const receitas = await queryOne(`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM receitas 
      WHERE user_id = ? AND status = 'recebido'
      AND MONTH(data_recebimento) = MONTH(CURDATE()) AND YEAR(data_recebimento) = YEAR(CURDATE())
    `, [userId]);

    const investimentos = await queryOne(`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM investimentos 
      WHERE user_id = ? AND status = 'ativo'
    `, [userId]);

    const percentualInvestimento = (investimentos.total / receitas.total) * 100;
    
    if (percentualInvestimento < 10) {
      recomendacoes.push({
        tipo: 'aumentar_investimento',
        titulo: 'Aumentar investimentos',
        descricao: `Você está investindo apenas ${percentualInvestimento.toFixed(1)}% da sua receita.`,
        acao: 'Considere investir pelo menos 10% da sua receita mensal para construir patrimônio.',
        prioridade: 'media'
      });
    }

    // 3. Recomendação de metas
    const metas = await query(`
      SELECT * FROM metas 
      WHERE user_id = ? AND status = 'ativa'
      ORDER BY data_criacao DESC
      LIMIT 5
    `, [userId]);

    if (metas.length === 0) {
      recomendacoes.push({
        tipo: 'criar_metas',
        titulo: 'Criar metas financeiras',
        descricao: 'Você ainda não tem metas financeiras definidas.',
        acao: 'Defina metas específicas para economizar, investir ou reduzir dívidas.',
        prioridade: 'media'
      });
    }

    // 4. Recomendação de controle
    const ultimaTransacao = await queryOne(`
      SELECT created_date FROM (
        SELECT created_date FROM receitas WHERE user_id = ?
        UNION ALL
        SELECT created_date FROM despesas WHERE user_id = ?
      ) as transacoes
      ORDER BY created_date DESC
      LIMIT 1
    `, [userId, userId]);

    if (ultimaTransacao) {
      const diasDesdeUltimaTransacao = Math.floor((new Date() - new Date(ultimaTransacao.created_date)) / (1000 * 60 * 60 * 24));
      
      if (diasDesdeUltimaTransacao > 7) {
        recomendacoes.push({
          tipo: 'atualizar_controle',
          titulo: 'Atualizar controle financeiro',
          descricao: `Faz ${diasDesdeUltimaTransacao} dias que você não registrou transações.`,
          acao: 'Mantenha seu controle financeiro atualizado registrando todas as transações.',
          prioridade: 'alta'
        });
      }
    }

  } catch (error) {
    console.error('Erro ao gerar recomendações:', error);
  }

  return recomendacoes;
}

// Função para analisar tendência
async function analisarTendencia(userId, periodo) {
  try {
    const dados = await query(`
      SELECT 
        DATE_FORMAT(data_vencimento, '%Y-%m') as mes,
        SUM(valor) as total
      FROM despesas 
      WHERE user_id = ? AND status = 'pago'
      AND data_vencimento >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(data_vencimento, '%Y-%m')
      ORDER BY mes
    `, [userId]);

    if (dados.length >= 3) {
      const valores = dados.map(d => d.total);
      const tendencia = calcularTendencia(valores);
      
      if (Math.abs(tendencia) > 0.05) {
        return {
          tipo: 'tendencia_gastos',
          titulo: 'Tendência de gastos',
          descricao: `Seus gastos estão ${tendencia > 0 ? 'aumentando' : 'diminuindo'} ${(Math.abs(tendencia) * 100).toFixed(1)}% por mês`,
          valor: tendencia,
          direcao: tendencia > 0 ? 'aumento' : 'diminuicao',
          prioridade: 'media'
        };
      }
    }
  } catch (error) {
    console.error('Erro ao analisar tendência:', error);
  }
  
  return null;
}

// Função para calcular tendência linear
function calcularTendencia(valores) {
  if (valores.length < 2) return 0;
  
  const n = valores.length;
  const x = Array.from({length: n}, (_, i) => i);
  const y = valores;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const mediaY = sumY / n;
  
  return mediaY > 0 ? slope / mediaY : 0;
}

module.exports = router; 