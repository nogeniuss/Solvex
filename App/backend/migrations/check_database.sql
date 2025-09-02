-- Script para verificar a estrutura da tabela users
USE financas;

-- Verificar estrutura da tabela users
DESCRIBE users;

-- Verificar se as colunas existem
SELECT 
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'financas' 
AND TABLE_NAME = 'users'
ORDER BY ORDINAL_POSITION;

-- Verificar se a tabela password_resets existe
SHOW TABLES LIKE 'password_resets'; 