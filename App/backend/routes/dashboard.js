const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { authenticateToken } = require('./auth');

// GET - Estatísticas do Dashboard
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mes, ano } = req.query;
    const currentDate = new Date();
    const selectedMonth = mes ? parseInt(mes) : currentDate.getMonth() + 1;
    const selectedYear = ano ? parseInt(ano) : currentDate.getFullYear();

                    // 1. Total de Receitas do mês selecionado
                const receitasResult = await queryOne(`
                  SELECT COALESCE(SUM(valor), 0) as total_receitas
                  FROM receitas 
                  WHERE user_id = ? 
                    AND MONTH(data_recebimento) = ? 
                    AND YEAR(data_recebimento) = ?
                `, [userId, selectedMonth, selectedYear]);

                    // 2. Total de Despesas do mês selecionado
                const despesasResult = await queryOne(`
                  SELECT COALESCE(SUM(valor), 0) as total_despesas
                  FROM despesas 
                  WHERE user_id = ? 
                    AND MONTH(data_vencimento) = ? 
                    AND YEAR(data_vencimento) = ?
                `, [userId, selectedMonth, selectedYear]);

                    // 3. Total de Investimentos do mês selecionado
                const investimentosResult = await queryOne(`
                  SELECT COALESCE(SUM(valor_inicial), 0) as total_investimentos
                  FROM investimentos 
                  WHERE user_id = ? 
                    AND MONTH(data_inicio) = ? 
                    AND YEAR(data_inicio) = ?
                    AND status = 'ativo'
                `, [userId, selectedMonth, selectedYear]);

                    // 4. Receita média dos últimos 3 meses (para cálculo de crescimento)
                const receitaMediaResult = await queryOne(`
                  SELECT COALESCE(AVG(total_mensal), 0) as receita_media_anterior
                  FROM (
                    SELECT 
                      YEAR(data_recebimento) as ano,
                      MONTH(data_recebimento) as mes,
                      SUM(valor) as total_mensal
                    FROM receitas 
                    WHERE user_id = ? 
                      AND (
                        (YEAR(data_recebimento) = ? AND MONTH(data_recebimento) < ?) OR
                        (YEAR(data_recebimento) = ? - 1 AND MONTH(data_recebimento) >= ?)
                      )
                    GROUP BY YEAR(data_recebimento), MONTH(data_recebimento)
                    ORDER BY ano DESC, mes DESC
                    LIMIT 3
                  ) as receitas_anteriores
                `, [userId, selectedYear, selectedMonth, selectedYear, selectedMonth]);

                    // 5. Despesas médias dos últimos 3 meses (para cálculo de endividamento)
                const despesaMediaResult = await queryOne(`
                  SELECT COALESCE(AVG(total_mensal), 0) as despesa_media_anterior
                  FROM (
                    SELECT 
                      YEAR(data_vencimento) as ano,
                      MONTH(data_vencimento) as mes,
                      SUM(valor) as total_mensal
                    FROM despesas 
                    WHERE user_id = ? 
                      AND (
                        (YEAR(data_vencimento) = ? AND MONTH(data_vencimento) < ?) OR
                        (YEAR(data_vencimento) = ? - 1 AND MONTH(data_vencimento) >= ?)
                      )
                    GROUP BY YEAR(data_vencimento), MONTH(data_vencimento)
                    ORDER BY ano DESC, mes DESC
                    LIMIT 3
                  ) as despesas_anteriores
                `, [userId, selectedYear, selectedMonth, selectedYear, selectedMonth]);

    // Buscar transações pendentes
    const pendentesResult = await queryOne(`
      SELECT 
        (SELECT COUNT(*) FROM receitas WHERE user_id = ? AND status = 'pendente') as receitas_pendentes,
        (SELECT COUNT(*) FROM despesas WHERE user_id = ? AND status = 'pendente') as despesas_pendentes
    `, [userId, userId]);

    // Extrair valores
    const totalReceitas = parseFloat(receitasResult.total_receitas) || 0;
    const totalDespesas = parseFloat(despesasResult.total_despesas) || 0;
    const totalInvestimentos = parseFloat(investimentosResult.total_investimentos) || 0;
    const receitaMediaAnterior = parseFloat(receitaMediaResult.receita_media_anterior) || 0;
    const despesaMediaAnterior = parseFloat(despesaMediaResult.despesa_media_anterior) || 0;
    const receitasPendentes = parseInt(pendentesResult.receitas_pendentes) || 0;
    const despesasPendentes = parseInt(pendentesResult.despesas_pendentes) || 0;

    // Cálculos de saúde financeira
    let indiceEndividamento = 0;
    let indiceInvestimento = 0;
    let indiceCrescimento = 0;

    if (totalReceitas > 0) {
      // Índice de endividamento = (Total de Dívidas Mensais / Renda Mensal) × 100
      indiceEndividamento = (totalDespesas / totalReceitas) * 100;

      // Índice de investimento = (Total de Investimentos / Renda Mensal) × 100
      indiceInvestimento = (totalInvestimentos / totalReceitas) * 100;
    }

    if (receitaMediaAnterior > 0) {
      // Índice de crescimento = (Renda atual - Renda média anterior) / Renda média anterior × 100
      indiceCrescimento = ((totalReceitas - receitaMediaAnterior) / receitaMediaAnterior) * 100;
    }

    // Score de saúde financeira (soma dos índices)
    // Quanto menor o endividamento e maior o investimento e crescimento, melhor
    const scoreSaudeFinanceira = Math.max(0, 100 - indiceEndividamento + indiceInvestimento + Math.max(0, indiceCrescimento));

    // Classificação da saúde financeira
    let classificacaoSaude = 'Excelente';
    let corSaude = '#48bb78';
    
    if (scoreSaudeFinanceira < 30) {
      classificacaoSaude = 'Crítica';
      corSaude = '#f56565';
    } else if (scoreSaudeFinanceira < 50) {
      classificacaoSaude = 'Ruim';
      corSaude = '#ed8936';
    } else if (scoreSaudeFinanceira < 70) {
      classificacaoSaude = 'Regular';
      corSaude = '#d69e2e';
    } else if (scoreSaudeFinanceira < 85) {
      classificacaoSaude = 'Boa';
      corSaude = '#38b2ac';
    }

    res.json({
      stats: {
        totalReceitas,
        totalDespesas,
        totalInvestimentos,
        saldo: totalReceitas - totalDespesas,
        indiceEndividamento: Math.round(indiceEndividamento * 100) / 100,
        indiceInvestimento: Math.round(indiceInvestimento * 100) / 100,
        indiceCrescimento: Math.round(indiceCrescimento * 100) / 100,
        scoreSaudeFinanceira: Math.round(scoreSaudeFinanceira * 100) / 100,
        classificacaoSaude,
        corSaude,
        receitasPendentes,
        despesasPendentes,
        periodo: {
          mes: selectedMonth,
          ano: selectedYear
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Transações do Extrato
router.get('/transacoes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mes, ano } = req.query;
    const currentDate = new Date();
    const selectedMonth = mes ? parseInt(mes) : currentDate.getMonth() + 1;
    const selectedYear = ano ? parseInt(ano) : currentDate.getFullYear();

                    // Buscar receitas do mês selecionado
                const receitas = await query(`
                  SELECT 
                    'receita' as tipo,
                    r.titulo,
                    r.valor,
                    r.data_recebimento as data,
                    c.nome as categoria_nome,
                    c.cor as categoria_cor
                  FROM receitas r
                  LEFT JOIN categorias c ON r.categoria_id = c.id
                  WHERE r.user_id = ? 
                    AND MONTH(r.data_recebimento) = ? 
                    AND YEAR(r.data_recebimento) = ?

                  ORDER BY r.data_recebimento DESC
                  LIMIT 10
                `, [userId, selectedMonth, selectedYear]);

                    // Buscar despesas do mês selecionado
                const despesas = await query(`
                  SELECT 
                    'despesa' as tipo,
                    d.titulo,
                    d.valor,
                    d.data_vencimento as data,
                    c.nome as categoria_nome,
                    c.cor as categoria_cor
                  FROM despesas d
                  LEFT JOIN categorias c ON d.categoria_id = c.id
                  WHERE d.user_id = ? 
                    AND MONTH(d.data_vencimento) = ? 
                    AND YEAR(d.data_vencimento) = ?

                  ORDER BY d.data_vencimento DESC
                  LIMIT 10
                `, [userId, selectedMonth, selectedYear]);

    // Combinar e ordenar por data
    const todasTransacoes = [...receitas, ...despesas].sort((a, b) => 
      new Date(b.data) - new Date(a.data)
    ).slice(0, 10);

    res.json({
      transacoes: todasTransacoes
    });

  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 