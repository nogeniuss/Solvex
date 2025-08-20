#!/usr/bin/env node

const MigrationRunner = require('./migration-runner');
const logger = require('../config/logger');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';
  const migrationName = args[1];

  const runner = new MigrationRunner();

  try {
    switch (command) {
      case 'run':
        logger.info('🚀 Iniciando execução de migrations...');
        const result = await runner.runPendingMigrations();
        
        if (result.executed === 0) {
          console.log('✅ Nenhuma migration pendente encontrada');
        } else {
          console.log(`✅ ${result.executed} migrations executadas com sucesso:`);
          result.migrations.forEach(migration => {
            console.log(`   - ${migration}`);
          });
        }
        break;

      case 'status':
        logger.info('📊 Verificando status das migrations...');
        const status = await runner.getMigrationStatus();
        
        console.log('\n📋 Status das Migrations:');
        console.log(`   Total: ${status.total}`);
        console.log(`   Executadas: ${status.executed}`);
        console.log(`   Pendentes: ${status.pending}\n`);
        
        status.migrations.forEach(migration => {
          const icon = migration.executed ? '✅' : '⏳';
          const statusText = migration.executed ? 'Executada' : 'Pendente';
          console.log(`   ${icon} ${migration.name} - ${statusText}`);
        });
        break;

      case 'run-specific':
        if (!migrationName) {
          console.error('❌ Nome da migration é obrigatório para o comando run-specific');
          console.log('Uso: node run-migrations.js run-specific <nome-da-migration>');
          process.exit(1);
        }
        
        logger.info(`🎯 Executando migration específica: ${migrationName}`);
        const specificResult = await runner.runSpecificMigration(migrationName);
        console.log(`✅ Migration ${migrationName} executada com sucesso`);
        break;

      case 'help':
      case '--help':
      case '-h':
        console.log(`
🛠️  Migration Runner - Sistema de Finanças

Comandos disponíveis:
  run              Executa todas as migrations pendentes (padrão)
  status           Mostra status de todas as migrations
  run-specific     Executa uma migration específica
  help             Mostra esta ajuda

Exemplos:
  node run-migrations.js
  node run-migrations.js run
  node run-migrations.js status
  node run-migrations.js run-specific 001_create_subscription_plans.sql

📁 Migrations são arquivos .sql na pasta migrations/
📊 Status das execuções é salvo na tabela 'migrations'
        `);
        break;

      default:
        console.error(`❌ Comando desconhecido: ${command}`);
        console.log('Use "node run-migrations.js help" para ver comandos disponíveis');
        process.exit(1);
    }

  } catch (error) {
    logger.error('❌ Erro ao executar migrations:', error);
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().then(() => {
    console.log('\n🏁 Processo finalizado');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { MigrationRunner }; 