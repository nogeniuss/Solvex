const { query } = require('../database');
const NotificationService = require('./NotificationService');

class AlertService {
  constructor() {
    this.thresholds = {
      churn_rate: 0.05, // 5%
      activation_rate: 0.4, // 40%
      response_time: 24, // 24 horas
      nps_score: 30, // NPS mínimo
      health_score: 50, // Score de saúde mínimo
      mrr_growth: -0.1, // -10% de crescimento
      session_duration: 300, // 5 minutos mínimo
      feature_adoption: 0.2 // 20% de adoção mínima
    };
  }

  // Verificar alertas para um usuário específico
  async checkUserAlerts(userId) {
    try {
      const alerts = [];

      // Verificar churn risk
      const churnAlert = await this.checkChurnRisk(userId);
      if (churnAlert) alerts.push(churnAlert);

      // Verificar health score
      const healthAlert = await this.checkHealthScore(userId);
      if (healthAlert) alerts.push(healthAlert);

      // Verificar session duration
      const sessionAlert = await this.checkSessionDuration(userId);
      if (sessionAlert) alerts.push(sessionAlert);

      // Verificar feature adoption
      const adoptionAlert = await this.checkFeatureAdoption(userId);
      if (adoptionAlert) alerts.push(adoptionAlert);

      return alerts;
    } catch (error) {
      console.error('Erro ao verificar alertas do usuário:', error);
      return [];
    }
  }

  // Verificar alertas para toda a base
  async checkGlobalAlerts() {
    try {
      const alerts = [];

      // Verificar churn rate geral
      const churnAlert = await this.checkGlobalChurnRate();
      if (churnAlert) alerts.push(churnAlert);

      // Verificar activation rate
      const activationAlert = await this.checkGlobalActivationRate();
      if (activationAlert) alerts.push(activationAlert);

      // Verificar NPS
      const npsAlert = await this.checkGlobalNPS();
      if (npsAlert) alerts.push(npsAlert);

      // Verificar MRR growth
      const mrrAlert = await this.checkGlobalMRRGrowth();
      if (mrrAlert) alerts.push(mrrAlert);

      return alerts;
    } catch (error) {
      console.error('Erro ao verificar alertas globais:', error);
      return [];
    }
  }

  // Verificar risco de churn individual
  async checkChurnRisk(userId) {
    try {
      const result = await query(`
        SELECT churn_risk, last_login_date, days_since_last_login
        FROM customer_health
        WHERE user_id = ?
      `, [userId]);

      if (result.length === 0) return null;

      const health = result[0];
      
      if (health.churn_risk === 'high' || health.days_since_last_login > 7) {
        return {
          type: 'Risco de Churn',
          severity: 'high',
          user_id: userId,
          message: `Usuário com alto risco de churn. Último login: ${health.days_since_last_login} dias atrás`,
          metric: 'churn_risk',
          value: health.churn_risk,
          threshold: 'high'
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar churn risk:', error);
      return null;
    }
  }

  // Verificar health score
  async checkHealthScore(userId) {
    try {
      const result = await query(`
        SELECT health_score
        FROM customer_health
        WHERE user_id = ?
      `, [userId]);

      if (result.length === 0) return null;

      const healthScore = result[0].health_score;
      
      if (healthScore < this.thresholds.health_score) {
        return {
          type: 'Health Score Baixo',
          severity: 'medium',
          user_id: userId,
          message: `Health score baixo: ${healthScore}/100`,
          metric: 'health_score',
          value: healthScore,
          threshold: this.thresholds.health_score
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar health score:', error);
      return null;
    }
  }

  // Verificar duração de sessão
  async checkSessionDuration(userId) {
    try {
      const result = await query(`
        SELECT AVG(duration_seconds) as avg_duration
        FROM user_sessions
        WHERE user_id = ?
        AND start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `, [userId]);

      if (result.length === 0) return null;

      const avgDuration = result[0].avg_duration;
      
      if (avgDuration && avgDuration < this.thresholds.session_duration) {
        return {
          type: 'Sessões Curtas',
          severity: 'low',
          user_id: userId,
          message: `Duração média de sessão baixa: ${Math.round(avgDuration)}s`,
          metric: 'session_duration',
          value: avgDuration,
          threshold: this.thresholds.session_duration
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar duração de sessão:', error);
      return null;
    }
  }

  // Verificar adoção de features
  async checkFeatureAdoption(userId) {
    try {
      const result = await query(`
        SELECT COUNT(DISTINCT feature_name) as features_used
        FROM feature_usage
        WHERE user_id = ?
        AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `, [userId]);

      if (result.length === 0) return null;

      const featuresUsed = result[0].features_used;
      
      // Assumindo que temos 10 features principais
      const adoptionRate = featuresUsed / 10;
      
      if (adoptionRate < this.thresholds.feature_adoption) {
        return {
          type: 'Baixa Adoção de Funcionalidades',
          severity: 'medium',
          user_id: userId,
          message: `Baixa adoção de features: ${featuresUsed}/10 features utilizadas`,
          metric: 'feature_adoption',
          value: adoptionRate,
          threshold: this.thresholds.feature_adoption
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar adoção de features:', error);
      return null;
    }
  }

  // Verificar churn rate global
  async checkGlobalChurnRate() {
    try {
      const result = await query(`
        SELECT AVG(churn_rate) as avg_churn
        FROM financial_metrics
        WHERE metric_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      if (result.length === 0) return null;

      const avgChurn = result[0].avg_churn;
      
      if (avgChurn > this.thresholds.churn_rate) {
        return {
          type: 'Churn Rate Alto',
          severity: 'high',
          message: `Churn rate alto: ${(avgChurn * 100).toFixed(2)}%`,
          metric: 'churn_rate',
          value: avgChurn,
          threshold: this.thresholds.churn_rate
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar churn rate global:', error);
      return null;
    }
  }

  // Verificar activation rate global
  async checkGlobalActivationRate() {
    try {
      const result = await query(`
        SELECT 
          COUNT(DISTINCT CASE WHEN conversion_type = 'activation' THEN user_id END) * 100.0 / 
          COUNT(DISTINCT CASE WHEN conversion_type = 'signup' THEN user_id END) as activation_rate
        FROM user_conversions
        WHERE conversion_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      if (result.length === 0) return null;

      const activationRate = result[0].activation_rate;
      
      if (activationRate < this.thresholds.activation_rate * 100) {
        return {
          type: 'Activation Rate Baixo',
          severity: 'medium',
          message: `Activation rate baixo: ${activationRate.toFixed(2)}%`,
          metric: 'activation_rate',
          value: activationRate,
          threshold: this.thresholds.activation_rate * 100
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar activation rate global:', error);
      return null;
    }
  }

  // Verificar NPS global
  async checkGlobalNPS() {
    try {
      const result = await query(`
        SELECT AVG(score) as avg_nps
        FROM user_feedback
        WHERE feedback_type = 'nps'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      if (result.length === 0) return null;

      const avgNPSRaw = result[0].avg_nps;
      const avgNPS = typeof avgNPSRaw === 'number' ? avgNPSRaw : (avgNPSRaw ? parseFloat(avgNPSRaw) : null);
      if (avgNPS === null || Number.isNaN(avgNPS)) return null;
      
      if (avgNPS < this.thresholds.nps_score) {
        return {
          type: 'NPS Baixo',
          severity: 'medium',
          message: `NPS baixo: ${avgNPS.toFixed(1)}`,
          metric: 'nps',
          value: avgNPS,
          threshold: this.thresholds.nps_score
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar NPS global:', error);
      return null;
    }
  }

  // Verificar crescimento do MRR
  async checkGlobalMRRGrowth() {
    try {
      const result = await query(`
        SELECT 
          (current_mrr - previous_mrr) / previous_mrr as mrr_growth
        FROM (
          SELECT 
            SUM(CASE WHEN metric_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN mrr ELSE 0 END) as current_mrr,
            SUM(CASE WHEN metric_date >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND metric_date < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN mrr ELSE 0 END) as previous_mrr
          FROM financial_metrics
        ) as mrr_data
        WHERE previous_mrr > 0
      `);

      if (result.length === 0) return null;

      const mrrGrowth = result[0].mrr_growth;
      
      if (mrrGrowth < this.thresholds.mrr_growth) {
        return {
          type: 'Crescimento do MRR Negativo',
          severity: 'high',
          message: `Crescimento do MRR negativo: ${(mrrGrowth * 100).toFixed(2)}%`,
          metric: 'mrr_growth',
          value: mrrGrowth,
          threshold: this.thresholds.mrr_growth
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao verificar crescimento do MRR:', error);
      return null;
    }
  }

  // Enviar notificação de alerta (persiste em `notificacoes`)
  async sendAlert(alert) {
    try {
      const notificationService = new NotificationService();

      // Se não houver usuário associado, apenas logar e não persistir (coluna user_id é NOT NULL)
      if (!alert.user_id) {
        console.log(`Alerta global: ${alert.type} - ${alert.message}`);
        return;
      }

      await notificationService.createNotification({
        user_id: alert.user_id,
        titulo: `Alerta: ${alert.type}`,
        mensagem: alert.message,
        tipo: 'sistema',
        canal: 'email'
      });

      // Também criar notificação SMS se configurado
      if (process.env.VONAGE_API_KEY || process.env.TWILIO_ACCOUNT_SID) {
        await notificationService.createNotification({
          user_id: alert.user_id,
          titulo: `Alerta: ${alert.type}`,
          mensagem: alert.message,
          tipo: 'sistema',
          canal: 'sms'
        });
      }
      console.log(`Alerta registrado: ${alert.type} - ${alert.message}`);
    } catch (error) {
      console.error('Erro ao enviar alerta:', error);
    }
  }

  // Executar verificação de alertas
  async runAlertCheck() {
    try {
      console.log('🔔 Executando verificação de alertas...');

      // Verificar alertas globais
      const globalAlerts = await this.checkGlobalAlerts();
      for (const alert of globalAlerts) {
        await this.sendAlert(alert);
      }

      // Verificar alertas individuais para usuários ativos
      const activeUsers = await query(`
        SELECT DISTINCT user_id
        FROM user_sessions
        WHERE start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);

      for (const user of activeUsers) {
        const userAlerts = await this.checkUserAlerts(user.user_id);
        for (const alert of userAlerts) {
          await this.sendAlert(alert);
        }
      }

      console.log(`✅ Verificação de alertas concluída. ${globalAlerts.length} alertas globais registrados.`);
    } catch (error) {
      console.error('❌ Erro na verificação de alertas:', error);
    }
  }
}

module.exports = AlertService; 