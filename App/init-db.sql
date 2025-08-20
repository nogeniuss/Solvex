-- Script para inicializar o usuário do banco de dados
-- Este script é executado após a criação do banco

-- Garantir que o usuário financas_user existe e tem todas as permissões
CREATE USER IF NOT EXISTS 'financas_user'@'%' IDENTIFIED BY 'financas_pass_2024';

-- Conceder todas as permissões no banco financas
GRANT ALL PRIVILEGES ON financas.* TO 'financas_user'@'%';

-- Conceder permissões específicas se necessário
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON financas.* TO 'financas_user'@'%';

-- Aplicar as mudanças
FLUSH PRIVILEGES;

-- Verificar se o usuário foi criado
SELECT User, Host FROM mysql.user WHERE User = 'financas_user'; 