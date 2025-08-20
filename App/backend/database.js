const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuração da conexão com MariaDB
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'financas',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Criar pool de conexões
const pool = mysql.createPool(dbConfig);

// Função para inicializar o banco de dados
async function initializeDatabase() {
  try {
    // Testar conexão
    const connection = await pool.getConnection();
    console.log('Conectado ao MariaDB com sucesso!');
    connection.release();

    // Verificar se a tabela users existe
    const [tables] = await pool.execute('SHOW TABLES LIKE "users"');
    if (tables.length > 0) {
      console.log('Tabela users encontrada');
    } else {
      console.log('Tabela users não encontrada - usando tabela existente');
    }

  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    throw error;
  }
}

// Função para executar queries
async function query(sql, params) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Erro na query:', error);
    throw error;
  }
}

// Função para executar queries que retornam apenas uma linha
async function queryOne(sql, params) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows[0];
  } catch (error) {
    console.error('Erro na query:', error);
    throw error;
  }
}

// Função para executar queries de inserção/atualização
async function execute(sql, params) {
  try {
    const [result] = await pool.execute(sql, params);
    return result;
  } catch (error) {
    console.error('Erro na execução:', error);
    throw error;
  }
}

// Inicializar banco de dados quando o módulo for carregado
initializeDatabase().catch(console.error);

module.exports = {
  pool,
  query,
  queryOne,
  execute
}; 