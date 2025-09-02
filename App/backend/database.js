const mysql = require('mysql2/promise');
const logger = require('./config/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mariadb',
  user: process.env.DB_USER || 'financas_user',
  password: process.env.DB_PASSWORD || 'financas_pass_2024',
  database: process.env.DB_NAME || 'financas',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 10000,
  acquireTimeout: 10000,
  timeout: 10000
});

// Função para tentar conexão com retry
async function connectWithRetry(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      logger.info('✅ Conectado ao MariaDB com sucesso!');
      connection.release();
      return;
    } catch (err) {
      if (i === retries - 1) {
        logger.error('❌ Erro ao conectar ao MariaDB:', err);
        process.exit(1);
      }
      logger.warn(`⚠️ Tentativa ${i + 1} de ${retries} falhou, tentando novamente em ${delay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Funções auxiliares para queries
async function query(sql, params) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(sql, params);
    return rows;
  } finally {
    connection.release();
  }
}

async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0];
}

async function execute(sql, params) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(sql, params);
    return result;
  } finally {
    connection.release();
  }
}

// Iniciar conexão com retry
connectWithRetry();

module.exports = {
  pool,
  query,
  queryOne,
  execute,
  getConnection: () => pool.getConnection()
}; 