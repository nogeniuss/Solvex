const axios = require('axios');

class TaxService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 horas
  }

  async getCurrentTaxRates() {
    const cacheKey = 'tax_rates';
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Tentar buscar da API da Receita Federal (simulada)
      // Em produção, você usaria a API oficial
      const response = await axios.get('https://api.receita.federal.gov.br/tax-rates', {
        timeout: 5000
      });
      
      const taxRates = response.data;
      this.cache.set(cacheKey, { data: taxRates, timestamp: Date.now() });
      
      return taxRates;
    } catch (error) {
      console.log('Erro ao buscar taxas de impostos da API, usando valores padrão');
      
      // Valores padrão baseados na legislação atual
      const defaultRates = {
        inss: {
          employee: 0.11, // 11% para empregado
          employer: 0.20, // 20% para empregador
          limits: {
            min: 1320.00, // Salário mínimo
            max: 7507.49  // Teto do INSS
          }
        },
        ir: {
          brackets: [
            { min: 0, max: 2259.20, rate: 0, deduction: 0 },
            { min: 2259.21, max: 2826.65, rate: 0.075, deduction: 169.44 },
            { min: 2826.66, max: 3751.05, rate: 0.15, deduction: 381.44 },
            { min: 3751.06, max: 4664.68, rate: 0.225, deduction: 662.77 },
            { min: 4664.69, max: Infinity, rate: 0.275, deduction: 896.00 }
          ]
        },
        fgts: {
          rate: 0.08 // 8% para empregador
        }
      };
      
      this.cache.set(cacheKey, { data: defaultRates, timestamp: Date.now() });
      return defaultRates;
    }
  }

  async calculateSalaryTaxes(salary) {
    const taxRates = await this.getCurrentTaxRates();
    
    // Calcular INSS
    const inssBase = Math.min(Math.max(salary, taxRates.inss.limits.min), taxRates.inss.limits.max);
    const inssValor = inssBase * taxRates.inss.employee;
    
    // Calcular IR
    const irBase = salary - inssValor;
    const irBracket = taxRates.ir.brackets.find(bracket => 
      irBase >= bracket.min && irBase <= bracket.max
    );
    
    let irValor = 0;
    if (irBracket) {
      irValor = (irBase * irBracket.rate) - irBracket.deduction;
      irValor = Math.max(0, irValor); // IR não pode ser negativo
    }
    
    // Calcular FGTS (não desconta do salário, mas calculamos para informação)
    const fgtsValor = salary * taxRates.fgts.rate;
    
    // Valor líquido
    const valorLiquido = salary - inssValor - irValor;
    
    return {
      valor_bruto: salary,
      valor_liquido: valorLiquido,
      ir_valor: irValor,
      ir_percentual: salary > 0 ? (irValor / salary) * 100 : 0,
      inss_valor: inssValor,
      inss_percentual: taxRates.inss.employee * 100,
      fgts_valor: fgtsValor,
      fgts_percentual: taxRates.fgts.rate * 100,
      total_descontos: inssValor + irValor,
      percentual_descontos: salary > 0 ? ((inssValor + irValor) / salary) * 100 : 0
    };
  }

  async calculateInvestmentTaxes(investmentType, profit, holdingPeriod) {
    const taxRates = await this.getCurrentTaxRates();
    
    let taxRate = 0;
    
    switch (investmentType) {
      case 'renda_fixa':
        taxRate = 0.225; // 22.5% para renda fixa
        break;
      case 'acoes':
        if (holdingPeriod <= 365) {
          taxRate = 0.20; // 20% para ações vendidas em até 1 ano
        } else {
          taxRate = 0.15; // 15% para ações vendidas após 1 ano
        }
        break;
      case 'fundos_imobiliarios':
        taxRate = 0.20; // 20% para FIIs
        break;
      case 'criptomoedas':
        taxRate = 0.15; // 15% para criptomoedas
        break;
      default:
        taxRate = 0.225; // Taxa padrão
    }
    
    const taxValue = profit * taxRate;
    
    return {
      tipo_investimento: investmentType,
      lucro: profit,
      periodo_dias: holdingPeriod,
      aliquota: taxRate * 100,
      imposto_devido: taxValue,
      lucro_liquido: profit - taxValue
    };
  }

  async getTaxCalendar() {
    try {
      // Simular calendário de impostos
      const currentYear = new Date().getFullYear();
      
      return [
        {
          imposto: 'IRPF',
          vencimento: `${currentYear}-04-30`,
          descricao: 'Declaração Anual de Ajuste'
        },
        {
          imposto: 'INSS',
          vencimento: `${currentYear}-05-20`,
          descricao: 'Contribuição Patronal'
        },
        {
          imposto: 'FGTS',
          vencimento: `${currentYear}-05-07`,
          descricao: 'Depósito Mensal'
        }
      ];
    } catch (error) {
      console.error('Erro ao buscar calendário de impostos:', error);
      return [];
    }
  }

  async validateCPF(cpf) {
    // Remover caracteres não numéricos
    cpf = cpf.replace(/\D/g, '');
    
    // Verificar se tem 11 dígitos
    if (cpf.length !== 11) {
      return false;
    }
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) {
      return false;
    }
    
    // Calcular primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = sum % 11;
    let digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    // Calcular segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = sum % 11;
    let digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    // Verificar se os dígitos calculados são iguais aos do CPF
    return parseInt(cpf.charAt(9)) === digit1 && parseInt(cpf.charAt(10)) === digit2;
  }

  async validateCNPJ(cnpj) {
    // Remover caracteres não numéricos
    cnpj = cnpj.replace(/\D/g, '');
    
    // Verificar se tem 14 dígitos
    if (cnpj.length !== 14) {
      return false;
    }
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cnpj)) {
      return false;
    }
    
    // Calcular primeiro dígito verificador
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let remainder = sum % 11;
    let digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    // Calcular segundo dígito verificador
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    remainder = sum % 11;
    let digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    // Verificar se os dígitos calculados são iguais aos do CNPJ
    return parseInt(cnpj.charAt(12)) === digit1 && parseInt(cnpj.charAt(13)) === digit2;
  }
}

module.exports = TaxService; 