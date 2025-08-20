-- Migration: Create error_logs table
-- Description: Tabela para armazenar erros capturados pelo ErrorBoundary frontend
-- Created: 2025-01-21

CREATE TABLE IF NOT EXISTS `error_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `error_id` varchar(255) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `message` text,
  `stack` text,
  `component_stack` text,
  `user_agent` text,
  `url` varchar(500),
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `resolved` boolean DEFAULT FALSE,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_error_timestamp` (`timestamp`),
  KEY `idx_error_user` (`user_id`),
  KEY `idx_error_id` (`error_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar colunas de notificação para usuários (se não existirem)
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `email_notifications` BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS `sms_notifications` BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS `push_notifications` BOOLEAN DEFAULT TRUE;

-- Adicionar coluna para controlar notificação de despesas vencidas
ALTER TABLE `despesas` 
ADD COLUMN IF NOT EXISTS `notification_sent` BOOLEAN DEFAULT FALSE; 