const { query } = require('../database');
const logger = require('../config/logger');

class FinancialPlanningService {
  // Simulador de aposentadoria
  async calculateRetirement(userId, params) {
    try {
      const {
        idadeAtual,
        idadeAposentadoria,
        salarioAtual,
        percentualPoupanca,
        rentabilidadeAnual,
        inflacaoAnual
      } = params;

      const anosContribuicao = idadeAposentadoria - idadeAtual;
      const salarioReal = salarioAtual * Math.pow(1 + inflacaoAnual / 100, anosContribuicao);
      const poupancaMensal = salarioReal * (percentualPoupanca / 100);
      
      let patrimonio = 0;
      const projecao = [];

      for (let ano = 1; ano <= anosContribuicao; ano++) {
        patrimonio = patrimonio * (1 + rentabilidadeAnual / 100) + (poupancaMensal * 12);
        const rendaMensal = patrimonio * (rentabilidadeAnual / 100) / 12;
        
        projecao.push({
          ano,
          idade: idadeAtual + ano,
          patrimonio: Math.round(patrimonio * 100) / 100,
          rendaMensal: Math.round(rendaMensal * 100) / 100,
          poupancaAnual: Math.round(poupancaMensal * 12 * 100) / 100
        });
      }

      return {
        patrimonioFinal: Math.round(patrimonio * 100) / 100,
        rendaMensalAposentadoria: Math.round(patrimonio * (rentabilidadeAnual / 100) / 12 * 100) / 100,
        projecao
      };
    } catch (error) {
      logger.error('Error calculating retirement:', error);
      throw error;
    }
  }

  // Simulador de financiamento
  async calculateLoan(params) {
    try {
      const {
        valorFinanciamento,
        prazoMeses,
        taxaJurosAnual,
        entrada
      } = params;

      const taxaJurosMensal = taxaJurosAnual / 12 / 100;
      const valorFinanciado = valorFinanciamento - entrada;
      
      // Cálculo da prestação (Sistema Price)
      const prestacao = valorFinanciado * 
        (taxaJurosMensal * Math.pow(1 + taxaJurosMensal, prazoMeses)) / 
        (Math.pow(1 + taxaJurosMensal, prazoMeses) - 1);

      const totalPago = prestacao * prazoMeses;
      const totalJuros = totalPago - valorFinanciado;

      const amortizacao = [];
      let saldoDevedor = valorFinanciado;

      for (let mes = 1; mes <= prazoMeses; mes++) {
        const jurosMes = saldoDevedor * taxaJurosMensal;
        const amortizacaoMes = prestacao - jurosMes;
        saldoDevedor -= amortizacaoMes;

        amortizacao.push({
          mes,
          prestacao: Math.round(prestacao * 100) / 100,
          juros: Math.round(jurosMes * 100) / 100,
          amortizacao: Math.round(amortizacaoMes * 100) / 100,
          saldoDevedor: Math.round(saldoDevedor * 100) / 100
        });
      }

      return {
        prestacao: Math.round(prestacao * 100) / 100,
        totalPago: Math.round(totalPago * 100) / 100,
        totalJuros: Math.round(totalJuros * 100) / 100,
        amortizacao
      };
    } catch (error) {
      logger.error('Error calculating loan:', error);
      throw error;
    }
  }

  // Simulador de investimentos
  async calculateInvestment(params) {
    try {
      const {
        valorInicial,
        aporteMensal,
        prazoMeses,
        rentabilidadeAnual,
        tipoInvestimento
      } = params;

      const rentabilidadeMensal = rentabilidadeAnual / 12 / 100;
      let patrimonio = valorInicial;
      const projecao = [];

      for (let mes = 1; mes <= prazoMeses; mes++) {
        patrimonio = patrimonio * (1 + rentabilidadeMensal) + aporteMensal;
        
        projecao.push({
          mes,
          patrimonio: Math.round(patrimonio * 100) / 100,
          aporteTotal: Math.round(aporteMensal * mes * 100) / 100,
          rendimento: Math.round((patrimonio - valorInicial - (aporteMensal * mes)) * 100) / 100
        });
      }

      const totalAportado = valorInicial + (aporteMensal * prazoMeses);
      const rendimentoTotal = patrimonio - totalAportado;

      return {
        patrimonioFinal: Math.round(patrimonio * 100) / 100,
        totalAportado: Math.round(totalAportado * 100) / 100,
        rendimentoTotal: Math.round(rendimentoTotal * 100) / 100,
        rentabilidadeTotal: Math.round((rendimentoTotal / totalAportado) * 100 * 100) / 100,
        projecao
      };
    } catch (error) {
      logger.error('Error calculating investment:', error);
      throw error;
    }
  }

  // Análise de fluxo de caixa futuro
  async analyzeCashFlow(userId, meses = 12) {
    try {
      // Buscar receitas e despesas recorrentes
      const receitasRecorrentes = await query(`
        SELECT titulo, valor, recorrencia, data_recebimento
        FROM receitas 
        WHERE user_id = ? AND recorrencia != 'nenhuma' AND status = 'recebido'
      `, [userId]);

      const despesasRecorrentes = await query(`
        SELECT titulo, valor, recorrencia, data_vencimento
        FROM despesas 
        WHERE user_id = ? AND recorrencia != 'nenhuma' AND status = 'pago'
      `, [userId]);

      const fluxoCaixa = [];
      const hoje = new Date();

      for (let mes = 0; mes < meses; mes++) {
        const dataMes = new Date(hoje.getFullYear(), hoje.getMonth() + mes, 1);
        let receitasMes = 0;
        let despesasMes = 0;

        // Calcular receitas do mês
        receitasRecorrentes.forEach(receita => {
          if (this.isRecorrenciaNoMes(receita.recorrencia, dataMes)) {
            receitasMes += parseFloat(receita.valor);
          }
        });

        // Calcular despesas do mês
        despesasRecorrentes.forEach(despesa => {
          if (this.isRecorrenciaNoMes(despesa.recorrencia, dataMes)) {
            despesasMes += parseFloat(despesa.valor);
          }
        });

        fluxoCaixa.push({
          mes: dataMes.toISOString().slice(0, 7),
          receitas: Math.round(receitasMes * 100) / 100,
          despesas: Math.round(despesasMes * 100) / 100,
          saldo: Math.round((receitasMes - despesasMes) * 100) / 100
        });
      }

      return fluxoCaixa;
    } catch (error) {
      logger.error('Error analyzing cash flow:', error);
      throw error;
    }
  }

  // Verificar se recorrência acontece no mês
  isRecorrenciaNoMes(recorrencia, dataMes) {
    const mes = dataMes.getMonth() + 1;
    
    switch (recorrencia) {
      case 'mensal':
        return true;
      case 'trimestral':
        return mes % 3 === 1;
      case 'semestral':
        return mes % 6 === 1;
      case 'anual':
        return mes === 1;
      default:
        return false;
    }
  }

  // Análise de saúde financeira
  async analyzeFinancialHealth(userId) {
    try {
      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;
      const anoAtual = hoje.getFullYear();

      // Buscar dados do mês atual
      const [receitasResult, despesasResult, investimentosResult] = await Promise.all([
        query(`
          SELECT COALESCE(SUM(valor), 0) as total
          FROM receitas 
          WHERE user_id = ? AND MONTH(data_recebimento) = ? AND YEAR(data_recebimento) = ?
        `, [userId, mesAtual, anoAtual]),
        query(`
          SELECT COALESCE(SUM(valor), 0) as total
          FROM despesas 
          WHERE user_id = ? AND MONTH(data_vencimento) = ? AND YEAR(data_vencimento) = ?
        `, [userId, mesAtual, anoAtual]),
        query(`
          SELECT COALESCE(SUM(valor_inicial), 0) as total
          FROM investimentos 
          WHERE user_id = ? AND status = 'ativo'
        `, [userId])
      ]);

      const receitas = parseFloat(receitasResult[0].total);
      const despesas = parseFloat(despesasResult[0].total);
      const investimentos = parseFloat(investimentosResult[0].total);

      // Calcular indicadores
      const saldo = receitas - despesas;
      const indiceEndividamento = receitas > 0 ? (despesas / receitas) * 100 : 0;
      const indiceInvestimento = receitas > 0 ? (investimentos / receitas) * 100 : 0;
      const indicePoupanca = receitas > 0 ? (saldo / receitas) * 100 : 0;

      // Classificação da saúde financeira
      let classificacao = 'Excelente';
      let score = 100;

      if (indiceEndividamento > 70) {
        classificacao = 'Crítica';
        score = 20;
      } else if (indiceEndividamento > 50) {
        classificacao = 'Ruim';
        score = 40;
      } else if (indiceEndividamento > 30) {
        classificacao = 'Regular';
        score = 60;
      } else if (indiceEndividamento > 20) {
        classificacao = 'Boa';
        score = 80;
      }

      // Ajustar score baseado em outros fatores
      if (indicePoupanca > 20) score += 10;
      if (indiceInvestimento > 10) score += 10;
      if (saldo > 0) score += 10;

      score = Math.min(100, Math.max(0, score));

      return {
        receitas,
        despesas,
        saldo,
        investimentos,
        indiceEndividamento: Math.round(indiceEndividamento * 100) / 100,
        indiceInvestimento: Math.round(indiceInvestimento * 100) / 100,
        indicePoupanca: Math.round(indicePoupanca * 100) / 100,
        classificacao,
        score: Math.round(score)
      };
    } catch (error) {
      logger.error('Error analyzing financial health:', error);
      throw error;
    }
  }
}

module.exports = new FinancialPlanningService(); 