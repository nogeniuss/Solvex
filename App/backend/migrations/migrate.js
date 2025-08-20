#!/usr/bin/env node

const SimpleMigrationRunner = require('./migration-runner-simple');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';

  const runner = new SimpleMigrationRunner();

  try {
    switch (command) {
      case 'run':
        console.log('🚀 Iniciando execução de migrations...');
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
        console.log('📊 Verificando status das migrations...');
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

      default:
        console.error(`❌ Comando desconhecido: ${command}`);
        console.log('Comandos disponíveis: run, status');
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error.message);
    process.exit(1);
  }
}

main().then(() => {
  console.log('\n🏁 Processo finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
}); 