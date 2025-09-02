-- Adicionar coluna de status de assinatura
ALTER TABLE users
ADD COLUMN subscription_status ENUM('incomplete', 'active', 'expired', 'cancelled') DEFAULT 'incomplete',
ADD COLUMN subscription_ends_at TIMESTAMP NULL; 