-- Adicionar campos de status de pagamento na tabela users
ALTER TABLE users
ADD COLUMN payment_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT NULL,
ADD COLUMN last_payment_attempt TIMESTAMP NULL,
ADD COLUMN payment_session_id VARCHAR(255) NULL,
ADD INDEX idx_payment_status (payment_status),
ADD INDEX idx_payment_session (payment_session_id); 