-- Migration: 003_create_user_subscriptions
-- Descrição: Criar tabela user_subscriptions para gerenciar assinaturas de usuários
-- Data: 2024-08-20

-- Criar tabela user_subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id VARCHAR(50) DEFAULT 'basic',
  status ENUM('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid') DEFAULT 'incomplete',
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  current_period_start DATETIME,
  current_period_end DATETIME,
  trial_start DATETIME,
  trial_end DATETIME,
  canceled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_subscriptions_user_id (user_id),
  INDEX idx_user_subscriptions_plan_id (plan_id),
  INDEX idx_user_subscriptions_status (status),
  INDEX idx_user_subscriptions_stripe_sub (stripe_subscription_id),
  INDEX idx_user_subscriptions_stripe_cust (stripe_customer_id),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela payment_history se não existir
CREATE TABLE IF NOT EXISTS payment_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subscription_id INT,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  status ENUM('pending', 'succeeded', 'failed', 'canceled', 'refunded') DEFAULT 'pending',
  payment_method VARCHAR(50),
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  description TEXT,
  failure_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_payment_history_user_id (user_id),
  INDEX idx_payment_history_subscription_id (subscription_id),
  INDEX idx_payment_history_status (status),
  INDEX idx_payment_history_stripe_payment (stripe_payment_intent_id),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE SET NULL
);

-- Adicionar colunas de subscription na tabela users se não existirem
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'incomplete';

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS trial_ends_at DATETIME NULL;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_ends_at DATETIME NULL;

-- Criar alguns dados de exemplo para testes
INSERT IGNORE INTO user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end) 
SELECT id, 'basic', 'incomplete', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH)
FROM users 
WHERE id NOT IN (SELECT DISTINCT user_id FROM user_subscriptions WHERE user_subscriptions.user_id = users.id)
LIMIT 5; 