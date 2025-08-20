import * as yup from 'yup';

// Validação para despesas
export const despesaSchema = yup.object({
  titulo: yup
    .string()
    .min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres')
    .required('Título é obrigatório'),
  descricao: yup
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
  valor: yup
    .number()
    .positive('Valor deve ser maior que zero')
    .required('Valor é obrigatório'),
  categoria_id: yup
    .number()
    .positive('Categoria é obrigatória')
    .required('Categoria é obrigatória'),
  data_vencimento: yup
    .date()
    .required('Data de vencimento é obrigatória'),
  recorrencia: yup
    .string()
    .oneOf(['nenhuma', 'mensal', 'trimestral', 'semestral', 'anual'], 'Tipo de recorrência inválido')
    .default('nenhuma'),
  data_fim_recorrencia: yup
    .date()
    .nullable(),
  juros: yup
    .number()
    .min(0, 'Juros deve ser maior ou igual a 0')
    .max(100, 'Juros deve ser menor ou igual a 100')
    .default(0),
  multa: yup
    .number()
    .min(0, 'Multa deve ser maior ou igual a 0')
    .max(100, 'Multa deve ser menor ou igual a 100')
    .default(0)
});

// Validação para receitas
export const receitaSchema = yup.object({
  titulo: yup
    .string()
    .min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres')
    .required('Título é obrigatório'),
  descricao: yup
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
  valor: yup
    .number()
    .positive('Valor deve ser maior que zero')
    .required('Valor é obrigatório'),
  data_recebimento: yup
    .date()
    .required('Data de recebimento é obrigatória'),
  categoria_id: yup
    .number()
    .positive('Categoria é obrigatória')
    .required('Categoria é obrigatória'),
  recorrencia: yup
    .string()
    .oneOf(['nenhuma', 'diaria', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual'], 'Tipo de recorrência inválido')
    .default('nenhuma'),
  data_fim_recorrencia: yup
    .date()
    .nullable(),
  fonte_receita: yup
    .string()
    .max(100, 'Fonte da receita deve ter no máximo 100 caracteres'),
  forma_recebimento: yup
    .string()
    .max(50, 'Forma de recebimento deve ter no máximo 50 caracteres'),
  observacoes: yup
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres'),
  tem_impostos: yup
    .boolean()
    .default(false),
  valor_ir: yup
    .number()
    .min(0, 'Valor do IR deve ser maior ou igual a 0')
    .when('tem_impostos', {
      is: true,
      then: yup.number().required('Valor do IR é obrigatório quando há impostos')
    }),
  valor_inss: yup
    .number()
    .min(0, 'Valor do INSS deve ser maior ou igual a 0')
    .when('tem_impostos', {
      is: true,
      then: yup.number().required('Valor do INSS é obrigatório quando há impostos')
    }),
  valor_fgts: yup
    .number()
    .min(0, 'Valor do FGTS deve ser maior ou igual a 0')
    .when('tem_impostos', {
      is: true,
      then: yup.number().required('Valor do FGTS é obrigatório quando há impostos')
    }),
  outros_descontos: yup
    .number()
    .min(0, 'Outros descontos deve ser maior ou igual a 0')
    .default(0)
});

// Validação para categorias
export const categoriaSchema = yup.object({
  nome: yup
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres')
    .required('Nome é obrigatório'),
  descricao: yup
    .string()
    .max(200, 'Descrição deve ter no máximo 200 caracteres'),
  cor: yup
    .string()
    .matches(/^#[0-9A-F]{6}$/i, 'Cor deve estar no formato hexadecimal (#RRGGBB)')
    .required('Cor é obrigatória'),
  icone: yup
    .string()
    .max(50, 'Ícone deve ter no máximo 50 caracteres'),
  tipo: yup
    .string()
    .oneOf(['despesa', 'receita', 'ambos'], 'Tipo inválido')
    .default('despesa'),
  meta_mensal: yup
    .number()
    .positive('Meta mensal deve ser maior que zero')
    .nullable()
});

// Validação para metas
export const metaSchema = yup.object({
  titulo: yup
    .string()
    .min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres')
    .required('Título é obrigatório'),
  descricao: yup
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
  valor_meta: yup
    .number()
    .positive('Valor da meta deve ser maior que zero')
    .required('Valor da meta é obrigatório'),
  valor_atual: yup
    .number()
    .min(0, 'Valor atual deve ser maior ou igual a 0')
    .default(0),
  data_inicio: yup
    .date()
    .required('Data de início é obrigatória'),
  data_fim: yup
    .date()
    .min(yup.ref('data_inicio'), 'Data de fim deve ser posterior à data de início')
    .required('Data de fim é obrigatória'),
  categoria_id: yup
    .number()
    .positive('Categoria é obrigatória')
    .nullable(),
  tipo: yup
    .string()
    .oneOf(['economia', 'investimento', 'pagamento'], 'Tipo inválido')
    .default('economia'),
  status: yup
    .string()
    .oneOf(['ativa', 'concluida', 'cancelada'], 'Status inválido')
    .default('ativa')
});

// Validação para investimentos
export const investimentoSchema = yup.object({
  titulo: yup
    .string()
    .min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres')
    .required('Título é obrigatório'),
  descricao: yup
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
  valor_investido: yup
    .number()
    .positive('Valor investido deve ser maior que zero')
    .required('Valor investido é obrigatório'),
  valor_atual: yup
    .number()
    .min(0, 'Valor atual deve ser maior ou igual a 0')
    .nullable(),
  data_investimento: yup
    .date()
    .required('Data de investimento é obrigatória'),
  data_vencimento: yup
    .date()
    .nullable(),
  tipo: yup
    .string()
    .oneOf(['acoes', 'fundos', 'tesouro', 'cdb', 'poupanca', 'cripto', 'outros'], 'Tipo de investimento inválido')
    .required('Tipo de investimento é obrigatório'),
  instituicao: yup
    .string()
    .max(100, 'Instituição deve ter no máximo 100 caracteres'),
  rentabilidade: yup
    .number()
    .nullable(),
  risco: yup
    .string()
    .oneOf(['baixo', 'medio', 'alto'], 'Nível de risco inválido')
    .default('medio'),
  status: yup
    .string()
    .oneOf(['ativo', 'resgatado', 'vencido'], 'Status inválido')
    .default('ativo')
});

// Validação para login
export const loginSchema = yup.object({
  email: yup
    .string()
    .email('Email deve ser válido')
    .required('Email é obrigatório'),
  password: yup
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .required('Senha é obrigatória')
});

// Validação para registro
export const registroSchema = yup.object({
  nome: yup
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .required('Nome é obrigatório'),
  email: yup
    .string()
    .email('Email deve ser válido')
    .required('Email é obrigatório'),
  password: yup
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .required('Senha é obrigatória'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Confirmação de senha deve ser igual à senha')
    .required('Confirmação de senha é obrigatória')
});

// Função para validar dados
export const validateData = async (schema, data) => {
  try {
    const validatedData = await schema.validate(data, { abortEarly: false });
    return { isValid: true, data: validatedData, errors: null };
  } catch (error) {
    const errors = {};
    error.inner.forEach((err) => {
      errors[err.path] = err.message;
    });
    return { isValid: false, data: null, errors };
  }
};

// Função para formatar erros de validação
export const formatValidationErrors = (errors) => {
  if (!errors) return '';
  return Object.values(errors).join(', ');
}; 