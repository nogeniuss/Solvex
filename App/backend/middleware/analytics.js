const { query } = require('../database');
const { v4: uuidv4 } = require('uuid');

// Middleware para capturar sessões
const captureSession = async (req, res, next) => {
  try {
    if (req.user) {
      const sessionId = uuidv4();
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      // Detectar dispositivo e browser
      const deviceInfo = parseUserAgent(userAgent);
      
      // Inserir sessão
      await query(`
        INSERT INTO user_sessions (
          user_id, session_id, start_time, ip_address, 
          user_agent, device_type, browser, os
        ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)
      `, [
        req.user.id, sessionId, ipAddress, userAgent,
        deviceInfo.deviceType, deviceInfo.browser, deviceInfo.os
      ]);
      
      // Adicionar session_id ao req para uso posterior
      req.sessionId = sessionId;
    }
  } catch (error) {
    console.error('Erro ao capturar sessão:', error);
  }
  
  next();
};

// Middleware para capturar eventos
const captureEvent = (eventType, eventName) => {
  return async (req, res, next) => {
    try {
      if (req.user && req.sessionId) {
        const eventData = {
          method: req.method,
          url: req.originalUrl,
          params: req.params,
          query: req.query,
          body: req.body,
          timestamp: new Date().toISOString()
        };
        
        await query(`
          INSERT INTO user_events (
            user_id, session_id, event_type, event_name, 
            event_data, page_url, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          req.user.id, req.sessionId, eventType, eventName,
          JSON.stringify(eventData), req.originalUrl
        ]);
      }
    } catch (error) {
      console.error('Erro ao capturar evento:', error);
    }
    
    next();
  };
};

// Middleware para capturar feature usage
const captureFeatureUsage = (featureName, actionType) => {
  return async (req, res, next) => {
    try {
      if (req.user) {
        const startTime = Date.now();
        
        // Capturar início do uso
        await query(`
          INSERT INTO feature_usage (
            user_id, feature_name, action_type, timestamp
          ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `, [req.user.id, featureName, actionType]);
        
        // Interceptar resposta para calcular duração
        const originalSend = res.send;
        res.send = function(data) {
          const duration = Math.floor((Date.now() - startTime) / 1000);
          
          // Atualizar duração
          query(`
            UPDATE feature_usage 
            SET duration_seconds = ?
            WHERE user_id = ? AND feature_name = ? AND action_type = ?
            AND timestamp = (
              SELECT MAX(timestamp) 
              FROM feature_usage 
              WHERE user_id = ? AND feature_name = ? AND action_type = ?
            )
          `, [duration, req.user.id, featureName, actionType, req.user.id, featureName, actionType]);
          
          originalSend.call(this, data);
        };
      }
    } catch (error) {
      console.error('Erro ao capturar feature usage:', error);
    }
    
    next();
  };
};

// Middleware para capturar barreiras/erros
const captureBarriers = () => {
  return async (req, res, next) => {
    try {
      if (req.user) {
        // Interceptar erros
        const originalSend = res.send;
        res.send = function(data) {
          if (res.statusCode >= 400) {
            query(`
              INSERT INTO user_barriers (
                user_id, session_id, barrier_type, page_url,
                error_message, error_code, user_action, timestamp
              ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
              req.user.id, req.sessionId || null, 'error',
              req.originalUrl, data.message || 'Erro desconhecido',
              res.statusCode.toString(), JSON.stringify(req.body)
            ]);
          }
          originalSend.call(this, data);
        };
      }
    } catch (error) {
      console.error('Erro ao capturar barreiras:', error);
    }
    
    next();
  };
};

// Middleware para finalizar sessão
const endSession = async (req, res, next) => {
  try {
    if (req.user && req.sessionId) {
      const endTime = new Date();
      
      await query(`
        UPDATE user_sessions 
        SET end_time = ?, duration_seconds = ?
        WHERE session_id = ?
      `, [
        endTime.toISOString(),
        Math.floor((endTime - new Date(req.sessionStartTime)) / 1000),
        req.sessionId
      ]);
    }
  } catch (error) {
    console.error('Erro ao finalizar sessão:', error);
  }
  
  next();
};

// Função para analisar user agent
function parseUserAgent(userAgent) {
  const ua = userAgent.toLowerCase();
  
  let deviceType = 'desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceType = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'tablet';
  }
  
  let browser = 'unknown';
  if (ua.includes('chrome')) browser = 'chrome';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('safari')) browser = 'safari';
  else if (ua.includes('edge')) browser = 'edge';
  
  let os = 'unknown';
  if (ua.includes('windows')) os = 'windows';
  else if (ua.includes('mac')) os = 'macos';
  else if (ua.includes('linux')) os = 'linux';
  else if (ua.includes('android')) os = 'android';
  else if (ua.includes('ios')) os = 'ios';
  
  return { deviceType, browser, os };
}

// Função para capturar conversões
const captureConversion = async (userId, conversionType, data = {}) => {
  try {
    await query(`
      INSERT INTO user_conversions (
        user_id, conversion_type, plan_name, plan_value,
        payment_method, trial_days, source, campaign
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, conversionType, data.planName, data.planValue,
      data.paymentMethod, data.trialDays, data.source, data.campaign
    ]);
  } catch (error) {
    console.error('Erro ao capturar conversão:', error);
  }
};

// Função para capturar feedback
const captureFeedback = async (userId, feedbackType, score, comment = '', featureName = '') => {
  try {
    await query(`
      INSERT INTO user_feedback (
        user_id, feedback_type, score, comment, feature_name
      ) VALUES (?, ?, ?, ?, ?)
    `, [userId, feedbackType, score, comment, featureName]);
  } catch (error) {
    console.error('Erro ao capturar feedback:', error);
  }
};

// Função para capturar funnel
const captureFunnelStep = async (userId, sessionId, funnelName, stepName, stepOrder, completed = false) => {
  try {
    await query(`
      INSERT INTO conversion_funnel (
        user_id, session_id, funnel_name, step_name, step_order,
        entered_at, completed_at, time_to_complete_seconds
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `, [
      userId, sessionId, funnelName, stepName, stepOrder,
      completed ? new Date().toISOString() : null,
      completed ? 0 : null
    ]);
  } catch (error) {
    console.error('Erro ao capturar funnel step:', error);
  }
};

// Função para calcular health score
const calculateHealthScore = async (userId) => {
  try {
    // Buscar dados do usuário
    const userData = await query(`
      SELECT 
        ch.last_login_date,
        ch.total_sessions,
        ch.features_used_count,
        ch.support_tickets_count,
        ch.nps_score,
        ch.csat_score
      FROM customer_health ch
      WHERE ch.user_id = ?
    `, [userId]);
    
    if (userData.length === 0) return 50; // Score padrão
    
    const data = userData[0];
    let score = 50; // Score base
    
    // Fatores positivos
    if (data.total_sessions > 10) score += 10;
    if (data.features_used_count > 5) score += 10;
    if (data.nps_score > 7) score += 15;
    if (data.csat_score > 4) score += 10;
    
    // Fatores negativos
    if (data.support_tickets_count > 3) score -= 10;
    if (data.last_login_date) {
      const daysSinceLogin = Math.floor((new Date() - new Date(data.last_login_date)) / (1000 * 60 * 60 * 24));
      if (daysSinceLogin > 30) score -= 20;
      else if (daysSinceLogin > 7) score -= 10;
    }
    
    // Normalizar score entre 0 e 100
    score = Math.max(0, Math.min(100, score));
    
    // Atualizar health score
    await query(`
      UPDATE customer_health 
      SET health_score = ?, calculated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [score, userId]);
    
    return score;
  } catch (error) {
    console.error('Erro ao calcular health score:', error);
    return 50;
  }
};

module.exports = {
  captureSession,
  captureEvent,
  captureFeatureUsage,
  captureBarriers,
  endSession,
  captureConversion,
  captureFeedback,
  captureFunnelStep,
  calculateHealthScore
}; 