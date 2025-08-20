-- Migration: 002_fix_subscription_plans
-- Descrição: Corrigir e recriar tabela subscription_plans com estrutura completa
-- Data: 2024-08-20

-- Remover tabela existente se houver problema na estrutura
DROP TABLE IF EXISTS subscription_plans;

-- Criar tabela de planos de assinatura com estrutura correta
CREATE TABLE subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  billing_interval ENUM('month', 'year') DEFAULT 'month',
  interval_count INT DEFAULT 1,
  features JSON,
  is_popular BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  stripe_price_id VARCHAR(255),
  stripe_product_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plans_active (is_active),
  INDEX idx_plans_plan_id (plan_id)
);

-- Inserir planos padrão
INSERT INTO subscription_plans (plan_id, name, description, price, currency, billing_interval, features, is_popular, is_active) VALUES
('basic', 'Plano Básico', 'Ideal para controle pessoal básico', 20.00, 'BRL', 'month', 
 JSON_ARRAY(
   'Controle de receitas e despesas',
   'Relatórios básicos',
   'Até 5 categorias',
   'Suporte via email'
 ), FALSE, TRUE),

('premium', 'Plano Premium', 'Completo para gestão avançada', 35.00, 'BRL', 'month',
 JSON_ARRAY(
   'Tudo do Plano Básico',
   'Relatórios avançados',
   'Categorias ilimitadas',
   'Análise de investimentos',
   'Metas financeiras',
   'Notificações inteligentes',
   'Suporte prioritário'
 ), TRUE, TRUE),

('professional', 'Plano Profissional', 'Para empresas e profissionais', 50.00, 'BRL', 'month',
 JSON_ARRAY(
   'Tudo do Plano Premium',
   'Dashboard executivo',
   'Integração com bancos',
   'API personalizada',
   'Backup automático',
   'Consultoria financeira',
   'Suporte 24/7'
 ), FALSE, TRUE);

-- Verificar se coluna plan_id existe em user_subscriptions e adicionar se necessário
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50) DEFAULT 'basic';

-- Adicionar índice para plan_id se não existir
ALTER TABLE user_subscriptions 
ADD INDEX IF NOT EXISTS idx_user_subscriptions_plan_id (plan_id);

-- Atualizar subscriptions existentes para ter um plano
UPDATE user_subscriptions SET plan_id = 'basic' WHERE plan_id IS NULL OR plan_id = ''; 