// Configuração de estilos do Sistema ERP Financeiro Pessoal - Versão Escura

export const COLORS = {
  // Cores principais - Gradiente azul escuro
  primary: '#1e3a8a',
  primaryHover: '#1e40af',
  primaryLight: '#1e40af',
  primaryDark: '#1e1b4b',
  
  // Cores secundárias
  secondary: '#475569',
  secondaryHover: '#64748b',
  
  // Cores de sucesso
  success: '#047857',
  successLight: '#065f46',
  successDark: '#064e3b',
  
  // Cores de erro
  error: '#b91c1c',
  errorLight: '#dc2626',
  errorDark: '#991b1b',
  
  // Cores de aviso
  warning: '#b45309',
  warningLight: '#d97706',
  warningDark: '#92400e',
  
  // Cores neutras - Paleta escura
  white: '#ffffff',
  gray50: '#0f172a',
  gray100: '#1e293b',
  gray200: '#334155',
  gray300: '#475569',
  gray400: '#64748b',
  gray500: '#94a3b8',
  gray600: '#cbd5e1',
  gray700: '#e2e8f0',
  gray800: '#f1f5f9',
  gray900: '#f8fafc',
  
  // Cores de fundo
  background: '#0f172a',
  backgroundDark: '#020617',
  cardBackground: '#1e293b',
  
  // Cores de texto
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textLight: '#94a3b8',
  textWhite: '#ffffff',
  
  // Cores de gradiente
  gradientPrimary: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)',
  gradientSecondary: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
  gradientSuccess: 'linear-gradient(135deg, #047857 0%, #064e3b 100%)',
  gradientWarning: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
  gradientPurple: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)',
  gradientPink: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
  
  // Cores de glassmorphism
  glassBackground: 'rgba(30, 41, 59, 0.8)',
  glassBorder: 'rgba(148, 163, 184, 0.2)',
  glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
};

export const FONTS = {
  // Famílias de fontes
  primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  secondary: 'Inter, system-ui, sans-serif',
  mono: 'JetBrains Mono, "Fira Code", "Roboto Mono", monospace',
  
  // Tamanhos de fonte
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
  '6xl': '3.75rem',
  
  // Pesos de fonte
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900
};

export const SPACING = {
  // Espaçamentos
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
  '4xl': '6rem',
  '5xl': '8rem'
};

export const BORDER_RADIUS = {
  // Raios de borda
  none: '0',
  sm: '0.125rem',
  base: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px'
};

export const SHADOWS = {
  // Sombras profissionais
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
  // Sombras coloridas
  primary: '0 4px 14px 0 rgba(30, 58, 138, 0.4)',
  success: '0 4px 14px 0 rgba(4, 120, 87, 0.4)',
  error: '0 4px 14px 0 rgba(185, 28, 28, 0.4)',
  warning: '0 4px 14px 0 rgba(180, 83, 9, 0.4)',
  // Sombras de glassmorphism
  glass: '0 8px 32px 0 rgba(0, 0, 0, 0.6)',
  glassHover: '0 12px 40px 0 rgba(0, 0, 0, 0.7)'
};

export const TRANSITIONS = {
  // Transições suaves
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: '200ms cubic-bezier(0.68, -0.55, 0.265, 1.55)'
};

export const BREAKPOINTS = {
  // Breakpoints responsivos
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// Estilos específicos para componentes profissionais
export const COMPONENT_STYLES = {
  // Container principal
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: `0 ${SPACING.md}`,
    width: '100%'
  },
  
  // Card de autenticação profissional
  authCard: {
    background: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS['2xl'],
    boxShadow: SHADOWS['2xl'],
    padding: SPACING['3xl'],
    width: '100%',
    maxWidth: '550px',
    minHeight: '650px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    border: `1px solid ${COLORS.gray200}`,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: COLORS.gradientPrimary
    }
  },
  
  // Container de autenticação com background animado
  authContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: COLORS.gradientPrimary,
    padding: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      background: 'radial-gradient(circle, rgba(30, 58, 138, 0.3) 0%, transparent 70%)',
      animation: 'float 20s ease-in-out infinite'
    }
  },
  
  // Título principal profissional
  title: {
    fontSize: FONTS['4xl'],
    fontWeight: FONTS.black,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    background: COLORS.gradientPrimary,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.025em'
  },
  
  // Subtítulo elegante
  subtitle: {
    fontSize: FONTS.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING['3xl'],
    fontWeight: FONTS.medium,
    lineHeight: '1.6'
  },
  
  // Grupo de formulário profissional
  formGroup: {
    marginBottom: SPACING.xl,
    position: 'relative'
  },
  
  // Label elegante
  label: {
    display: 'block',
    fontSize: FONTS.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    letterSpacing: '0.025em',
    textTransform: 'uppercase'
  },
  
  // Input profissional com animações
  input: {
    width: '100%',
    padding: `${SPACING.lg} ${SPACING.xl}`,
    fontSize: FONTS.base,
    border: `2px solid ${COLORS.gray300}`,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.gray100,
    transition: `${TRANSITIONS.base}`,
    outline: 'none',
    fontWeight: FONTS.medium,
    color: COLORS.textPrimary,
    '&:focus': {
      borderColor: COLORS.primary,
      boxShadow: SHADOWS.primary,
      outline: 'none',
      transform: 'translateY(-1px)'
    },
    '&:hover': {
      borderColor: COLORS.gray400,
      transform: 'translateY(-1px)'
    },
    '&:disabled': {
      backgroundColor: COLORS.gray200,
      cursor: 'not-allowed',
      transform: 'none'
    }
  },
  
  // Botão primário profissional
  buttonPrimary: {
    width: '100%',
    padding: `${SPACING.lg} ${SPACING.xl}`,
    fontSize: FONTS.base,
    fontWeight: FONTS.semibold,
    color: COLORS.white,
    background: COLORS.gradientPrimary,
    border: 'none',
    borderRadius: BORDER_RADIUS.xl,
    cursor: 'pointer',
    transition: `${TRANSITIONS.base}`,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
      transition: 'left 0.5s'
    },
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: SHADOWS.primary,
      '&::before': {
        left: '100%'
      }
    },
    '&:active': {
      transform: 'translateY(0)'
    },
    '&:disabled': {
      background: COLORS.gray400,
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: SHADOWS.none,
      '&::before': {
        display: 'none'
      }
    }
  },
  
  // Botão secundário elegante
  buttonSecondary: {
    width: '100%',
    padding: `${SPACING.lg} ${SPACING.xl}`,
    fontSize: FONTS.base,
    fontWeight: FONTS.semibold,
    color: COLORS.white,
    background: COLORS.gradientSecondary,
    border: 'none',
    borderRadius: BORDER_RADIUS.xl,
    cursor: 'pointer',
    transition: `${TRANSITIONS.base}`,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: SHADOWS.lg
    }
  },
  
  // Botão de texto elegante
  buttonText: {
    background: 'none',
    border: 'none',
    color: COLORS.primaryLight,
    fontSize: FONTS.base,
    fontWeight: FONTS.medium,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: `${TRANSITIONS.base}`,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    '&:hover': {
      color: COLORS.primary,
      backgroundColor: COLORS.gray200,
      transform: 'translateY(-1px)'
    }
  },
  
  // Mensagem de erro profissional
  errorMessage: {
    color: COLORS.errorLight,
    backgroundColor: COLORS.errorDark,
    border: `1px solid ${COLORS.error}`,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.xl,
    fontSize: FONTS.sm,
    fontWeight: FONTS.medium,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    '&::before': {
      content: '"⚠️"',
      fontSize: FONTS.lg
    }
  },
  
  // Mensagem de sucesso elegante
  successMessage: {
    color: COLORS.successLight,
    backgroundColor: COLORS.successDark,
    border: `1px solid ${COLORS.success}`,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.xl,
    fontSize: FONTS.sm,
    fontWeight: FONTS.medium,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    '&::before': {
      content: '"✅"',
      fontSize: FONTS.lg
    }
  },
  
  // Divider elegante
  divider: {
    margin: `${SPACING['2xl']} 0`,
    border: 'none',
    height: '1px',
    background: `linear-gradient(90deg, transparent, ${COLORS.gray300}, transparent)`
  },
  
  // Indicador de força da senha profissional
  passwordStrength: {
    marginTop: SPACING.md,
    fontSize: FONTS.xs,
    fontWeight: FONTS.medium,
    color: COLORS.textSecondary
  },
  
  // Barra de força da senha animada
  passwordBar: {
    height: '6px',
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.sm,
    transition: `${TRANSITIONS.base}`,
    background: `linear-gradient(90deg, ${COLORS.gray300} 0%, ${COLORS.gray300} 100%)`,
    overflow: 'hidden',
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '0%',
      transition: `${TRANSITIONS.base}`,
      borderRadius: BORDER_RADIUS.full
    }
  },
  
  // Navbar profissional
  navbar: {
    background: COLORS.glassBackground,
    padding: `${SPACING.xl} 0`,
    boxShadow: SHADOWS.sm,
    borderBottom: `1px solid ${COLORS.gray300}`,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(10px)'
  },
  
  // Dashboard profissional
  dashboard: {
    minHeight: '100vh',
    background: COLORS.background,
    paddingTop: SPACING.xl
  },
  
  // Card do dashboard elegante
  dashboardCard: {
    background: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS['2xl'],
    boxShadow: SHADOWS.lg,
    padding: SPACING['3xl'],
    marginBottom: SPACING.xl,
    border: `1px solid ${COLORS.gray300}`,
    transition: `${TRANSITIONS.base}`,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: SHADOWS.xl
    }
  },
  
  // Feature card com gradiente
  featureCard: {
    padding: SPACING['2xl'],
    borderRadius: BORDER_RADIUS.xl,
    color: COLORS.white,
    textAlign: 'center',
    transition: `${TRANSITIONS.base}`,
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'inherit',
      transition: `${TRANSITIONS.base}`
    },
    '&:hover': {
      transform: 'translateY(-4px) scale(1.02)',
      '&::before': {
        transform: 'scale(1.1)'
      }
    }
  }
};

// Animações CSS
export const ANIMATIONS = {
  float: `
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      33% { transform: translateY(-20px) rotate(1deg); }
      66% { transform: translateY(10px) rotate(-1deg); }
    }
  `,
  
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
  
  slideIn: `
    @keyframes slideIn {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
  `,
  
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
  
  shimmer: `
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `
};

// Função para aplicar estilos inline
export const applyStyles = (styles) => {
  return Object.entries(styles).reduce((acc, [key, value]) => {
    if (typeof value === 'object' && value !== null) {
      acc[key] = applyStyles(value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
};

// Função para criar classes CSS
export const createCSSClass = (className, styles) => {
  const cssRules = Object.entries(styles).map(([property, value]) => {
    const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
    return `${cssProperty}: ${value};`;
  }).join(' ');
  
  return `.${className} { ${cssRules} }`;
}; 