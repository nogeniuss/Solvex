-- Script para atualizar o banco de dados existente
-- Execute este script no MariaDB/MySQL

USE financas;

-- Adicionar coluna telefone na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefone VARCHAR(20) NULL;

-- Tornar telefone único
ALTER TABLE users ADD UNIQUE INDEX idx_telefone_unique (telefone);

-- Adicionar coluna tentativas_login na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS tentativas_login INT DEFAULT 0;

-- Adicionar coluna data_bloqueio na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS data_bloqueio TIMESTAMP NULL;

-- Modificar o ENUM status para incluir 'bloqueado'
ALTER TABLE users MODIFY COLUMN status ENUM('ativo', 'inativo', 'pendente', 'bloqueado') DEFAULT 'pendente';

-- Criar tabela para redefinição de senha
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 