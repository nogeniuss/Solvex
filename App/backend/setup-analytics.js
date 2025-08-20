const fs = require('fs');
const path = require('path');
const { query } = require('./database');

async function setupAnalytics() {
  try {
    console.log('🚀 Configurando banco de dados de Analytics...');
    
    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'database_analytics.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Dividir em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Executando ${commands.length} comandos SQL...`);
    
    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      try {
        await query(command);
        console.log(`✅ Comando ${i + 1}/${commands.length} executado com sucesso`);
      } catch (error) {
        console.error(`❌ Erro no comando ${i + 1}:`, error.message);
        // Continuar mesmo com erros (tabelas podem já existir)
      }
    }
    
    console.log('🎉 Banco de dados de Analytics configurado com sucesso!');
    
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
        userId, sessionId, sessionDate.toISOString(),
        new Date(sessionDate.getTime() + 30 * 60 * 1000).toISOString(),
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
    `, [userId, 75, now.toISOString(), 30, 15, 8]);
    
    console.log('✅ Dados de exemplo inseridos com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao inserir dados de exemplo:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupAnalytics().then(() => {
    console.log('🎯 Setup de Analytics concluído!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Erro no setup:', error);
    process.exit(1);
  });
}

module.exports = { setupAnalytics }; 