-- Migration: 015_add_stripe_payment_intent_to_payment_history
-- Descrição: Adicionar coluna stripe_payment_intent_id na tabela payment_history
-- Data: 2025-08-28

-- Adicionar coluna stripe_payment_intent_id se não existir
ALTER TABLE payment_history 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255) NULL;

-- Adicionar índice para a nova coluna se não existir
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_payment_intent 
ON payment_history(stripe_payment_intent_id);

-- Adicionar outras colunas que podem estar faltando
ALTER TABLE payment_history 
ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS subscription_id INT NULL; 