-- Adicionar tabelas para gerenciar subscriptions e pagamentos do Stripe

-- Tabela de subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_product_id VARCHAR(255) NOT NULL DEFAULT 'prod_Stlma15LeExwdw',
  status ENUM('active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing', 'paused') DEFAULT 'incomplete',
  current_period_start DATETIME,
  current_period_end DATETIME,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_start DATETIME NULL,
  trial_end DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_subscriptions_user_id (user_id),
  INDEX idx_user_subscriptions_stripe_customer (stripe_customer_id),
  INDEX idx_user_subscriptions_status (status)
);

-- Tabela de histórico de pagamentos
CREATE TABLE IF NOT EXISTS payment_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subscription_id INT,
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  status ENUM('succeeded', 'pending', 'failed', 'canceled', 'requires_action') DEFAULT 'pending',
  payment_method VARCHAR(50),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  INDEX idx_payment_history_user_id (user_id),
  INDEX idx_payment_history_subscription_id (subscription_id),
  INDEX idx_payment_history_status (status),
  INDEX idx_payment_history_stripe_payment_intent (stripe_payment_intent_id)
);

-- Tabela de eventos do webhook do Stripe
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  data JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  INDEX idx_stripe_webhook_events_stripe_id (stripe_event_id),
  INDEX idx_stripe_webhook_events_type (event_type),
  INDEX idx_stripe_webhook_events_processed (processed)
);

-- Adicionar campo subscription_status na tabela users se não existir
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status ENUM('trial', 'active', 'past_due', 'canceled', 'incomplete') DEFAULT 'incomplete',
ADD COLUMN IF NOT EXISTS trial_ends_at DATETIME NULL,
ADD COLUMN IF NOT EXISTS subscription_ends_at DATETIME NULL;

-- Índices para a tabela users
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Função para verificar se usuário tem acesso ativo
DELIMITER //
CREATE OR REPLACE FUNCTION user_has_active_subscription(user_id INT) 
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE subscription_count INT DEFAULT 0;
    
    SELECT COUNT(*) INTO subscription_count
    FROM user_subscriptions 
    WHERE user_id = user_id 
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > NOW());
    
    RETURN subscription_count > 0;
END //
DELIMITER ; 