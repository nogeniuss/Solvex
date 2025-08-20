-- =====================================================
-- TABELAS PARA ANALYTICS E PRODUCT-LED GROWTH
-- =====================================================

-- 1. TABELA DE SESSÕES DE USUÁRIO
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NULL,
    duration_seconds INT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. TABELA DE EVENTOS DE USUÁRIO
CREATE TABLE IF NOT EXISTS user_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_data JSON,
    page_url VARCHAR(500),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES user_sessions(session_id) ON DELETE CASCADE
);

-- 3. TABELA DE FUNCIONALIDADES ACESSADAS
CREATE TABLE IF NOT EXISTS feature_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'view', 'create', 'edit', 'delete', 'export'
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    duration_seconds INT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. TABELA DE ONBOARDING E ATIVAÇÃO
CREATE TABLE IF NOT EXISTS user_onboarding (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_order INT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at DATETIME NULL,
    time_to_complete_seconds INT NULL,
    skipped BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. TABELA DE CONVERSÕES E PLANOS
CREATE TABLE IF NOT EXISTS user_conversions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    conversion_type VARCHAR(50) NOT NULL, -- 'signup', 'activation', 'payment', 'upgrade', 'downgrade', 'churn'
    plan_name VARCHAR(100),
    plan_value DECIMAL(10,2),
    payment_method VARCHAR(50),
    conversion_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    trial_days INT NULL,
    source VARCHAR(100),
    campaign VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. TABELA DE MÉTRICAS DE SAÚDE DO CLIENTE
CREATE TABLE IF NOT EXISTS customer_health (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    health_score INT CHECK (health_score >= 0 AND health_score <= 100),
    last_login_date DATETIME NULL,
    days_since_last_login INT NULL,
    total_sessions INT DEFAULT 0,
    avg_session_duration INT NULL,
    features_used_count INT DEFAULT 0,
    support_tickets_count INT DEFAULT 0,
    nps_score INT NULL,
    csat_score INT NULL,
    churn_risk VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high'
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. TABELA DE SUPORTE E TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    category VARCHAR(100),
    assigned_to VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    resolution_time_hours INT NULL,
    satisfaction_score INT NULL,
    feedback TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. TABELA DE FEEDBACK E NPS
CREATE TABLE IF NOT EXISTS user_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    feedback_type VARCHAR(50) NOT NULL, -- 'nps', 'csat', 'feature_request', 'bug_report', 'general'
    score INT NULL,
    comment TEXT,
    feature_name VARCHAR(100),
    page_url VARCHAR(500),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. TABELA DE MÉTRICAS FINANCEIRAS
CREATE TABLE IF NOT EXISTS financial_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    metric_date DATE NOT NULL,
    mrr DECIMAL(10,2) DEFAULT 0, -- Monthly Recurring Revenue
    arr DECIMAL(10,2) DEFAULT 0, -- Annual Recurring Revenue
    ltv DECIMAL(10,2) DEFAULT 0, -- Lifetime Value
    cac DECIMAL(10,2) DEFAULT 0, -- Customer Acquisition Cost
    churn_rate DECIMAL(5,4) DEFAULT 0,
    expansion_revenue DECIMAL(10,2) DEFAULT 0,
    downgrade_revenue DECIMAL(10,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. TABELA DE FUNNEL DE CONVERSÃO
CREATE TABLE IF NOT EXISTS conversion_funnel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funnel_name VARCHAR(100) NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_order INT NOT NULL,
    user_id INT NULL,
    session_id VARCHAR(255),
    entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    abandoned_at DATETIME NULL,
    time_to_complete_seconds INT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. TABELA DE PERFORMANCE DE PÁGINAS
CREATE TABLE IF NOT EXISTS page_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    session_id VARCHAR(255),
    page_url VARCHAR(500) NOT NULL,
    page_title VARCHAR(255),
    load_time_ms INT NULL,
    time_on_page_seconds INT NULL,
    bounce BOOLEAN DEFAULT FALSE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES user_sessions(session_id) ON DELETE CASCADE
);

-- 12. TABELA DE ERROS E BARRREIRAS
CREATE TABLE IF NOT EXISTS user_barriers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    session_id VARCHAR(255),
    barrier_type VARCHAR(50) NOT NULL, -- 'error', 'timeout', 'validation', 'permission'
    page_url VARCHAR(500),
    error_message TEXT,
    error_code VARCHAR(100),
    user_action TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES user_sessions(session_id) ON DELETE CASCADE
);

-- =====================================================
-- ÍNDICES PARA OTIMIZAÇÃO
-- =====================================================

-- Índices para user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start_time ON user_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);

-- Índices para user_events
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_timestamp ON user_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_events_session_id ON user_events(session_id);

-- Índices para feature_usage
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature_name ON feature_usage(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_usage_timestamp ON feature_usage(timestamp);

-- Índices para user_onboarding
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_step_name ON user_onboarding(step_name);

-- Índices para user_conversions
CREATE INDEX IF NOT EXISTS idx_user_conversions_user_id ON user_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_conversions_conversion_type ON user_conversions(conversion_type);
CREATE INDEX IF NOT EXISTS idx_user_conversions_conversion_date ON user_conversions(conversion_date);

-- Índices para customer_health
CREATE INDEX IF NOT EXISTS idx_customer_health_user_id ON customer_health(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_health_score ON customer_health(health_score);
CREATE INDEX IF NOT EXISTS idx_customer_health_churn_risk ON customer_health(churn_risk);

-- Índices para support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);

-- Índices para user_feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_feedback_type ON user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_score ON user_feedback(score);

-- Índices para financial_metrics
CREATE INDEX IF NOT EXISTS idx_financial_metrics_user_id ON financial_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_metric_date ON financial_metrics(metric_date);

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar customer_health quando user_sessions é inserida
DELIMITER //
CREATE TRIGGER update_customer_health_on_session
AFTER INSERT ON user_sessions
FOR EACH ROW
BEGIN
    UPDATE customer_health 
    SET last_login_date = NEW.start_time,
        days_since_last_login = 0,
        total_sessions = total_sessions + 1
    WHERE user_id = NEW.user_id;
    
    IF ROW_COUNT() = 0 THEN
        INSERT INTO customer_health (user_id, last_login_date, days_since_last_login, total_sessions)
        VALUES (NEW.user_id, NEW.start_time, 0, 1);
    END IF;
END//

-- Trigger para atualizar customer_health quando feature_usage é inserida
CREATE TRIGGER update_customer_health_on_feature
AFTER INSERT ON feature_usage
FOR EACH ROW
BEGIN
    UPDATE customer_health 
    SET features_used_count = features_used_count + 1
    WHERE user_id = NEW.user_id;
    
    IF ROW_COUNT() = 0 THEN
        INSERT INTO customer_health (user_id, features_used_count)
        VALUES (NEW.user_id, 1);
    END IF;
END//

-- Trigger para atualizar customer_health quando support_tickets é inserida
CREATE TRIGGER update_customer_health_on_ticket
AFTER INSERT ON support_tickets
FOR EACH ROW
BEGIN
    UPDATE customer_health 
    SET support_tickets_count = support_tickets_count + 1
    WHERE user_id = NEW.user_id;
    
    IF ROW_COUNT() = 0 THEN
        INSERT INTO customer_health (user_id, support_tickets_count)
        VALUES (NEW.user_id, 1);
    END IF;
END//
DELIMITER ;

-- =====================================================
-- VIEWS PARA ANÁLISES COMUNS
-- =====================================================

-- View para DAU (Daily Active Users)
CREATE OR REPLACE VIEW v_daily_active_users AS
SELECT 
    DATE(start_time) as date,
    COUNT(DISTINCT user_id) as active_users
FROM user_sessions
GROUP BY DATE(start_time)
ORDER BY date DESC;

-- View para WAU (Weekly Active Users)
CREATE OR REPLACE VIEW v_weekly_active_users AS
SELECT 
    YEARWEEK(start_time) as week,
    COUNT(DISTINCT user_id) as active_users
FROM user_sessions
GROUP BY YEARWEEK(start_time)
ORDER BY week DESC;

-- View para MAU (Monthly Active Users)
CREATE OR REPLACE VIEW v_monthly_active_users AS
SELECT 
    DATE_FORMAT(start_time, '%Y-%m') as month,
    COUNT(DISTINCT user_id) as active_users
FROM user_sessions
GROUP BY DATE_FORMAT(start_time, '%Y-%m')
ORDER BY month DESC;

-- View para feature adoption
CREATE OR REPLACE VIEW v_feature_adoption AS
SELECT 
    feature_name,
    COUNT(DISTINCT user_id) as users_using,
    COUNT(*) as total_actions,
    AVG(duration_seconds) as avg_duration
FROM feature_usage
GROUP BY feature_name
ORDER BY users_using DESC;

-- View para churn analysis
CREATE OR REPLACE VIEW v_churn_analysis AS
SELECT 
    user_id,
    MAX(last_login_date) as last_activity,
    DATEDIFF(NOW(), MAX(last_login_date)) as days_inactive,
    CASE 
        WHEN DATEDIFF(NOW(), MAX(last_login_date)) > 30 THEN 'churned'
        WHEN DATEDIFF(NOW(), MAX(last_login_date)) > 7 THEN 'at_risk'
        ELSE 'active'
    END as status
FROM customer_health
GROUP BY user_id;

-- View para conversion funnel
CREATE OR REPLACE VIEW v_conversion_funnel AS
SELECT 
    funnel_name,
    step_name,
    step_order,
    COUNT(DISTINCT user_id) as users_entered,
    COUNT(completed_at) as users_completed,
    ROUND(COUNT(completed_at) * 100.0 / COUNT(DISTINCT user_id), 2) as conversion_rate
FROM conversion_funnel
GROUP BY funnel_name, step_name, step_order
ORDER BY funnel_name, step_order; 