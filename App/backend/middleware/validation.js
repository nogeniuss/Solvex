const Joi = require('joi');

// Middleware de validação genérico
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: errorMessage 
      });
    }
    
    next();
  };
};

// Schemas de validação
const schemas = {
  // Validação para despesas
  despesa: Joi.object({
    titulo: Joi.string().min(3).max(100).required().messages({
      'string.min': 'Título deve ter pelo menos 3 caracteres',
      'string.max': 'Título deve ter no máximo 100 caracteres',
      'any.required': 'Título é obrigatório'
    }),
    descricao: Joi.string().max(500).optional().allow(''),
    valor: Joi.number().positive().required().messages({
      'number.positive': 'Valor deve ser maior que zero',
      'any.required': 'Valor é obrigatório'
    }),
    categoria_id: Joi.number().integer().positive().optional().allow(null),
    data_vencimento: Joi.date().iso().required().messages({
      'any.required': 'Data de vencimento é obrigatória',
      'date.format': 'Data deve estar no formato YYYY-MM-DD'
    }),
    recorrencia: Joi.string().valid('nenhuma', 'mensal', 'trimestral', 'semestral', 'anual').default('nenhuma'),
    data_fim_recorrencia: Joi.date().iso().optional().allow(null, ''),
    juros: Joi.number().min(0).max(100).default(0),
    multa: Joi.number().min(0).max(100).default(0)
  }),

  // Validação para receitas
  receita: Joi.object({
    titulo: Joi.string().min(3).max(100).required().messages({
      'string.min': 'Título deve ter pelo menos 3 caracteres',
      'string.max': 'Título deve ter no máximo 100 caracteres',
      'any.required': 'Título é obrigatório'
    }),
    descricao: Joi.string().max(500).optional().allow(''),
    valor: Joi.number().positive().required().messages({
      'number.positive': 'Valor deve ser maior que zero',
      'any.required': 'Valor é obrigatório'
    }),
    data_recebimento: Joi.date().iso().required().messages({
      'any.required': 'Data de recebimento é obrigatória',
      'date.format': 'Data deve estar no formato YYYY-MM-DD'
    }),
    categoria_id: Joi.number().integer().positive().optional().allow(null),
    recorrencia: Joi.string().valid('nenhuma', 'diaria', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual').default('nenhuma'),
    data_fim_recorrencia: Joi.date().iso().optional().allow(null, ''),
    fonte_receita: Joi.string().max(100).optional().allow(''),
    forma_recebimento: Joi.string().max(50).optional().allow(''),
    observacoes: Joi.string().max(500).optional().allow(''),
    tem_impostos: Joi.boolean().default(false),
    valor_ir: Joi.number().min(0).optional().allow(''),
    valor_inss: Joi.number().min(0).optional().allow(''),
    valor_fgts: Joi.number().min(0).optional().allow(''),
    outros_descontos: Joi.number().min(0).optional().allow('')
  }),

  // Validação para categorias
  categoria: Joi.object({
    nome: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 50 caracteres',
      'any.required': 'Nome é obrigatório'
    }),
    descricao: Joi.string().max(200).optional().allow(''),
    cor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).required().messages({
      'string.pattern.base': 'Cor deve estar no formato hexadecimal (#RRGGBB)',
      'any.required': 'Cor é obrigatória'
    }),
    icone: Joi.string().max(50).optional().allow(''),
    tipo: Joi.string().valid('despesa', 'receita', 'ambos').default('despesa'),
    meta_mensal: Joi.number().positive().optional().allow(null, ''),
    ativo: Joi.boolean().default(true)
  }),

  // Validação para metas
  meta: Joi.object({
    titulo: Joi.string().min(3).max(100).required().messages({
      'string.min': 'Título deve ter pelo menos 3 caracteres',
      'string.max': 'Título deve ter no máximo 100 caracteres',
      'any.required': 'Título é obrigatório'
    }),
    descricao: Joi.string().max(500).optional().allow(''),
    valor_meta: Joi.number().positive().required().messages({
      'number.positive': 'Valor da meta deve ser maior que zero',
      'any.required': 'Valor da meta é obrigatório'
    }),
    valor_atual: Joi.number().min(0).default(0),
    data_inicio: Joi.date().iso().required().messages({
      'any.required': 'Data de início é obrigatória',
      'date.format': 'Data deve estar no formato YYYY-MM-DD'
    }),
    data_fim: Joi.date().iso().min(Joi.ref('data_inicio')).required().messages({
      'any.required': 'Data de fim é obrigatória',
      'date.format': 'Data deve estar no formato YYYY-MM-DD',
      'date.min': 'Data de fim deve ser posterior à data de início'
    }),
    categoria_id: Joi.number().integer().positive().optional().allow(null),
    tipo_meta: Joi.string().valid('economia', 'investimento', 'pagamento').default('economia'),
    status: Joi.string().valid('ativa', 'concluida', 'cancelada').default('ativa')
  }),

  // Validação para investimentos
  investimento: Joi.object({
    titulo: Joi.string().min(3).max(100).required().messages({
      'string.min': 'Título deve ter pelo menos 3 caracteres',
      'string.max': 'Título deve ter no máximo 100 caracteres',
      'any.required': 'Título é obrigatório'
    }),
    descricao: Joi.string().max(500).optional().allow(''),
    valor_investido: Joi.number().positive().required().messages({
      'number.positive': 'Valor investido deve ser maior que zero',
      'any.required': 'Valor investido é obrigatório'
    }),
    valor_atual: Joi.number().min(0).optional().allow(null),
    data_investimento: Joi.date().iso().required().messages({
      'any.required': 'Data de investimento é obrigatória',
      'date.format': 'Data deve estar no formato YYYY-MM-DD'
    }),
    data_vencimento: Joi.date().iso().optional().allow(null),
    tipo: Joi.string().valid('acoes', 'fundos', 'tesouro', 'cdb', 'poupanca', 'cripto', 'outros').required(),
    instituicao: Joi.string().max(100).optional().allow(''),
    rentabilidade: Joi.number().optional().allow(null),
    risco: Joi.string().valid('baixo', 'medio', 'alto').default('medio'),
    status: Joi.string().valid('ativo', 'resgatado', 'vencido').default('ativo'),
    categoria_id: Joi.number().integer().positive().optional().allow(null)
  }),

  // Validação para login
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email deve ser válido',
      'any.required': 'Email é obrigatório'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Senha deve ter pelo menos 6 caracteres',
      'any.required': 'Senha é obrigatória'
    })
  }),

  // Validação para registro
  registro: Joi.object({
    nome: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres',
      'any.required': 'Nome é obrigatório'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Email deve ser válido',
      'any.required': 'Email é obrigatório'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Senha deve ter pelo menos 6 caracteres',
      'any.required': 'Senha é obrigatória'
    }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Confirmação de senha deve ser igual à senha',
      'any.required': 'Confirmação de senha é obrigatória'
    })
  }),

  // Validação para investimentos
  investimento: Joi.object({
    titulo: Joi.string().min(3).max(100).required().messages({
      'string.min': 'Título deve ter pelo menos 3 caracteres',
      'string.max': 'Título deve ter no máximo 100 caracteres',
      'any.required': 'Título é obrigatório'
    }),
    descricao: Joi.string().max(500).optional().allow(''),
    valor_investido: Joi.number().positive().required().messages({
      'number.positive': 'Valor investido deve ser maior que zero',
      'any.required': 'Valor investido é obrigatório'
    }),
    valor_atual: Joi.number().min(0).optional().allow(null, ''),
    data_investimento: Joi.date().iso().required().messages({
      'any.required': 'Data de investimento é obrigatória',
      'date.format': 'Data deve estar no formato YYYY-MM-DD'
    }),
    data_vencimento: Joi.date().iso().optional().allow(null, ''),
    tipo: Joi.string().valid('acoes', 'fundos', 'tesouro', 'cdb', 'poupanca', 'cripto', 'outros').required().messages({
      'any.required': 'Tipo de investimento é obrigatório'
    }),
    instituicao: Joi.string().max(100).optional().allow(''),
    rentabilidade: Joi.number().optional().allow(null, ''),
    risco: Joi.string().valid('baixo', 'medio', 'alto').default('medio'),
    status: Joi.string().valid('ativo', 'resgatado', 'vencido').default('ativo')
  }),

  // Validação para autenticação
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email deve ser válido',
      'any.required': 'Email é obrigatório'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Senha deve ter pelo menos 6 caracteres',
      'any.required': 'Senha é obrigatória'
    })
  }),

  // Validação para registro
  registro: Joi.object({
    nome: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres',
      'any.required': 'Nome é obrigatório'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Email deve ser válido',
      'any.required': 'Email é obrigatório'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Senha deve ter pelo menos 6 caracteres',
      'any.required': 'Senha é obrigatória'
    }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Confirmação de senha deve ser igual à senha',
      'any.required': 'Confirmação de senha é obrigatória'
    })
  }),

  // Validação para filtros
  filtros: Joi.object({
    mes: Joi.number().integer().min(1).max(12).optional(),
    ano: Joi.number().integer().min(2000).max(2100).optional(),
    categoria_id: Joi.number().integer().positive().optional(),
    status: Joi.string().valid('pendente', 'pago', 'vencido', 'recebido', 'cancelado').optional(),
    data_inicio: Joi.date().iso().optional(),
    data_fim: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  // Validação para backup
  backup: Joi.object({
    name: Joi.string().max(100).optional(),
    compress: Joi.boolean().default(false),
    structureOnly: Joi.boolean().default(false),
    dataOnly: Joi.boolean().default(false)
  }),

  // Validação para restore
  restore: Joi.object({
    backupName: Joi.string().required().messages({
      'any.required': 'Nome do backup é obrigatório'
    })
  }),

  // Validação para verify
  verify: Joi.object({
    backupName: Joi.string().required().messages({
      'any.required': 'Nome do backup é obrigatório'
    })
  }),

  // Validação para export
  export: Joi.object({
    tables: Joi.array().items(Joi.string()).optional(),
    name: Joi.string().max(100).optional(),
    structureOnly: Joi.boolean().default(false),
    dataOnly: Joi.boolean().default(false)
  }),

  // Validação para cleanup
  cleanup: Joi.object({
    daysToKeep: Joi.number().integer().min(1).max(365).default(30)
  })
};

module.exports = {
  validate,
  schemas
}; 