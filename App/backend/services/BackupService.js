const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDirectory();
  }

  // Garantir que o diretório de backup existe
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Criar backup completo do banco de dados
  async createBackup(options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = options.name || `backup-${timestamp}`;
      const backupFile = path.join(this.backupDir, `${backupName}.sql`);

      // Configurações do banco
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbUser = process.env.DB_USER || 'root';
      const dbPassword = process.env.DB_PASSWORD || '';
      const dbName = process.env.DB_NAME || 'financas';

      // Comando mysqldump
      let command = `mysqldump -h ${dbHost} -u ${dbUser}`;
      
      if (dbPassword) {
        command += ` -p${dbPassword}`;
      }

      // Opções adicionais
      if (options.structureOnly) {
        command += ' --no-data';
      } else if (options.dataOnly) {
        command += ' --no-create-info';
      }

      if (options.compress) {
        command += ' --compress';
      }

      command += ` ${dbName} > ${backupFile}`;

      console.log('🔄 Criando backup...');
      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('Warning')) {
        throw new Error(`Erro no mysqldump: ${stderr}`);
      }

      // Comprimir se solicitado
      if (options.compress) {
        await this.compressFile(backupFile);
      }

      const stats = fs.statSync(backupFile);
      const fileSize = (stats.size / 1024 / 1024).toFixed(2); // MB

      console.log(`✅ Backup criado com sucesso: ${backupFile} (${fileSize} MB)`);

      return {
        success: true,
        file: backupFile,
        size: fileSize,
        timestamp: new Date().toISOString(),
        name: backupName
      };
    } catch (error) {
      console.error('❌ Erro ao criar backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Restaurar backup
  async restoreBackup(backupFile, options = {}) {
    try {
      if (!fs.existsSync(backupFile)) {
        throw new Error('Arquivo de backup não encontrado');
      }

      // Configurações do banco
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbUser = process.env.DB_USER || 'root';
      const dbPassword = process.env.DB_PASSWORD || '';
      const dbName = process.env.DB_NAME || 'financas';

      // Verificar se o arquivo está comprimido
      let fileToRestore = backupFile;
      if (backupFile.endsWith('.gz')) {
        fileToRestore = await this.decompressFile(backupFile);
      }

      // Comando mysql para restaurar
      let command = `mysql -h ${dbHost} -u ${dbUser}`;
      
      if (dbPassword) {
        command += ` -p${dbPassword}`;
      }

      command += ` ${dbName} < ${fileToRestore}`;

      console.log('🔄 Restaurando backup...');
      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('Warning')) {
        throw new Error(`Erro na restauração: ${stderr}`);
      }

      console.log('✅ Backup restaurado com sucesso');

      return {
        success: true,
        message: 'Backup restaurado com sucesso',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao restaurar backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Comprimir arquivo
  async compressFile(filePath) {
    try {
      const command = `gzip ${filePath}`;
      await execAsync(command);
      console.log(`✅ Arquivo comprimido: ${filePath}.gz`);
      return `${filePath}.gz`;
    } catch (error) {
      console.error('❌ Erro ao comprimir arquivo:', error);
      throw error;
    }
  }

  // Descomprimir arquivo
  async decompressFile(filePath) {
    try {
      const outputPath = filePath.replace('.gz', '');
      const command = `gunzip -c ${filePath} > ${outputPath}`;
      await execAsync(command);
      console.log(`✅ Arquivo descomprimido: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('❌ Erro ao descomprimir arquivo:', error);
      throw error;
    }
  }

  // Listar backups disponíveis
  async listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.sql') || file.endsWith('.sql.gz')) {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          
          backups.push({
            name: file,
            path: filePath,
            size: (stats.size / 1024 / 1024).toFixed(2), // MB
            created: stats.birthtime,
            modified: stats.mtime,
            compressed: file.endsWith('.gz')
          });
        }
      }

      // Ordenar por data de criação (mais recente primeiro)
      backups.sort((a, b) => b.created - a.created);

      return {
        success: true,
        backups
      };
    } catch (error) {
      console.error('❌ Erro ao listar backups:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Deletar backup
  async deleteBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup não encontrado');
      }

      fs.unlinkSync(backupPath);
      console.log(`✅ Backup deletado: ${backupName}`);

      return {
        success: true,
        message: 'Backup deletado com sucesso'
      };
    } catch (error) {
      console.error('❌ Erro ao deletar backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Criar backup automático
  async createAutomaticBackup() {
    const timestamp = new Date().toISOString().split('T')[0];
    const backupName = `auto-backup-${timestamp}`;
    
    return await this.createBackup({
      name: backupName,
      compress: true
    });
  }

  // Limpar backups antigos
  async cleanupOldBackups(daysToKeep = 30) {
    try {
      const backups = await this.listBackups();
      
      if (!backups.success) {
        throw new Error(backups.error);
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let deletedCount = 0;
      for (const backup of backups.backups) {
        if (backup.created < cutoffDate) {
          await this.deleteBackup(backup.name);
          deletedCount++;
        }
      }

      console.log(`✅ Limpeza concluída: ${deletedCount} backups antigos removidos`);

      return {
        success: true,
        deletedCount,
        message: `${deletedCount} backups antigos removidos`
      };
    } catch (error) {
      console.error('❌ Erro na limpeza de backups:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Exportar dados específicos
  async exportData(tables = [], options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportName = options.name || `export-${timestamp}`;
      const exportFile = path.join(this.backupDir, `${exportName}.sql`);

      // Configurações do banco
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbUser = process.env.DB_USER || 'root';
      const dbPassword = process.env.DB_PASSWORD || '';
      const dbName = process.env.DB_NAME || 'financas';

      // Se não especificou tabelas, exportar todas
      const tablesToExport = tables.length > 0 ? tables.join(' ') : '';

      let command = `mysqldump -h ${dbHost} -u ${dbUser}`;
      
      if (dbPassword) {
        command += ` -p${dbPassword}`;
      }

      if (options.structureOnly) {
        command += ' --no-data';
      } else if (options.dataOnly) {
        command += ' --no-create-info';
      }

      command += ` ${dbName} ${tablesToExport} > ${exportFile}`;

      console.log('🔄 Exportando dados...');
      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('Warning')) {
        throw new Error(`Erro na exportação: ${stderr}`);
      }

      const stats = fs.statSync(exportFile);
      const fileSize = (stats.size / 1024 / 1024).toFixed(2); // MB

      console.log(`✅ Exportação concluída: ${exportFile} (${fileSize} MB)`);

      return {
        success: true,
        file: exportFile,
        size: fileSize,
        timestamp: new Date().toISOString(),
        name: exportName,
        tables: tables.length > 0 ? tables : 'todas'
      };
    } catch (error) {
      console.error('❌ Erro na exportação:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verificar integridade do backup
  async verifyBackup(backupFile) {
    try {
      if (!fs.existsSync(backupFile)) {
        throw new Error('Arquivo de backup não encontrado');
      }

      // Verificar se o arquivo não está corrompido
      const stats = fs.statSync(backupFile);
      if (stats.size === 0) {
        throw new Error('Arquivo de backup está vazio');
      }

      // Tentar ler o arquivo para verificar sintaxe
      const content = fs.readFileSync(backupFile, 'utf8');
      
      // Verificar se contém comandos SQL válidos
      const hasValidSQL = content.includes('CREATE TABLE') || content.includes('INSERT INTO');
      
      if (!hasValidSQL) {
        throw new Error('Arquivo não contém comandos SQL válidos');
      }

      return {
        success: true,
        message: 'Backup verificado com sucesso',
        size: (stats.size / 1024 / 1024).toFixed(2), // MB
        valid: true
      };
    } catch (error) {
      console.error('❌ Erro na verificação do backup:', error);
      return {
        success: false,
        error: error.message,
        valid: false
      };
    }
  }
}

module.exports = BackupService; 