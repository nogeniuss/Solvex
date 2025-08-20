const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { authenticateToken } = require('./auth');

// GET - DRE principal
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ano, mes } = req.query;
    
    const dre = await calcularDRE(userId, parseInt(ano), mes ? parseInt(mes) : undefined);
    
    res.json({ dre });
  } catch (error) {
    console.error('Erro ao calcular DRE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - DRE comparativo
router.get('/comparativo', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ano, mes, periodo_comparativo } = req.query;
    
    const comparativo = await calcularComparativo(userId, parseInt(ano), parseInt(mes), periodo_comparativo);
    
    res.json({ comparativo });
  } catch (error) {
    console.error('Erro ao calcular comparativo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Evolução mensal
router.get('/evolucao', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ano } = req.query;
    
    const evolucao = await calcularEvolucaoMensal(userId, parseInt(ano));
    
    res.json({ evolucao });
  } catch (error) {
    console.error('Erro ao calcular evolução:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Helpers de datas
function toDateOnly(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDaysInclusive(start, end) {
  const ms = toDateOnly(end) - toDateOnly(start);
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
}

// Função para calcular o DRE
async function calcularDRE(userId, ano, mes) {
  // Parâmetros para filtro de data
  const dataInicio = mes ? new Date(ano, (mes - 1), 1) : new Date(ano, 0, 1);
  const dataFim = mes ? new Date(ano, (mes - 1) + 1, 0) : new Date(ano, 11, 31);
  const dataInicioStr = dataInicio.toISOString().slice(0, 10);
  const dataFimStr = dataFim.toISOString().slice(0, 10);

  // 1. Receitas Brutas
  const receitasBrutas = await query(`
    SELECT COALESCE(SUM(valor), 0) as total
    FROM receitas 
    WHERE user_id = ? 
    AND DATE(data_recebimento) BETWEEN ? AND ?
  `, [userId, dataInicioStr, dataFimStr]);

  const receitasBrutasTotal = parseFloat(receitasBrutas[0]?.total || 0);

  // 2. Deduções (impostos)
  const deducoes = await query(`
    SELECT COALESCE(SUM(
      COALESCE(ir_valor, 0) + 
      COALESCE(inss_valor, 0) + 
      COALESCE(fgts_valor, 0)
    ), 0) as total
    FROM receitas 
    WHERE user_id = ? 
    AND DATE(data_recebimento) BETWEEN ? AND ?
  `, [userId, dataInicioStr, dataFimStr]);

  const deducoesTotal = parseFloat(deducoes[0]?.total || 0);

  // 3. Receitas Líquidas
  const receitasLiquidas = receitasBrutasTotal - deducoesTotal;

  // 4. Despesas Operacionais
  const despesasOperacionais = await query(`
    SELECT COALESCE(SUM(valor), 0) as total
    FROM despesas 
    WHERE user_id = ? 
    AND DATE(data_vencimento) BETWEEN ? AND ?
  `, [userId, dataInicioStr, dataFimStr]);

  const despesasOperacionaisTotal = parseFloat(despesasOperacionais[0]?.total || 0);

  // 5. Resultado Operacional
  const resultadoOperacional = receitasLiquidas - despesasOperacionaisTotal;

  // 6. Receitas Financeiras (investimentos) - cálculo aproximado por período
  const investimentos = await query(`
    SELECT valor_inicial, rentabilidade, data_inicio, status
    FROM investimentos 
    WHERE user_id = ? AND DATE(data_inicio) <= ?
  `, [userId, dataFimStr]);

  let receitasFinanceirasTotal = 0;
  const hoje = new Date();
  for (const inv of investimentos) {
    const principal = parseFloat(inv.valor_inicial || 0);
    const anual = parseFloat(inv.rentabilidade || 0) / 100;
    const daily = anual / 365;
    if (principal <= 0 || isNaN(daily)) continue;

    const start = new Date(inv.data_inicio);
    // Interseção do investimento com o período
    const periodStart = toDateOnly(dataInicio < start ? start : dataInicio);
    const periodEnd = toDateOnly(dataFim < hoje ? dataFim : hoje);
    if (periodEnd < periodStart) continue; // fora do período

    const daysFromStartToPeriodStart = Math.max(0, Math.floor((periodStart - toDateOnly(start)) / (1000 * 60 * 60 * 24)));
    const daysFromStartToPeriodEnd = Math.max(0, Math.floor((periodEnd - toDateOnly(start)) / (1000 * 60 * 60 * 24)) + 1);

    const valorNoInicioPeriodo = principal * Math.pow(1 + daily, daysFromStartToPeriodStart);
    const valorNoFimPeriodo = principal * Math.pow(1 + daily, daysFromStartToPeriodEnd);
    const lucroPeriodo = valorNoFimPeriodo - valorNoInicioPeriodo;
    receitasFinanceirasTotal += lucroPeriodo;
  }

  // 7. Despesas Financeiras (juros, multas)
  const despesasFinanceiras = await query(`
    SELECT COALESCE(SUM(COALESCE(juros, 0) + COALESCE(multa, 0)), 0) as total
    FROM despesas 
    WHERE user_id = ? 
    AND DATE(data_vencimento) BETWEEN ? AND ?
  `, [userId, dataInicioStr, dataFimStr]);

  const despesasFinanceirasTotal = parseFloat(despesasFinanceiras[0]?.total || 0);

  // 8. Resultado Líquido
  const resultadoLiquido = resultadoOperacional + receitasFinanceirasTotal - despesasFinanceirasTotal;

  // 9. Despesas Totais
  const despesasTotais = despesasOperacionaisTotal + despesasFinanceirasTotal;

  // 10. Margem de Lucro
  const margemLucro = receitasLiquidas > 0 ? (resultadoLiquido / receitasLiquidas) * 100 : 0;

  // Cálculo de percentuais
  const receitasBrutasPercentual = 100;
  const deducoesPercentual = receitasBrutasTotal > 0 ? (deducoesTotal / receitasBrutasTotal) * 100 : 0;
  const receitasLiquidasPercentual = receitasBrutasTotal > 0 ? (receitasLiquidas / receitasBrutasTotal) * 100 : 0;
  const despesasOperacionaisPercentual = receitasLiquidas > 0 ? (despesasOperacionaisTotal / receitasLiquidas) * 100 : 0;
  const resultadoOperacionalPercentual = receitasLiquidas > 0 ? (resultadoOperacional / receitasLiquidas) * 100 : 0;
  const receitasFinanceirasPercentual = receitasLiquidas > 0 ? (receitasFinanceirasTotal / receitasLiquidas) * 100 : 0;
  const despesasFinanceirasPercentual = receitasLiquidas > 0 ? (despesasFinanceirasTotal / receitasLiquidas) * 100 : 0;
  const resultadoLiquidoPercentual = receitasLiquidas > 0 ? (resultadoLiquido / receitasLiquidas) * 100 : 0;

  return {
    receitas_brutas: receitasBrutasTotal,
    receitas_brutas_percentual: receitasBrutasPercentual,
    deducoes: deducoesTotal,
    deducoes_percentual: deducoesPercentual,
    receitas_liquidas: receitasLiquidas,
    receitas_liquidas_percentual: receitasLiquidasPercentual,
    despesas_operacionais: despesasOperacionaisTotal,
    despesas_operacionais_percentual: despesasOperacionaisPercentual,
    resultado_operacional: resultadoOperacional,
    resultado_operacional_percentual: resultadoOperacionalPercentual,
    receitas_financeiras: receitasFinanceirasTotal,
    receitas_financeiras_percentual: receitasFinanceirasPercentual,
    despesas_financeiras: despesasFinanceirasTotal,
    despesas_financeiras_percentual: despesasFinanceirasPercentual,
    resultado_liquido: resultadoLiquido,
    resultado_liquido_percentual: resultadoLiquidoPercentual,
    despesas_totais: despesasTotais,
    margem_lucro: margemLucro
  };
}

// Função para calcular comparativo
async function calcularComparativo(userId, ano, mes, periodoComparativo) {
  let anoAnterior, mesAnterior;

  switch (periodoComparativo) {
    case 'mes_anterior':
      if (mes === 1) {
        anoAnterior = ano - 1;
        mesAnterior = 12;
      } else {
        anoAnterior = ano;
        mesAnterior = mes - 1;
      }
      break;
    case 'mes_ano_anterior':
      anoAnterior = ano - 1;
      mesAnterior = mes;
      break;
    case 'trimestre_anterior':
      const trimestre = Math.ceil(mes / 3);
      if (trimestre === 1) {
        anoAnterior = ano - 1;
        mesAnterior = 10; // Outubro do ano anterior
      } else {
        anoAnterior = ano;
        mesAnterior = mes - 3;
      }
      break;
    default:
      anoAnterior = ano;
      mesAnterior = mes - 1;
  }

  const dreAtual = await calcularDRE(userId, ano, mes);
  const dreAnterior = await calcularDRE(userId, anoAnterior, mesAnterior);

  // Calcular evolução mensal
  const evolucaoMensal = await calcularEvolucaoMensal(userId, ano);

  return {
    receitas_liquidas_anterior: dreAnterior.receitas_liquidas,
    despesas_totais_anterior: dreAnterior.despesas_totais,
    resultado_liquido_anterior: dreAnterior.resultado_liquido,
    margem_lucro_anterior: dreAnterior.margem_lucro,
    evolucao_mensal: evolucaoMensal
  };
}

// Função para calcular evolução mensal
async function calcularEvolucaoMensal(userId, ano) {
  const evolucao = [];

  for (let mes = 1; mes <= 12; mes++) {
    const dre = await calcularDRE(userId, ano, mes);
    
    evolucao.push({
      mes: new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'short' }),
      receitas: dre.receitas_liquidas,
      despesas: dre.despesas_totais,
      resultado: dre.resultado_liquido,
      margem: dre.margem_lucro
    });
  }

  return evolucao;
}

module.exports = router; 