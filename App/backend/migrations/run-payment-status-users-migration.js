const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');
const logger = require('../config/logger');

async function runMigration() {
  try {
    // Configurar conexão
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'mariadb',
      user: process.env.DB_USER || 'financas_user',
      password: process.env.DB_PASSWORD || 'financas_pass_2024',
      database: process.env.DB_NAME || 'financas',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    logger.info('💳 Iniciando migração dos campos de status de pagamento na tabela users...');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '011_add_payment_status_to_users.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');

    // Executar SQL
    await connection.query(sqlContent);

    logger.info('✅ Migração dos campos de status de pagamento concluída com sucesso!');
    await connection.end();
    process.exit(0);

  } catch (error) {
    logger.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

runMigration(); 