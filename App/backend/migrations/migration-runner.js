const fs = require('fs');
const path = require('path');
const { query } = require('../database');
const logger = require('../config/logger');

class MigrationRunner {
  constructor() {
    this.migrationsPath = __dirname;
    this.migrationsTable = 'migrations';
  }

  /**
   * Inicializar tabela de migrations
   */
  async initMigrationsTable() {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
          id INT AUTO_INCREMENT PRIMARY KEY,
          migration_name VARCHAR(255) NOT NULL UNIQUE,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_migration_name (migration_name)
        )
      `);
      logger.info('Tabela de migrations inicializada');
    } catch (error) {
      logger.error('Erro ao criar tabela de migrations:', error);
      throw error;
    }
  }

  /**
   * Obter migrations executadas
   */
  async getExecutedMigrations() {
    try {
      const result = await query(`SELECT migration_name FROM ${this.migrationsTable} ORDER BY executed_at`);
      return result.map(row => row.migration_name);
    } catch (error) {
      logger.error('Erro ao buscar migrations executadas:', error);
      return [];
    }
  }

  /**
   * Obter arquivos de migration
   */
  getMigrationFiles() {
    try {
      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql') && file !== 'migration-runner.js')
        .sort();
      return files;
    } catch (error) {
      logger.error('Erro ao ler arquivos de migration:', error);
      return [];
    }
  }

  /**
   * Executar migration específica
   */
  async executeMigration(migrationFile) {
    try {
      const migrationPath = path.join(this.migrationsPath, migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Dividir por statements (separados por ';')
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      logger.info(`Executando migration: ${migrationFile}`);
      
      for (const statement of statements) {
        if (statement.trim()) {
          await query(statement);
        }
      }

      // Registrar migration como executada
      await query(
        `INSERT INTO ${this.migrationsTable} (migration_name) VALUES (?)`,
        [migrationFile]
      );

      logger.info(`Migration ${migrationFile} executada com sucesso`);
      return true;

    } catch (error) {
      logger.error(`Erro ao executar migration ${migrationFile}:`, error);
      throw error;
    }
  }

  /**
   * Executar todas as migrations pendentes
   */
  async runPendingMigrations() {
    try {
      await this.initMigrationsTable();

      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = this.getMigrationFiles();
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );

      if (pendingMigrations.length === 0) {
        logger.info('Nenhuma migration pendente encontrada');
        return { executed: 0, migrations: [] };
      }

      logger.info(`Encontradas ${pendingMigrations.length} migrations pendentes`);

      const executedMigrationsList = [];
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
        executedMigrationsList.push(migration);
      }

      logger.info(`${executedMigrationsList.length} migrations executadas com sucesso`);
      
      return {
        executed: executedMigrationsList.length,
        migrations: executedMigrationsList
      };

    } catch (error) {
      logger.error('Erro ao executar migrations:', error);
      throw error;
    }
  }

  /**
   * Listar status das migrations
   */
  async getMigrationStatus() {
    try {
      await this.initMigrationsTable();

      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = this.getMigrationFiles();

      const status = migrationFiles.map(file => ({
        name: file,
        executed: executedMigrations.includes(file),
        pending: !executedMigrations.includes(file)
      }));

      return {
        total: migrationFiles.length,
        executed: executedMigrations.length,
        pending: migrationFiles.length - executedMigrations.length,
        migrations: status
      };

    } catch (error) {
      logger.error('Erro ao obter status das migrations:', error);
      throw error;
    }
  }

  /**
   * Executar migration específica pelo nome
   */
  async runSpecificMigration(migrationName) {
    try {
      await this.initMigrationsTable();

      const executedMigrations = await this.getExecutedMigrations();
      
      if (executedMigrations.includes(migrationName)) {
        throw new Error(`Migration ${migrationName} já foi executada`);
      }

      const migrationFiles = this.getMigrationFiles();
      if (!migrationFiles.includes(migrationName)) {
        throw new Error(`Migration ${migrationName} não encontrada`);
      }

      await this.executeMigration(migrationName);
      
      return {
        executed: 1,
        migrations: [migrationName]
      };

    } catch (error) {
      logger.error(`Erro ao executar migration específica ${migrationName}:`, error);
      throw error;
    }
  }
}

module.exports = MigrationRunner; 