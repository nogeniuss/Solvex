const Stripe = require('stripe');
const db = require('../database');
const logger = require('../config/logger');

class StripeService {
  constructor() {
    this.stripe = null;
    this.successUrl = null;
    this.cancelUrl = null;
    this.initStripe();
    this.initUrls();
  }

  initUrls() {
    if (!this.successUrl || !this.cancelUrl) {
      this.successUrl = process.env.FRONTEND_URL + '/login?payment=success&session_id={CHECKOUT_SESSION_ID}';
      this.cancelUrl = process.env.FRONTEND_URL + '/payment?status=failed';
    }
  }

  initStripe() {
    if (!this.stripe) {
      const stripeKey = process.env.STRIPE_BACKEND;
      if (!stripeKey) {
        throw new Error('STRIPE_BACKEND não está configurada nas variáveis de ambiente');
      }
      this.stripe = new Stripe(stripeKey);
      logger.info('✅ Stripe inicializado com sucesso');
    }
    return this.stripe;
  }

  async createCheckoutSession({ email, planId, userId }) {
    let connection;
    try {
      logger.info(`Creating checkout session for user ${userId}, plan ${planId}`);

      connection = await db.getConnection();
      await connection.beginTransaction();

      // Criar sessão
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        customer_email: email,
        metadata: {
          user_id: userId
        },
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: 'Plano Básico',
                description: 'Acesso completo ao sistema de finanças'
              },
              unit_amount: 1990,
              recurring: {
                interval: 'month'
              }
            },
            quantity: 1,
          },
        ],
        success_url: this.successUrl,
        cancel_url: this.cancelUrl,
        locale: 'pt-BR',
        payment_method_collection: 'always',
        allow_promotion_codes: false,
        billing_address_collection: 'required',
        phone_number_collection: {
          enabled: true
        }
      });

      // Atualizar status do usuário para 'processing'
      await connection.query(`
        UPDATE users 
        SET 
          payment_status = 'processing',
          payment_session_id = ?,
          last_payment_attempt = NOW()
        WHERE id = ?
      `, [session.id, userId]);

      // Registrar tentativa de pagamento
      await connection.query(`
        INSERT INTO payment_history (
          user_id,
          amount,
          currency,
          status,
          description,
          created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        userId,
        19.90,
        'BRL',
        'pending',
        'Tentativa de assinatura do plano básico'
      ]);

      await connection.commit();
      return session;

    } catch (error) {
      if (connection) {
        await connection.rollback();
        // Em caso de erro, atualizar status do usuário
        await connection.query(`
          UPDATE users 
          SET 
            payment_status = 'failed',
            last_payment_attempt = NOW()
          WHERE id = ?
        `, [userId]);
      }

      logger.error('Erro ao criar sessão de checkout:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async activateSubscription(userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Atualizar status do usuário
      await connection.query(`
        UPDATE users 
        SET 
          subscription_status = 'active',
          subscription_ends_at = DATE_ADD(NOW(), INTERVAL 1 MONTH),
          payment_status = 'completed',
          updated_at = NOW()
        WHERE id = ?
      `, [userId]);

      // Atualizar histórico de pagamento
      await connection.query(`
        UPDATE payment_history
        SET 
          status = 'succeeded',
          description = 'Pagamento confirmado - Assinatura ativada'
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);

      await connection.commit();
      logger.info(`Subscription activated for user ${userId}`);
      return true;

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('Erro ao ativar assinatura:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async registerPaymentFailure(userId, error) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Atualizar status do usuário
      await connection.query(`
        UPDATE users
        SET 
          payment_status = 'failed',
          last_payment_attempt = NOW()
        WHERE id = ?
      `, [userId]);

      // Atualizar histórico de pagamento
      await connection.query(`
        UPDATE payment_history
        SET 
          status = 'failed',
          description = ?
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [
        `Falha no pagamento: ${error}`,
        userId
      ]);

      await connection.commit();
      logger.warn(`Payment failed for user ${userId}: ${error}`);
      return true;

    } catch (err) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('Erro ao registrar falha:', err);
      throw err;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async checkPaymentStatus(userId) {
    let connection;
    try {
      connection = await db.getConnection();
      const [rows] = await connection.query(`
        SELECT payment_status, payment_session_id, last_payment_attempt
        FROM users
        WHERE id = ?
      `, [userId]);

      return rows[0];
    } catch (error) {
      logger.error('Erro ao verificar status do pagamento:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  constructWebhookEvent(payload, signature) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret
    );
  }

  async handleSuccessfulPayment({ userId, stripeCustomerId, subscriptionId, paymentStatus }) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Atualizar usuário
      await connection.query(
        `UPDATE users 
         SET payment_status = ?,
             stripe_customer_id = ?,
             stripe_subscription_id = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [paymentStatus, stripeCustomerId, subscriptionId, userId]
      );

      await connection.commit();
      logger.info(`✅ Pagamento processado com sucesso para usuário ${userId}`);
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('❌ Erro ao processar pagamento:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async updateSubscriptionPeriod({ subscriptionId, currentPeriodStart, currentPeriodEnd }) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      
      await connection.query(
        `UPDATE users 
         SET current_period_start = ?,
             current_period_end = ?,
             updated_at = NOW()
         WHERE stripe_subscription_id = ?`,
        [currentPeriodStart, currentPeriodEnd, subscriptionId]
      );

      await connection.commit();
      logger.info(`✅ Período de assinatura atualizado para subscription ${subscriptionId}`);
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('❌ Erro ao atualizar período de assinatura:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async getUserIdByEmail(email) {
    let connection;
    try {
      connection = await db.getConnection();
      const [rows] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      
      return rows.length > 0 ? rows[0].id : null;
    } catch (error) {
      logger.error('❌ Erro ao buscar usuário por email:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async confirmPayment(userId, sessionId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Atualizar status do usuário para pago
      await connection.query(
        `UPDATE users 
         SET payment_status = 'completed',
             subscription_status = 'active',
             updated_at = NOW()
         WHERE id = ?`,
        [userId]
      );

      // Registrar histórico de pagamento
      await connection.query(
        `INSERT INTO payment_history (
          user_id, 
          stripe_payment_intent_id, 
          amount, 
          currency, 
          status, 
          description
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, sessionId, 29.90, 'BRL', 'succeeded', 'Pagamento confirmado via Stripe']
      );

      await connection.commit();
      logger.info(`✅ Pagamento confirmado para usuário ${userId}, sessão ${sessionId}`);
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('❌ Erro ao confirmar pagamento:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}

// Singleton instance
let instance = null;

module.exports = (() => {
  if (!instance) {
    instance = new StripeService();
  }
  return instance;
})(); 