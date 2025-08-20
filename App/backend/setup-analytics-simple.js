const fs = require('fs');
const path = require('path');
const { query } = require('./database');

async function setupAnalyticsSimple() {
  try {
    console.log('🚀 Configurando banco de dados de Analytics (versão simplificada)...');
    
    // Criar tabelas principais
    const tables = [
      `CREATE TABLE IF NOT EXISTS user_sessions (
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
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_id VARCHAR(255),
        event_type VARCHAR(100) NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        event_data JSON,
        page_url VARCHAR(500),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS feature_usage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        feature_name VARCHAR(100) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        duration_seconds INT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_conversions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        conversion_type VARCHAR(50) NOT NULL,
        plan_name VARCHAR(100),
        plan_value DECIMAL(10,2),
        payment_method VARCHAR(50),
        conversion_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        trial_days INT NULL,
        source VARCHAR(100),
        campaign VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS customer_health (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        health_score INT DEFAULT 50,
        last_login_date DATETIME NULL,
        days_since_last_login INT NULL,
        total_sessions INT DEFAULT 0,
        avg_session_duration INT NULL,
        features_used_count INT DEFAULT 0,
        support_tickets_count INT DEFAULT 0,
        nps_score INT NULL,
        csat_score INT NULL,
        churn_risk VARCHAR(20) DEFAULT 'low',
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS support_tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        ticket_number VARCHAR(50) UNIQUE NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'open',
        category VARCHAR(100),
        assigned_to VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME NULL,
        resolution_time_hours INT NULL,
        satisfaction_score INT NULL,
        feedback TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        feedback_type VARCHAR(50) NOT NULL,
        score INT NULL,
        comment TEXT,
        feature_name VARCHAR(100),
        page_url VARCHAR(500),
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS financial_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        metric_date DATE NOT NULL,
        mrr DECIMAL(10,2) DEFAULT 0,
        arr DECIMAL(10,2) DEFAULT 0,
        ltv DECIMAL(10,2) DEFAULT 0,
        cac DECIMAL(10,2) DEFAULT 0,
        churn_rate DECIMAL(5,4) DEFAULT 0,
        expansion_revenue DECIMAL(10,2) DEFAULT 0,
        downgrade_revenue DECIMAL(10,2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS conversion_funnel (
        id INT AUTO_INCREMENT PRIMARY KEY,
        funnel_name VARCHAR(100) NOT NULL,
        step_name VARCHAR(100) NOT NULL,
        step_order INT NOT NULL,
        user_id INT NULL,
        session_id VARCHAR(255),
        entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        abandoned_at DATETIME NULL,
        time_to_complete_seconds INT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_barriers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        session_id VARCHAR(255),
        barrier_type VARCHAR(50) NOT NULL,
        page_url VARCHAR(500),
        error_message TEXT,
        error_code VARCHAR(100),
        user_action TEXT,
        resolved BOOLEAN DEFAULT FALSE,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    
    console.log(`📝 Criando ${tables.length} tabelas...`);
    
    for (let i = 0; i < tables.length; i++) {
      try {
        await query(tables[i]);
        console.log(`✅ Tabela ${i + 1}/${tables.length} criada com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao criar tabela ${i + 1}:`, error.message);
      }
    }
    
    console.log('🎉 Tabelas de Analytics criadas com sucesso!');
    
    // Inserir dados de exemplo
    await insertSampleData();
    
  } catch (error) {
    console.error('❌ Erro ao configurar analytics:', error);
  }
}

async function insertSampleData() {
  try {
    console.log('📊 Inserindo dados de exemplo...');
    
    // Verificar se já existem dados
    const existingData = await query('SELECT COUNT(*) as count FROM user_sessions');
    if (existingData[0].count > 0) {
      console.log('ℹ️ Dados já existem, pulando inserção de exemplo');
      return;
    }
    
    // Buscar usuários existentes
    const users = await query('SELECT id FROM users LIMIT 5');
    if (users.length === 0) {
      console.log('⚠️ Nenhum usuário encontrado, criando dados de exemplo...');
      return;
    }
    
    const userId = users[0].id;
    const now = new Date();
    
    // Inserir sessões de exemplo
    for (let i = 0; i < 30; i++) {
      const sessionDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const sessionId = `session_${i}_${Date.now()}`;
      
      await query(`
        INSERT INTO user_sessions (
          user_id, session_id, start_time, end_time, duration_seconds,
          ip_address, user_agent, device_type, browser, os
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, sessionId, sessionDate.toISOString().slice(0, 19).replace('T', ' '),
        new Date(sessionDate.getTime() + 30 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
        1800, '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'desktop', 'chrome', 'windows'
      ]);
      
      // Inserir eventos de exemplo
      const events = [
        { type: 'page_view', name: 'dashboard_view' },
        { type: 'feature_usage', name: 'expense_create' },
        { type: 'feature_usage', name: 'report_generate' },
        { type: 'page_view', name: 'analytics_view' }
      ];
      
      for (const event of events) {
        await query(`
          INSERT INTO user_events (
            user_id, session_id, event_type, event_name, event_data, page_url
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          userId, sessionId, event.type, event.name,
          JSON.stringify({ sample: true }), '/dashboard'
        ]);
      }
      
      // Inserir feature usage
      const features = ['dashboard', 'expenses', 'reports', 'analytics'];
      for (const feature of features) {
        await query(`
          INSERT INTO feature_usage (
            user_id, feature_name, action_type, duration_seconds
          ) VALUES (?, ?, ?, ?)
        `, [userId, feature, 'view', Math.floor(Math.random() * 300) + 60]);
      }
    }
    
    // Inserir conversões de exemplo
    await query(`
      INSERT INTO user_conversions (
        user_id, conversion_type, plan_name, plan_value, payment_method
      ) VALUES (?, ?, ?, ?, ?)
    `, [userId, 'signup', 'free', 0, 'none']);
    
    await query(`
      INSERT INTO user_conversions (
        user_id, conversion_type, plan_name, plan_value, payment_method
      ) VALUES (?, ?, ?, ?, ?)
    `, [userId, 'activation', 'free', 0, 'none']);
    
    // Inserir feedback de exemplo
    await query(`
      INSERT INTO user_feedback (
        user_id, feedback_type, score, comment
      ) VALUES (?, ?, ?, ?)
    `, [userId, 'nps', 8, 'Sistema muito útil!']);
    
    // Inserir métricas financeiras de exemplo
    for (let i = 0; i < 12; i++) {
      const metricDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      await query(`
        INSERT INTO financial_metrics (
          user_id, metric_date, mrr, arr, ltv, cac, churn_rate
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, metricDate.toISOString().split('T')[0],
        100 + (i * 10), 1200 + (i * 120), 5000 + (i * 500),
        200 + (i * 5), 0.05 - (i * 0.001)
      ]);
    }
    
    // Inserir customer health
    await query(`
      INSERT INTO customer_health (
        user_id, health_score, last_login_date, total_sessions,
        features_used_count, nps_score
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, 75, now.toISOString().slice(0, 19).replace('T', ' '), 30, 15, 8]);
    
    console.log('✅ Dados de exemplo inseridos com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao inserir dados de exemplo:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupAnalyticsSimple().then(() => {
    console.log('🎯 Setup de Analytics simplificado concluído!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Erro no setup:', error);
    process.exit(1);
  });
}

module.exports = { setupAnalyticsSimple }; 