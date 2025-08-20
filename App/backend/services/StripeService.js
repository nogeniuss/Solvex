const Stripe = require('stripe');
const { query } = require('../database');
const logger = require('../config/logger');

class StripeService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_BACKEND);
    this.productId = 'prod_Stlma15LeExwdw';
    this.successUrl = process.env.FRONTEND_URL + '/dashboard?payment=success';
    this.cancelUrl = process.env.FRONTEND_URL + '/payment?canceled=true';
  }

  /**
   * Criar ou obter customer do Stripe
   */
  async getOrCreateCustomer(user) {
    try {
      // Verificar se já existe customer no banco
      const existingSubscription = await query(
        'SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1',
        [user.id]
      );

      if (existingSubscription.length > 0) {
        const customerId = existingSubscription[0].stripe_customer_id;
        
        // Verificar se customer ainda existe no Stripe
        try {
          const customer = await this.stripe.customers.retrieve(customerId);
          return customer;
        } catch (error) {
          logger.warn(`Customer ${customerId} não encontrado no Stripe, criando novo`);
        }
      }

      // Criar novo customer
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.nome,
        phone: user.telefone,
        metadata: {
          user_id: user.id.toString(),
          created_from: 'financas_app'
        }
      });

      logger.info(`Customer criado no Stripe: ${customer.id} para usuário ${user.id}`);
      return customer;

    } catch (error) {
      logger.error('Erro ao criar/obter customer:', error);
      throw new Error('Erro ao processar informações do cliente');
    }
  }

  /**
   * Criar sessão de checkout
   */
  async createCheckoutSession(user, priceId = null) {
    try {
      const customer = await this.getOrCreateCustomer(user);

      // Se não fornecido priceId, buscar do produto
      let finalPriceId = priceId;
      if (!finalPriceId) {
        const prices = await this.stripe.prices.list({
          product: this.productId,
          active: true,
          limit: 1
        });
        
        if (prices.data.length === 0) {
          throw new Error('Nenhum preço ativo encontrado para o produto');
        }
        
        finalPriceId = prices.data[0].id;
      }

      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: finalPriceId,
            quantity: 1,
          },
        ],
        success_url: this.successUrl,
        cancel_url: this.cancelUrl,
        metadata: {
          user_id: user.id.toString(),
          product_id: this.productId
        },
        subscription_data: {
          metadata: {
            user_id: user.id.toString(),
            product_id: this.productId
          }
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        automatic_tax: {
          enabled: false
        }
      });

      // Salvar referência da sessão no banco
      await this.createOrUpdateSubscription(user.id, {
        stripe_customer_id: customer.id,
        status: 'incomplete'
      });

      return session;

    } catch (error) {
      logger.error('Erro ao criar sessão de checkout:', error);
      throw new Error('Erro ao criar sessão de pagamento');
    }
  }

  /**
   * Criar portal do cliente para gerenciar subscription
   */
  async createCustomerPortal(user) {
    try {
      const subscription = await query(
        'SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1',
        [user.id]
      );

      if (subscription.length === 0) {
        throw new Error('Customer não encontrado');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: subscription[0].stripe_customer_id,
        return_url: process.env.FRONTEND_URL + '/dashboard'
      });

      return session;

    } catch (error) {
      logger.error('Erro ao criar portal do cliente:', error);
      throw new Error('Erro ao acessar portal de cobrança');
    }
  }

  /**
   * Verificar status da subscription
   */
  async checkSubscriptionStatus(userId) {
    try {
      const subscription = await query(`
        SELECT us.*, u.subscription_status, u.subscription_ends_at
        FROM user_subscriptions us
        JOIN users u ON u.id = us.user_id
        WHERE us.user_id = ?
        ORDER BY us.created_at DESC
        LIMIT 1
      `, [userId]);

      if (subscription.length === 0) {
        return { hasActive: false, status: 'no_subscription' };
      }

      const sub = subscription[0];
      const now = new Date();
      
      // Verificar se está em trial
      if (sub.trial_end && new Date(sub.trial_end) > now) {
        return { 
          hasActive: true, 
          status: 'trialing',
          subscription: sub,
          trialEndsAt: sub.trial_end
        };
      }

      // Verificar se subscription está ativa
      if (sub.status === 'active' && (!sub.current_period_end || new Date(sub.current_period_end) > now)) {
        return { 
          hasActive: true, 
          status: 'active',
          subscription: sub,
          currentPeriodEnd: sub.current_period_end
        };
      }

      return { 
        hasActive: false, 
        status: sub.status || 'inactive',
        subscription: sub
      };

    } catch (error) {
      logger.error('Erro ao verificar status da subscription:', error);
      return { hasActive: false, status: 'error' };
    }
  }

  /**
   * Criar ou atualizar subscription no banco
   */
  async createOrUpdateSubscription(userId, data) {
    try {
      const existing = await query(
        'SELECT id FROM user_subscriptions WHERE user_id = ? LIMIT 1',
        [userId]
      );

      if (existing.length > 0) {
        // Atualizar existente
        const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(data), existing[0].id];
        
        await query(
          `UPDATE user_subscriptions SET ${fields}, updated_at = NOW() WHERE id = ?`,
          values
        );

        return existing[0].id;
      } else {
        // Criar novo
        const fields = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);

        const result = await query(
          `INSERT INTO user_subscriptions (user_id, ${fields}, created_at, updated_at) VALUES (?, ${placeholders}, NOW(), NOW())`,
          [userId, ...values]
        );

        return result.insertId;
      }

    } catch (error) {
      logger.error('Erro ao criar/atualizar subscription:', error);
      throw error;
    }
  }

  /**
   * Atualizar status do usuário
   */
  async updateUserSubscriptionStatus(userId, status, endsAt = null) {
    try {
      await query(
        'UPDATE users SET subscription_status = ?, subscription_ends_at = ?, updated_at = NOW() WHERE id = ?',
        [status, endsAt, userId]
      );

    } catch (error) {
      logger.error('Erro ao atualizar status do usuário:', error);
      throw error;
    }
  }

  /**
   * Processar evento de webhook
   */
  async processWebhookEvent(event) {
    try {
      // Verificar se evento já foi processado
      const existing = await query(
        'SELECT processed FROM stripe_webhook_events WHERE stripe_event_id = ?',
        [event.id]
      );

      if (existing.length > 0 && existing[0].processed) {
        logger.info(`Evento ${event.id} já foi processado`);
        return;
      }

      // Salvar evento
      await query(
        'INSERT INTO stripe_webhook_events (stripe_event_id, event_type, data, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE data = VALUES(data)',
        [event.id, event.type, JSON.stringify(event)]
      );

      // Processar baseado no tipo
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        default:
          logger.info(`Evento não tratado: ${event.type}`);
      }

      // Marcar como processado
      await query(
        'UPDATE stripe_webhook_events SET processed = TRUE, processed_at = NOW() WHERE stripe_event_id = ?',
        [event.id]
      );

    } catch (error) {
      logger.error('Erro ao processar evento webhook:', error);
      throw error;
    }
  }

  /**
   * Tratar atualização de subscription
   */
  async handleSubscriptionUpdate(subscription) {
    try {
      const userId = subscription.metadata?.user_id;
      if (!userId) {
        logger.warn('User ID não encontrado nos metadados da subscription');
        return;
      }

      const subscriptionData = {
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
      };

      await this.createOrUpdateSubscription(parseInt(userId), subscriptionData);

      // Atualizar status do usuário
      const userStatus = subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : subscription.status;
      await this.updateUserSubscriptionStatus(
        parseInt(userId), 
        userStatus, 
        subscriptionData.current_period_end
      );

      logger.info(`Subscription atualizada para usuário ${userId}: ${subscription.status}`);

    } catch (error) {
      logger.error('Erro ao tratar atualização de subscription:', error);
      throw error;
    }
  }

  /**
   * Tratar subscription cancelada
   */
  async handleSubscriptionDeleted(subscription) {
    try {
      const userId = subscription.metadata?.user_id;
      if (!userId) return;

      await this.createOrUpdateSubscription(parseInt(userId), {
        status: 'canceled'
      });

      await this.updateUserSubscriptionStatus(parseInt(userId), 'canceled');

      logger.info(`Subscription cancelada para usuário ${userId}`);

    } catch (error) {
      logger.error('Erro ao tratar cancelamento de subscription:', error);
      throw error;
    }
  }

  /**
   * Tratar pagamento bem-sucedido
   */
  async handlePaymentSucceeded(invoice) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata?.user_id;
      
      if (!userId) return;

      // Registrar pagamento
      await query(`
        INSERT INTO payment_history (user_id, stripe_invoice_id, amount, currency, status, description, created_at)
        VALUES (?, ?, ?, ?, 'succeeded', ?, NOW())
      `, [
        parseInt(userId),
        invoice.id,
        invoice.amount_paid / 100, // Stripe usa centavos
        invoice.currency,
        `Pagamento de subscription - ${invoice.billing_reason}`
      ]);

      logger.info(`Pagamento registrado para usuário ${userId}: ${invoice.amount_paid / 100} ${invoice.currency}`);

    } catch (error) {
      logger.error('Erro ao registrar pagamento:', error);
      throw error;
    }
  }

  /**
   * Tratar falha no pagamento
   */
  async handlePaymentFailed(invoice) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata?.user_id;
      
      if (!userId) return;

      // Registrar falha no pagamento
      await query(`
        INSERT INTO payment_history (user_id, stripe_invoice_id, amount, currency, status, description, created_at)
        VALUES (?, ?, ?, ?, 'failed', ?, NOW())
      `, [
        parseInt(userId),
        invoice.id,
        invoice.amount_due / 100,
        invoice.currency,
        `Falha no pagamento - ${invoice.billing_reason}`
      ]);

      // Atualizar status do usuário
      await this.updateUserSubscriptionStatus(parseInt(userId), 'past_due');

      logger.warn(`Falha no pagamento para usuário ${userId}`);

    } catch (error) {
      logger.error('Erro ao tratar falha no pagamento:', error);
      throw error;
    }
  }
}

module.exports = new StripeService(); 