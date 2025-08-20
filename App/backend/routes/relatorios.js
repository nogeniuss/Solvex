const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { authenticateToken } = require('./auth');
const { 
  requireActiveSubscription, 
  allowTrialAccess, 
  requireFeature 
} = require('../middleware/subscription');

// GET - Dashboard Geral de Relatórios (Acesso livre para usuários autenticados)
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { periodo, ano, mes } = req.query;

    const anoFiltro = ano || new Date().getFullYear();
    const mesFiltro = mes || (new Date().getMonth() + 1);

    // KPIs Principais
    const kpis = await queryOne(`
      SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) as totalReceitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) as totalDespesas,
        COALESCE(SUM(CASE WHEN tipo = 'investimento' THEN valor ELSE 0 END), 0) as totalInvestimentos,
        COUNT(CASE WHEN tipo = 'receita' THEN 1 END) as qtdReceitas,
        COUNT(CASE WHEN tipo = 'despesa' THEN 1 END) as qtdDespesas,
        COUNT(CASE WHEN tipo = 'investimento' THEN 1 END) as qtdInvestimentos
      FROM (
        SELECT 'receita' as tipo, valor, data_recebimento as data FROM receitas WHERE user_id = ?
        UNION ALL
        SELECT 'despesa' as tipo, valor, data_vencimento as data FROM despesas WHERE user_id = ?
        UNION ALL
        SELECT 'investimento' as tipo, valor_inicial as valor, data_inicio as data FROM investimentos WHERE user_id = ? AND status = 'ativo'
      ) as transacoes
      WHERE YEAR(data) = ? AND MONTH(data) = ?
    `, [userId, userId, userId, anoFiltro, mesFiltro]);

    // Score de Saúde Financeira
    const score = await calcularScoreFinanceiro(userId, anoFiltro, mesFiltro);

    // Evolução dos últimos 12 meses
    const evolucao = await query(`
      SELECT 
        DATE_FORMAT(data, '%Y-%m') as mes,
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) as receitas,
        SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as despesas,
        SUM(CASE WHEN tipo = 'investimento' THEN valor ELSE 0 END) as investimentos
      FROM (
        SELECT 'receita' as tipo, valor, data_recebimento as data FROM receitas WHERE user_id = ?
        UNION ALL
        SELECT 'despesa' as tipo, valor, data_vencimento as data FROM despesas WHERE user_id = ?
        UNION ALL
        SELECT 'investimento' as tipo, valor_inicial as valor, data_inicio as data FROM investimentos WHERE user_id = ? AND status = 'ativo'
      ) as transacoes
      WHERE data >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(data, '%Y-%m')
      ORDER BY mes
    `, [userId, userId, userId]);

    // Flatten para combinar com o frontend
    const saldo = parseFloat(kpis.totalReceitas || 0) - parseFloat(kpis.totalDespesas || 0);
    res.json({
      totalReceitas: parseFloat(kpis.totalReceitas || 0),
      totalDespesas: parseFloat(kpis.totalDespesas || 0),
      totalInvestimentos: parseFloat(kpis.totalInvestimentos || 0),
      qtdReceitas: kpis.qtdReceitas || 0,
      qtdDespesas: kpis.qtdDespesas || 0,
      qtdInvestimentos: kpis.qtdInvestimentos || 0,
      saldo,
      scoreSaudeFinanceira: score.score || 0,
      evolucao
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard de relatórios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Análise de Categorias
router.get('/categorias', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ano, mes, tipo } = req.query;

    const anoFiltro = ano || new Date().getFullYear();
    const mesFiltro = mes || (new Date().getMonth() + 1);

    // Análise por categoria
    const categorias = await query(`
      SELECT 
        c.nome as categoria,
        c.cor,
        COUNT(*) as quantidade,
        SUM(valor) as total,
        AVG(valor) as media,
        MIN(valor) as minimo,
        MAX(valor) as maximo,
        DATE_FORMAT(data, '%Y-%m') as mes
      FROM (
        SELECT categoria_id, valor, data_recebimento as data FROM receitas WHERE user_id = ?
        UNION ALL
        SELECT categoria_id, valor, data_vencimento as data FROM despesas WHERE user_id = ?
      ) as transacoes
      JOIN categorias c ON c.id = transacoes.categoria_id
      WHERE YEAR(data) = ? AND MONTH(data) = ?
      GROUP BY c.id, c.nome, c.cor, DATE_FORMAT(data, '%Y-%m')
      ORDER BY total DESC
    `, [userId, userId, anoFiltro, mesFiltro]);

    // Distribuição percentual
    const total = categorias.reduce((sum, cat) => sum + parseFloat(cat.total), 0);
    const distribuicao = categorias.map(cat => ({
      ...cat,
      total: parseFloat(cat.total || 0),
      media: parseFloat(cat.media || 0),
      minimo: parseFloat(cat.minimo || 0),
      maximo: parseFloat(cat.maximo || 0),
      percentual: total > 0 ? parseFloat((parseFloat(cat.total) / total * 100).toFixed(2)) : 0
    }));

    res.json({ categorias: distribuicao });
  } catch (error) {
    console.error('Erro ao buscar análise de categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Mapa de Calor de Gastos
router.get('/heatmap', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ano } = req.query;
    
    const anoFiltro = ano || new Date().getFullYear();
    
    // Dados para mapa de calor (gastos por dia do ano)
    const heatmapData = await query(`
      SELECT 
        DATE(data_vencimento) as data,
        SUM(valor) as total,
        COUNT(*) as quantidade
      FROM despesas 
      WHERE user_id = ? AND YEAR(data_vencimento) = ?
      GROUP BY DATE(data_vencimento)
      ORDER BY data
    `, [userId, anoFiltro]);

    // Calcular intensidade (0-100)
    const maxValor = Math.max(...heatmapData.map(d => parseFloat(d.total)));
    const heatmap = heatmapData.map(d => ({
      data: d.data,
      valor: parseFloat(d.total),
      quantidade: parseInt(d.quantidade),
      intensidade: maxValor > 0 ? parseFloat(((parseFloat(d.total) / maxValor) * 100).toFixed(2)) : 0
    }));

    res.json({ heatmap });
  } catch (error) {
    console.error('Erro ao buscar mapa de calor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Análise de Tendências
router.get('/tendencias', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { periodo } = req.query; // 6m, 12m, 24m
    
    const meses = periodo === '6m' ? 6 : periodo === '24m' ? 24 : 12;
    
    // Tendência de receitas vs despesas
    const tendencias = await query(`
      SELECT 
        DATE_FORMAT(data, '%Y-%m') as mes,
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) as receitas,
        SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as despesas,
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) - SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as saldo
      FROM (
        SELECT 'receita' as tipo, valor, data_recebimento as data FROM receitas WHERE user_id = ?
        UNION ALL
        SELECT 'despesa' as tipo, valor, data_vencimento as data FROM despesas WHERE user_id = ?
      ) as transacoes
      WHERE data >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(data, '%Y-%m')
      ORDER BY mes
    `, [userId, userId, meses]);

    // Calcular crescimento (numérico)
    const tendenciasComCrescimento = tendencias.map((item, index) => {
      const receitas = parseFloat(item.receitas || 0);
      const despesas = parseFloat(item.despesas || 0);
      if (index === 0) return { ...item, receitas, despesas, saldo: parseFloat(item.saldo || 0), crescimentoReceitas: 0, crescimentoDespesas: 0 };
      
      const anterior = tendencias[index - 1];
      const receitasAnt = parseFloat(anterior.receitas || 0);
      const despesasAnt = parseFloat(anterior.despesas || 0);
      const crescimentoReceitas = receitasAnt > 0 ? parseFloat((((receitas - receitasAnt) / receitasAnt) * 100).toFixed(2)) : 0;
      const crescimentoDespesas = despesasAnt > 0 ? parseFloat((((despesas - despesasAnt) / despesasAnt) * 100).toFixed(2)) : 0;
      
      return { ...item, receitas, despesas, saldo: parseFloat(item.saldo || 0), crescimentoReceitas, crescimentoDespesas };
    });

    res.json({ tendencias: tendenciasComCrescimento });
  } catch (error) {
    console.error('Erro ao buscar tendências:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Análise de Investimentos
router.get('/investimentos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ano, mes } = req.query;
    
    const anoFiltro = ano || new Date().getFullYear();
    const mesFiltro = mes || (new Date().getMonth() + 1);

    // Performance dos investimentos
    const performance = await query(`
      SELECT 
        i.titulo,
        i.valor_inicial as valor_inicial,
        i.rentabilidade as rendimento_esperado,
        i.data_inicio,
        i.tipo as tipo_investimento,
        c.nome as categoria,
        DATEDIFF(NOW(), i.data_inicio) as dias_investido,
        (i.valor_inicial * (1 + (i.rentabilidade / 100) * (DATEDIFF(NOW(), i.data_inicio) / 365))) as valor_atual,
        ((i.valor_inicial * (1 + (i.rentabilidade / 100) * (DATEDIFF(NOW(), i.data_inicio) / 365))) - i.valor_inicial) as lucro
      FROM investimentos i
      LEFT JOIN categorias c ON c.id = i.categoria_id
      WHERE i.user_id = ? AND YEAR(i.data_inicio) = ? AND MONTH(i.data_inicio) = ?
      ORDER BY lucro DESC
    `, [userId, anoFiltro, mesFiltro]);

    // Análise por tipo de investimento
    const porTipo = await query(`
      SELECT 
        tipo as tipo_investimento,
        COUNT(*) as quantidade,
        SUM(valor_inicial) as total_investido,
        AVG(rentabilidade) as rendimento_medio,
        SUM((valor_inicial * (1 + (rentabilidade / 100) * (DATEDIFF(NOW(), data_inicio) / 365))) - valor_inicial) as lucro_total
      FROM investimentos
      WHERE user_id = ? AND YEAR(data_inicio) = ? AND MONTH(data_inicio) = ?
      GROUP BY tipo
      ORDER BY lucro_total DESC
    `, [userId, anoFiltro, mesFiltro]);

    res.json({ performance, porTipo });
  } catch (error) {
    console.error('Erro ao buscar análise de investimentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Relatório de Fluxo de Caixa
router.get('/fluxo-caixa', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ano, mes } = req.query;
    
    const anoFiltro = ano || new Date().getFullYear();
    const mesFiltro = mes || new Date().getMonth() + 1;
    
    // Fluxo de caixa diário
    const fluxoDiario = await query(`
      SELECT 
        DATE(data) as data,
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) as entradas,
        SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as saidas,
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END) as saldo
      FROM (
        SELECT 'receita' as tipo, valor, data_recebimento as data FROM receitas WHERE user_id = ?
        UNION ALL
        SELECT 'despesa' as tipo, valor, data_vencimento as data FROM despesas WHERE user_id = ?
      ) as transacoes
      WHERE YEAR(data) = ? AND MONTH(data) = ?
      GROUP BY DATE(data)
      ORDER BY data
    `, [userId, userId, anoFiltro, mesFiltro]);

    // Saldo acumulado
    let saldoAcumulado = 0;
    const fluxoComAcumulado = fluxoDiario.map(item => {
      const entradas = parseFloat(item.entradas || 0);
      const saidas = parseFloat(item.saidas || 0);
      const saldo = parseFloat(item.saldo || 0);
      saldoAcumulado += saldo;
      return { data: item.data, entradas, saidas, saldo, saldo_acumulado: saldoAcumulado };
    });

    res.json({ fluxo: fluxoComAcumulado });
  } catch (error) {
    console.error('Erro ao buscar fluxo de caixa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para calcular Score Financeiro
async function calcularScoreFinanceiro(userId, ano, mes) {
  try {

    // Buscar dados financeiros
    const dados = await queryOne(`
      SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) as receitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) as despesas,
        COALESCE(SUM(CASE WHEN tipo = 'investimento' THEN valor ELSE 0 END), 0) as investimentos
      FROM (
        SELECT 'receita' as tipo, valor, data_recebimento as data FROM receitas WHERE user_id = ?
        UNION ALL
        SELECT 'despesa' as tipo, valor, data_vencimento as data FROM despesas WHERE user_id = ?
        UNION ALL
        SELECT 'investimento' as tipo, valor_inicial as valor, data_inicio as data FROM investimentos WHERE user_id = ?
      ) as transacoes
      WHERE YEAR(data) = ? AND MONTH(data) = ?
    `, [userId, userId, userId, ano, mes]);

    // Calcular índices
    const receitas = parseFloat(dados.receitas);
    const despesas = parseFloat(dados.despesas);
    const investimentos = parseFloat(dados.investimentos);

    // Índice de Endividamento
    const endividamento = receitas > 0 ? (despesas / receitas * 100) : 0;
    const scoreEndividamento = Math.max(0, 100 - endividamento);

    // Índice de Investimento
    const investimento = receitas > 0 ? (investimentos / receitas * 100) : 0;
    const scoreInvestimento = Math.min(100, investimento * 2); // Dobrar o percentual

    // Índice de Poupança
    const poupanca = receitas > 0 ? ((receitas - despesas) / receitas * 100) : 0;
    const scorePoupanca = Math.max(0, poupanca * 2);

    // Score Final (média ponderada)
    const scoreFinal = Math.round((scoreEndividamento * 0.4 + scoreInvestimento * 0.3 + scorePoupanca * 0.3));

    return {
      score: Math.min(100, Math.max(0, scoreFinal)),
      detalhes: {
        endividamento: { valor: parseFloat(endividamento.toFixed(2)), score: scoreEndividamento },
        investimento: { valor: parseFloat(investimento.toFixed(2)), score: scoreInvestimento },
        poupanca: { valor: parseFloat(poupanca.toFixed(2)), score: scorePoupanca }
      },
      nivel: scoreFinal >= 80 ? 'Excelente' : scoreFinal >= 60 ? 'Bom' : scoreFinal >= 40 ? 'Regular' : 'Precisa Melhorar'
    };
  } catch (error) {
    console.error('Erro ao calcular score:', error);
    return { score: 0, detalhes: {}, nivel: 'N/A' };
  }
}

module.exports = router; 