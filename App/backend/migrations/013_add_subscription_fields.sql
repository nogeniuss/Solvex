-- Adicionar campos de assinatura
ALTER TABLE users
ADD COLUMN stripe_customer_id VARCHAR(255) NULL,
ADD COLUMN stripe_subscription_id VARCHAR(255) NULL,
ADD COLUMN current_period_start TIMESTAMP NULL,
ADD COLUMN current_period_end TIMESTAMP NULL,
ADD INDEX idx_stripe_customer (stripe_customer_id),
ADD INDEX idx_stripe_subscription (stripe_subscription_id); 