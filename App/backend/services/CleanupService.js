const db = require('../database');
const logger = require('../config/logger');

class CleanupService {
  /**
   * Limpar apenas usuários que nunca fizeram pagamento
   */
  async cleanupUnpaidUsers() {
    let connection;
    try {
      connection = await db.getConnection();

      // Encontrar usuários para limpar:
      // - Status de pagamento pendente/processando/falhou
      // - Última tentativa > 24 horas
      // - NUNCA tiveram um pagamento bem sucedido
      const [users] = await connection.query(`
        SELECT u.id, u.email 
        FROM users u
        LEFT JOIN payment_history ph ON u.id = ph.user_id AND ph.status = 'succeeded'
        WHERE 
          u.payment_status IN ('pending', 'processing', 'failed')
          AND u.last_payment_attempt < DATE_SUB(NOW(), INTERVAL 24 HOUR)
          AND ph.id IS NULL
      `);

      if (users && users.length > 0) {
        logger.info(`Encontrados ${users.length} usuários novos sem pagamento para limpar`);

        // Deletar apenas usuários que nunca pagaram
        await connection.query(`
          DELETE u FROM users u
          LEFT JOIN payment_history ph ON u.id = ph.user_id AND ph.status = 'succeeded'
          WHERE 
            u.payment_status IN ('pending', 'processing', 'failed')
            AND u.last_payment_attempt < DATE_SUB(NOW(), INTERVAL 24 HOUR)
            AND ph.id IS NULL
        `);

        logger.info('Limpeza de usuários sem pagamento concluída com sucesso');
      }
    } catch (error) {
      logger.error('Erro ao limpar usuários:', error);
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * Iniciar limpeza automática
   */
  startAutomaticCleanup() {
    // Executar limpeza a cada 6 horas
    setInterval(() => {
      this.cleanupUnpaidUsers();
    }, 6 * 60 * 60 * 1000); // 6 horas

    // Executar primeira limpeza após 5 minutos
    setTimeout(() => {
      this.cleanupUnpaidUsers();
    }, 5 * 60 * 1000); // 5 minutos
  }
}

// Singleton instance
let instance = null;

module.exports = (() => {
  if (!instance) {
    instance = new CleanupService();
  }
  return instance;
})(); 