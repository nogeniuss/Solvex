-- Migration: Create notification indexes
-- Description: Criar índices para otimização das queries de notificação
-- Created: 2025-01-21

-- Criar índices para otimização das queries de notificação
CREATE INDEX IF NOT EXISTS `idx_despesas_vencimento_notification` ON `despesas` (`data_vencimento`, `status`, `notification_sent`);
CREATE INDEX IF NOT EXISTS `idx_users_notifications` ON `users` (`email_notifications`, `sms_notifications`, `active`); 