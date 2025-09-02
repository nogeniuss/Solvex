-- Script para otimização de performance do banco de dados
-- Índices para melhorar consultas frequentes

USE financas;

-- Índices para tabela users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_telefone ON users(telefone);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_date ON users(created_date);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Índices compostos para users
CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status, role);
CREATE INDEX IF NOT EXISTS idx_users_email_status ON users(email, status);

-- Índices para tabela categorias
CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_deleted_at ON categorias(deleted_at);
CREATE INDEX IF NOT EXISTS idx_categorias_nome ON categorias(nome);

-- Índices compostos para categorias
CREATE INDEX IF NOT EXISTS idx_categorias_user_deleted ON categorias(user_id, deleted_at);

-- Índices para tabela despesas
CREATE INDEX IF NOT EXISTS idx_despesas_user_id ON despesas(user_id);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria_id ON despesas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_despesas_status ON despesas(status);
CREATE INDEX IF NOT EXISTS idx_despesas_data_vencimento ON despesas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_despesas_data_pagamento ON despesas(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_despesas_recorrencia ON despesas(recorrencia);
CREATE INDEX IF NOT EXISTS idx_despesas_valor ON despesas(valor);
CREATE INDEX IF NOT EXISTS idx_despesas_created_date ON despesas(created_date);

-- Índices compostos para despesas
CREATE INDEX IF NOT EXISTS idx_despesas_user_status ON despesas(user_id, status);
CREATE INDEX IF NOT EXISTS idx_despesas_user_vencimento ON despesas(user_id, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_despesas_user_categoria ON despesas(user_id, categoria_id);
CREATE INDEX IF NOT EXISTS idx_despesas_user_mes_ano ON despesas(user_id, MONTH(data_vencimento), YEAR(data_vencimento));
CREATE INDEX IF NOT EXISTS idx_despesas_status_vencimento ON despesas(status, data_vencimento);

-- Índices para tabela receitas
CREATE INDEX IF NOT EXISTS idx_receitas_user_id ON receitas(user_id);
CREATE INDEX IF NOT EXISTS idx_receitas_categoria_id ON receitas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_receitas_status ON receitas(status);
CREATE INDEX IF NOT EXISTS idx_receitas_data_recebimento ON receitas(data_recebimento);
CREATE INDEX IF NOT EXISTS idx_receitas_data_recebimento_real ON receitas(data_recebimento_real);
CREATE INDEX IF NOT EXISTS idx_receitas_recorrencia ON receitas(recorrencia);
CREATE INDEX IF NOT EXISTS idx_receitas_valor ON receitas(valor);
CREATE INDEX IF NOT EXISTS idx_receitas_created_date ON receitas(created_date);

-- Índices compostos para receitas
CREATE INDEX IF NOT EXISTS idx_receitas_user_status ON receitas(user_id, status);
CREATE INDEX IF NOT EXISTS idx_receitas_user_recebimento ON receitas(user_id, data_recebimento);
CREATE INDEX IF NOT EXISTS idx_receitas_user_categoria ON receitas(user_id, categoria_id);
CREATE INDEX IF NOT EXISTS idx_receitas_user_mes_ano ON receitas(user_id, MONTH(data_recebimento), YEAR(data_recebimento));
CREATE INDEX IF NOT EXISTS idx_receitas_status_recebimento ON receitas(status, data_recebimento);

-- Índices para tabela investimentos
CREATE INDEX IF NOT EXISTS idx_investimentos_user_id ON investimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_investimentos_categoria_id ON investimentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_investimentos_status ON investimentos(status);
CREATE INDEX IF NOT EXISTS idx_investimentos_tipo ON investimentos(tipo);
CREATE INDEX IF NOT EXISTS idx_investimentos_data_inicio ON investimentos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_investimentos_data_resgate ON investimentos(data_resgate);
CREATE INDEX IF NOT EXISTS idx_investimentos_valor_inicial ON investimentos(valor_inicial);
CREATE INDEX IF NOT EXISTS idx_investimentos_rentabilidade ON investimentos(rentabilidade);
CREATE INDEX IF NOT EXISTS idx_investimentos_created_date ON investimentos(created_date);

-- Índices compostos para investimentos
CREATE INDEX IF NOT EXISTS idx_investimentos_user_status ON investimentos(user_id, status);
CREATE INDEX IF NOT EXISTS idx_investimentos_user_tipo ON investimentos(user_id, tipo);
CREATE INDEX IF NOT EXISTS idx_investimentos_user_inicio ON investimentos(user_id, data_inicio);
CREATE INDEX IF NOT EXISTS idx_investimentos_status_resgate ON investimentos(status, data_resgate);

-- Índices para tabela metas
CREATE INDEX IF NOT EXISTS idx_metas_user_id ON metas(user_id);
CREATE INDEX IF NOT EXISTS idx_metas_categoria_id ON metas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_metas_status ON metas(status);
CREATE INDEX IF NOT EXISTS idx_metas_tipo ON metas(tipo);
CREATE INDEX IF NOT EXISTS idx_metas_data_inicio ON metas(data_inicio);
CREATE INDEX IF NOT EXISTS idx_metas_data_fim ON metas(data_fim);
CREATE INDEX IF NOT EXISTS idx_metas_valor_meta ON metas(valor_meta);
CREATE INDEX IF NOT EXISTS idx_metas_created_date ON metas(created_date);

-- Índices compostos para metas
CREATE INDEX IF NOT EXISTS idx_metas_user_status ON metas(user_id, status);
CREATE INDEX IF NOT EXISTS idx_metas_user_tipo ON metas(user_id, tipo);
CREATE INDEX IF NOT EXISTS idx_metas_user_fim ON metas(user_id, data_fim);
CREATE INDEX IF NOT EXISTS idx_metas_status_fim ON metas(status, data_fim);

-- Índices para tabela conquistas
CREATE INDEX IF NOT EXISTS idx_conquistas_user_id ON conquistas(user_id);
CREATE INDEX IF NOT EXISTS idx_conquistas_tipo ON conquistas(tipo);
CREATE INDEX IF NOT EXISTS idx_conquistas_data_conquista ON conquistas(data_conquista);
CREATE INDEX IF NOT EXISTS idx_conquistas_created_date ON conquistas(created_date);

-- Índices compostos para conquistas
CREATE INDEX IF NOT EXISTS idx_conquistas_user_tipo ON conquistas(user_id, tipo);
CREATE INDEX IF NOT EXISTS idx_conquistas_user_data ON conquistas(user_id, data_conquista);

-- Índices para tabela notificacoes
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id ON notificacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON notificacoes(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_agendamento ON notificacoes(agendamento);
CREATE INDEX IF NOT EXISTS idx_notificacoes_data_criacao ON notificacoes(data_criacao);
CREATE INDEX IF NOT EXISTS idx_notificacoes_data_envio ON notificacoes(data_envio);

-- Índices compostos para notificacoes
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_status ON notificacoes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_tipo ON notificacoes(user_id, tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_status_agendamento ON notificacoes(status, agendamento);

-- Índices para tabela importacoes
CREATE INDEX IF NOT EXISTS idx_importacoes_user_id ON importacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_importacoes_tipo_importacao ON importacoes(tipo_importacao);
CREATE INDEX IF NOT EXISTS idx_importacoes_data_importacao ON importacoes(data_importacao);

-- Índices compostos para importacoes
CREATE INDEX IF NOT EXISTS idx_importacoes_user_data ON importacoes(user_id, data_importacao);

-- Índices para tabela password_resets
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_used ON password_resets(used);

-- Índices compostos para password_resets
CREATE INDEX IF NOT EXISTS idx_password_resets_token_used ON password_resets(token, used);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_expires ON password_resets(user_id, expires_at);

-- Índices para analytics (se existirem)
-- CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
-- CREATE INDEX IF NOT EXISTS idx_user_sessions_start_time ON user_sessions(start_time);
-- CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
-- CREATE INDEX IF NOT EXISTS idx_user_events_timestamp ON user_events(timestamp);
-- CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON feature_usage(user_id);
-- CREATE INDEX IF NOT EXISTS idx_feature_usage_timestamp ON feature_usage(timestamp);

-- Índices para performance de consultas complexas
-- Índice para consultas de dashboard (receitas + despesas por mês)
CREATE INDEX IF NOT EXISTS idx_dashboard_receitas ON receitas(user_id, YEAR(data_recebimento), MONTH(data_recebimento), valor);
CREATE INDEX IF NOT EXISTS idx_dashboard_despesas ON despesas(user_id, YEAR(data_vencimento), MONTH(data_vencimento), valor);

-- Índice para consultas de relatórios
CREATE INDEX IF NOT EXISTS idx_relatorios_receitas ON receitas(user_id, data_recebimento, categoria_id, valor);
CREATE INDEX IF NOT EXISTS idx_relatorios_despesas ON despesas(user_id, data_vencimento, categoria_id, valor);

-- Índice para consultas de fluxo de caixa
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_receitas ON receitas(user_id, data_recebimento, valor, status);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_despesas ON despesas(user_id, data_vencimento, valor, status);

-- Índices para consultas de recorrências
CREATE INDEX IF NOT EXISTS idx_recorrencias_receitas ON receitas(user_id, recorrencia, data_recebimento);
CREATE INDEX IF NOT EXISTS idx_recorrencias_despesas ON despesas(user_id, recorrencia, data_vencimento);

-- Índices para consultas de alertas
CREATE INDEX IF NOT EXISTS idx_alertas_despesas_vencidas ON despesas(user_id, status, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_alertas_metas_vencendo ON metas(user_id, status, data_fim);
CREATE INDEX IF NOT EXISTS idx_alertas_investimentos_resgate ON investimentos(user_id, status, data_resgate);

-- Índices para consultas de busca
CREATE INDEX IF NOT EXISTS idx_busca_receitas ON receitas(user_id, titulo, descricao);
CREATE INDEX IF NOT EXISTS idx_busca_despesas ON despesas(user_id, titulo, descricao);
CREATE INDEX IF NOT EXISTS idx_busca_investimentos ON investimentos(user_id, titulo, descricao);

-- Índices para consultas de exportação
CREATE INDEX IF NOT EXISTS idx_export_receitas ON receitas(user_id, created_date, data_recebimento);
CREATE INDEX IF NOT EXISTS idx_export_despesas ON despesas(user_id, created_date, data_vencimento);
CREATE INDEX IF NOT EXISTS idx_export_investimentos ON investimentos(user_id, created_date, data_inicio);

-- Verificar e otimizar tabelas
ANALYZE TABLE users;
ANALYZE TABLE categorias;
ANALYZE TABLE despesas;
ANALYZE TABLE receitas;
ANALYZE TABLE investimentos;
ANALYZE TABLE metas;
ANALYZE TABLE conquistas;
ANALYZE TABLE notificacoes;
ANALYZE TABLE importacoes;
ANALYZE TABLE password_resets;

-- Mostrar estatísticas dos índices
SHOW INDEX FROM users;
SHOW INDEX FROM despesas;
SHOW INDEX FROM receitas;
SHOW INDEX FROM investimentos;

-- Verificar uso de índices
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    CARDINALITY,
    SUB_PART,
    PACKED,
    NULLABLE,
    INDEX_TYPE
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'financas' 
ORDER BY TABLE_NAME, INDEX_NAME; 