-- Script para criar o banco de dados do Sistema de Finanças
-- Execute este script no MariaDB/MySQL

-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS financas
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- Usar o banco de dados
USE financas;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(20) UNIQUE NULL,
    senha VARCHAR(255) NOT NULL,
    status ENUM('ativo', 'inativo', 'pendente', 'bloqueado') DEFAULT 'pendente',
    role ENUM('user', 'admin') DEFAULT 'user',
    tentativas_login INT DEFAULT 0,
    data_bloqueio TIMESTAMP NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    data_ativacao TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela para redefinição de senha
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    cor VARCHAR(7) DEFAULT '#3B82F6',
    icone VARCHAR(50) DEFAULT 'money',
    user_id INT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    deleted_by INT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de despesas
CREATE TABLE IF NOT EXISTS despesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    valor DECIMAL(10,2) NOT NULL,
    categoria_id INT,
    user_id INT NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento TIMESTAMP NULL,
    status ENUM('pendente', 'pago', 'vencido') DEFAULT 'pendente',
    recorrencia ENUM('nenhuma', 'mensal', 'trimestral', 'semestral', 'anual') DEFAULT 'nenhuma',
    data_fim_recorrencia DATE NULL,
    juros DECIMAL(5,2) DEFAULT 0,
    multa DECIMAL(5,2) DEFAULT 0,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de receitas
CREATE TABLE IF NOT EXISTS receitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    valor DECIMAL(10,2) NOT NULL,
    valor_liquido DECIMAL(10,2) NULL,
    categoria_id INT,
    user_id INT NOT NULL,
    data_recebimento DATE NOT NULL,
    data_recebimento_real TIMESTAMP NULL,
    status ENUM('pendente', 'recebido') DEFAULT 'pendente',
    recorrencia ENUM('nenhuma', 'mensal', 'trimestral', 'semestral', 'anual') DEFAULT 'nenhuma',
    data_fim_recorrencia DATE NULL,
    tem_impostos BOOLEAN DEFAULT FALSE,
    ir_percentual DECIMAL(5,2) DEFAULT 0,
    ir_valor DECIMAL(10,2) DEFAULT 0,
    inss_percentual DECIMAL(5,2) DEFAULT 0,
    inss_valor DECIMAL(10,2) DEFAULT 0,
    fgts_percentual DECIMAL(5,2) DEFAULT 0,
    fgts_valor DECIMAL(10,2) DEFAULT 0,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de investimentos
CREATE TABLE IF NOT EXISTS investimentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo ENUM('renda_fixa', 'acoes', 'fundos_imobiliarios', 'criptomoedas', 'tesouro_direto', 'outros') NOT NULL,
    valor_inicial DECIMAL(10,2) NOT NULL,
    valor_atual DECIMAL(10,2) NULL,
    categoria_id INT,
    user_id INT NOT NULL,
    instituicao VARCHAR(255),
    data_inicio DATE NOT NULL,
    data_resgate DATE NULL,
    status ENUM('ativo', 'resgatado', 'cancelado') DEFAULT 'ativo',
    rentabilidade DECIMAL(5,2) NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de metas
CREATE TABLE IF NOT EXISTS metas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo ENUM('economia', 'investimento', 'reducao_despesa', 'aumento_receita', 'outros') NOT NULL,
    valor_meta DECIMAL(10,2) NOT NULL,
    valor_atual DECIMAL(10,2) DEFAULT 0,
    categoria_id INT,
    user_id INT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status ENUM('ativa', 'concluida', 'cancelada') DEFAULT 'ativa',
    prioridade ENUM('baixa', 'media', 'alta') DEFAULT 'media',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de conquistas
CREATE TABLE IF NOT EXISTS conquistas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo ENUM('economia', 'investimento', 'consistencia', 'metas', 'categorizacao', 'score') NOT NULL,
    pontos INT DEFAULT 0,
    criterio_valor DECIMAL(10,2) NULL,
    criterio_dias INT NULL,
    user_id INT NOT NULL,
    data_conquista TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de recorrências
CREATE TABLE IF NOT EXISTS recorrencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    valor DECIMAL(10,2) NOT NULL,
    tipo ENUM('receita', 'despesa') NOT NULL,
    categoria_id INT,
    frequencia ENUM('diaria', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual') NOT NULL,
    dia_mes INT,
    dia_semana INT,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status ENUM('ativa', 'pausada', 'cancelada') DEFAULT 'ativa',
    user_id INT NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notificacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    tipo ENUM('sistema', 'lembrete', 'motivacao', 'reativacao', 'personalizada') DEFAULT 'sistema',
    canal ENUM('email', 'sms', 'push') DEFAULT 'email',
    agendamento DATETIME,
    status ENUM('pendente', 'enviada', 'lida', 'cancelada') DEFAULT 'pendente',
    user_id INT NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_envio TIMESTAMP NULL,
    data_leitura TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de importações
CREATE TABLE IF NOT EXISTS importacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_arquivo VARCHAR(255) NOT NULL,
    tipo_importacao VARCHAR(100),
    total_registros INT DEFAULT 0,
    registros_importados INT DEFAULT 0,
    registros_com_erro INT DEFAULT 0,
    mapeamento TEXT,
    user_id INT NOT NULL,
    data_importacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de etapas do onboarding
CREATE TABLE IF NOT EXISTS onboarding_etapas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    etapa VARCHAR(100) NOT NULL,
    data_conclusao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_etapa (user_id, etapa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de ativações
CREATE TABLE IF NOT EXISTS ativacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tipo_ativacao VARCHAR(100) NOT NULL,
    data_ativacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de planos de assinatura
CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    valor DECIMAL(10,2) NOT NULL,
    moeda VARCHAR(3) DEFAULT 'BRL',
    periodo ENUM('mensal', 'anual') DEFAULT 'mensal',
    features JSON,
    stripe_price_id VARCHAR(255),
    paypal_plan_id VARCHAR(255),
    mercadopago_preference_id VARCHAR(255),
    ativo BOOLEAN DEFAULT TRUE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de assinaturas
CREATE TABLE IF NOT EXISTS subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    gateway ENUM('stripe', 'paypal', 'mercadopago') NOT NULL,
    gateway_subscription_id VARCHAR(255) NOT NULL,
    status ENUM('ativa', 'cancelada', 'suspensa', 'pagamento_pendente') DEFAULT 'ativa',
    valor DECIMAL(10,2) NOT NULL,
    data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP NULL,
    data_cancelamento TIMESTAMP NULL,
    data_ultimo_pagamento TIMESTAMP NULL,
    data_proximo_pagamento TIMESTAMP NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id INT NOT NULL,
    gateway ENUM('stripe', 'paypal', 'mercadopago') NOT NULL,
    gateway_payment_id VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    moeda VARCHAR(3) DEFAULT 'BRL',
    status ENUM('pendente', 'pago', 'falhou', 'reembolsado') DEFAULT 'pendente',
    data_pagamento TIMESTAMP NULL,
    data_vencimento TIMESTAMP NULL,
    metodo_pagamento VARCHAR(100),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de configurações do usuário
CREATE TABLE IF NOT EXISTS user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    chave VARCHAR(255) NOT NULL,
    valor TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_setting (user_id, categoria, chave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir categorias padrão do sistema
INSERT INTO categorias (nome, descricao, cor, icone, user_id) VALUES
('Alimentação', 'Gastos com alimentação e refeições', '#EF4444', 'food', NULL),
('Transporte', 'Gastos com transporte e locomoção', '#F59E0B', 'car', NULL),
('Moradia', 'Gastos com moradia e aluguel', '#10B981', 'home', NULL),
('Saúde', 'Gastos com saúde e medicamentos', '#3B82F6', 'health', NULL),
('Educação', 'Gastos com educação e cursos', '#8B5CF6', 'education', NULL),
('Lazer', 'Gastos com lazer e entretenimento', '#EC4899', 'entertainment', NULL),
('Vestuário', 'Gastos com roupas e acessórios', '#06B6D4', 'clothing', NULL),
('Serviços', 'Gastos com serviços diversos', '#84CC16', 'services', NULL),
('Salário', 'Receita de salário e trabalho', '#10B981', 'salary', NULL),
('Freelance', 'Receita de trabalhos freelancer', '#F59E0B', 'freelance', NULL),
('Investimentos', 'Receita de investimentos', '#3B82F6', 'investment', NULL),
('Outros', 'Outras receitas e despesas', '#6B7280', 'other', NULL);

-- Inserir planos de assinatura padrão
INSERT INTO subscription_plans (id, nome, descricao, valor, periodo, features) VALUES
('basic', 'Básico', 'Funcionalidades essenciais para controle financeiro pessoal', 19.90, 'mensal', 
 '["Controle de receitas e despesas", "Categorização de transações", "Relatórios básicos", "Metas financeiras", "Suporte por email"]'),
('premium', 'Premium', 'Funcionalidades avançadas para análise detalhada', 39.90, 'mensal',
 '["Todas as funcionalidades do Básico", "Importação de extratos", "Relatórios avançados", "Insights inteligentes", "Notificações personalizadas", "Suporte prioritário"]'),
('enterprise', 'Empresarial', 'Solução completa para empresas e consultores', 99.90, 'mensal',
 '["Todas as funcionalidades do Premium", "Múltiplos usuários", "API de integração", "Relatórios customizados", "Suporte dedicado", "Treinamento incluído"]');

-- Verificar se as tabelas foram criadas
DESCRIBE users;
DESCRIBE categorias;
DESCRIBE despesas;
DESCRIBE receitas; 