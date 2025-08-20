// Paleta Harmônica - Tema Claro e Escuro
export const PROFESSIONAL_COLORS = {
  // Cores primárias harmônicas
  primary: '#1976D2',
  secondary: '#616161',
  
  // Paleta para gráficos - Cores harmônicas e balanceadas
  chart: [
    '#1976D2', // Azul primário (destaque/botão primário)
    '#2E7D32', // Verde escuro (entradas/ganhos) 
    '#C62828', // Vermelho forte (saídas/perdas)
    '#FF8F00', // Amarelo/laranja (alertas/neutro)
    '#7B1FA2', // Roxo (categoria adicional)
    '#00796B', // Teal (investimentos)
    '#F57C00', // Laranja (planejamento)
    '#5D4037', // Marrom (poupança)
    '#455A64', // Azul acinzentado (outros)
    '#6A1B9A', // Roxo escuro (premium)
  ],
  
  // Cores para status - seguindo a especificação
  success: '#2E7D32',      // Verde escuro para entradas/ganhos
  warning: '#FF8F00',      // Amarelo/laranja para alertas
  danger: '#C62828',       // Vermelho forte para saídas/perdas
  info: '#1976D2',         // Azul para informações
  
  // Gradientes harmoniosos
  gradients: {
    primary: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
    success: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
    warning: 'linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)',
    danger: 'linear-gradient(135deg, #F44336 0%, #C62828 100%)',
    info: 'linear-gradient(135deg, #03A9F4 0%, #1976D2 100%)',
  },
  
  // Cores categorizadas por tipo financeiro
  financial: {
    receitas: '#2E7D32',     // Verde escuro (ganhos)
    despesas: '#C62828',     // Vermelho forte (perdas)
    investimentos: '#1976D2', // Azul primário (investimentos)
    economia: '#7B1FA2',     // Roxo (economia/poupança)
    planejamento: '#00796B', // Teal (planejamento)
    metas: '#FF8F00',       // Amarelo/laranja (metas)
  },
  
  // Opacidades para variações
  alpha: {
    10: '1a',
    20: '33', 
    30: '4d',
    40: '66',
    50: '80',
    60: '99',
    70: 'b3',
    80: 'cc',
    90: 'e6',
  }
};

// Função para obter cores com opacidade
export const withOpacity = (color, opacity) => {
  const cleanColor = color.replace('#', '');
  const alpha = PROFESSIONAL_COLORS.alpha[opacity] || 'ff';
  return `#${cleanColor}${alpha}`;
};

// Função para obter cor por índice (para gráficos)
export const getChartColor = (index) => {
  return PROFESSIONAL_COLORS.chart[index % PROFESSIONAL_COLORS.chart.length];
};

// Função para obter gradiente por tipo
export const getGradient = (type) => {
  return PROFESSIONAL_COLORS.gradients[type] || PROFESSIONAL_COLORS.gradients.primary;
};

// Exportação padrão das cores para gráficos
export default PROFESSIONAL_COLORS.chart; 