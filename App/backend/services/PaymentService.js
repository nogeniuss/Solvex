const db = require('../database');
const logger = require('../config/logger');

class PaymentService {
  constructor() {
    this.gateways = {
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
      },
      paypal: {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        mode: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox'
      },
      mercadopago: {
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
        publicKey: process.env.MERCADOPAGO_PUBLIC_KEY
      }
    };
  }

  async createSubscription(userId, planData) {
    try {
      const { planId, paymentMethod, gateway = 'stripe' } = planData;
      
      // Verificar se o usuário já tem uma assinatura ativa
      const existingSubscription = await db.queryOne(`
        SELECT * FROM subscriptions 
        WHERE user_id = ? AND status = 'ativa'
      `, [userId]);

      if (existingSubscription) {
        throw new Error('Usuário já possui uma assinatura ativa');
      }

      // Criar assinatura no gateway
      let gatewaySubscription;
      switch (gateway) {
        case 'stripe':
          gatewaySubscription = await this.createStripeSubscription(userId, planData);
          break;
        case 'paypal':
          gatewaySubscription = await this.createPayPalSubscription(userId, planData);
          break;
        case 'mercadopago':
          gatewaySubscription = await this.createMercadoPagoSubscription(userId, planData);
          break;
        default:
          throw new Error('Gateway de pagamento não suportado');
      }

      // Salvar assinatura no banco
      const result = await db.query(`
        INSERT INTO subscriptions (
          user_id, plan_id, gateway, gateway_subscription_id, 
          status, valor, data_inicio, data_proximo_pagamento
        ) VALUES (?, ?, ?, ?, 'ativa', ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH))
      `, [userId, planId, gateway, gatewaySubscription.id, planData.valor]);

      return {
        id: result.insertId,
        gateway_subscription_id: gatewaySubscription.id,
        status: 'ativa',
        next_payment: gatewaySubscription.next_payment
      };
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw error;
    }
  }

  async createStripeSubscription(userId, planData) {
    const stripe = require('stripe')(this.gateways.stripe.secretKey);
    
    try {
      // Criar ou recuperar cliente
      const user = await db.queryOne('SELECT email, nome FROM users WHERE id = ?', [userId]);
      
      let customer = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customer.data.length === 0) {
        customer = await stripe.customers.create({
          email: user.email,
          name: user.nome,
          metadata: { user_id: userId }
        });
      } else {
        customer = customer.data[0];
      }

      // Criar assinatura
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: planData.stripePriceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent']
      });

      return {
        id: subscription.id,
        next_payment: new Date(subscription.current_period_end * 1000)
      };
    } catch (error) {
      console.error('Erro ao criar assinatura Stripe:', error);
      throw error;
    }
  }

  async createPayPalSubscription(userId, planData) {
    try {
      const paypal = require('@paypal/checkout-server-sdk');
      
      const environment = this.gateways.paypal.mode === 'live' 
        ? new paypal.core.LiveEnvironment(this.gateways.paypal.clientId, this.gateways.paypal.clientSecret)
        : new paypal.core.SandboxEnvironment(this.gateways.paypal.clientId, this.gateways.paypal.clientSecret);
      
      const client = new paypal.core.PayPalHttpClient(environment);

      const request = new paypal.subscriptions.SubscriptionsPostRequest();
      request.requestBody({
        plan_id: planData.paypalPlanId,
        start_time: new Date().toISOString(),
        subscriber: {
          name: {
            given_name: planData.userName
          },
          email_address: planData.userEmail
        },
        application_context: {
          brand_name: 'Sistema Financeiro',
          locale: 'pt-BR',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          },
          return_url: `${process.env.FRONTEND_URL}/payment/success`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
        }
      });

      const response = await client.execute(request);
      
      return {
        id: response.result.id,
        next_payment: new Date(response.result.start_time)
      };
    } catch (error) {
      console.error('Erro ao criar assinatura PayPal:', error);
      throw error;
    }
  }

  async createMercadoPagoSubscription(userId, planData) {
    try {
      const mercadopago = require('mercadopago');
      mercadopago.configure({ access_token: this.gateways.mercadopago.accessToken });

      const user = await db.queryOne('SELECT email, nome FROM users WHERE id = ?', [userId]);

      const preference = {
        items: [{
          title: planData.titulo,
          unit_price: planData.valor,
          quantity: 1
        }],
        payer: {
          email: user.email,
          name: user.nome
        },
        back_urls: {
          success: `${process.env.FRONTEND_URL}/payment/success`,
          failure: `${process.env.FRONTEND_URL}/payment/failure`,
          pending: `${process.env.FRONTEND_URL}/payment/pending`
        },
        auto_return: 'approved',
        external_reference: `user_${userId}_plan_${planData.planId}`,
        notification_url: `${process.env.BACKEND_URL}/api/payments/webhook/mercadopago`
      };

      const response = await mercadopago.preferences.create(preference);
      
      return {
        id: response.body.id,
        init_point: response.body.init_point,
        next_payment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
      };
    } catch (error) {
      console.error('Erro ao criar assinatura MercadoPago:', error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId, userId) {
    try {
      const subscription = await db.queryOne(`
        SELECT * FROM subscriptions 
        WHERE id = ? AND user_id = ?
      `, [subscriptionId, userId]);

      if (!subscription) {
        throw new Error('Assinatura não encontrada');
      }

      // Cancelar no gateway
      switch (subscription.gateway) {
        case 'stripe':
          await this.cancelStripeSubscription(subscription.gateway_subscription_id);
          break;
        case 'paypal':
          await this.cancelPayPalSubscription(subscription.gateway_subscription_id);
          break;
        case 'mercadopago':
          await this.cancelMercadoPagoSubscription(subscription.gateway_subscription_id);
          break;
      }

      // Atualizar no banco
      await db.query(`
        UPDATE subscriptions SET 
          status = 'cancelada',
          data_cancelamento = NOW(),
          updated_date = NOW()
        WHERE id = ?
      `, [subscriptionId]);

      return { message: 'Assinatura cancelada com sucesso' };
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
  }

  async cancelStripeSubscription(gatewaySubscriptionId) {
    const stripe = require('stripe')(this.gateways.stripe.secretKey);
    
    await stripe.subscriptions.update(gatewaySubscriptionId, {
      cancel_at_period_end: true
    });
  }

  async cancelPayPalSubscription(gatewaySubscriptionId) {
    const paypal = require('@paypal/checkout-server-sdk');
    
    const environment = this.gateways.paypal.mode === 'live' 
      ? new paypal.core.LiveEnvironment(this.gateways.paypal.clientId, this.gateways.paypal.clientSecret)
      : new paypal.core.SandboxEnvironment(this.gateways.paypal.clientId, this.gateways.paypal.clientSecret);
    
    const client = new paypal.core.PayPalHttpClient(environment);
    
    const request = new paypal.subscriptions.SubscriptionsCancelRequest(gatewaySubscriptionId);
    await client.execute(request);
  }

  async cancelMercadoPagoSubscription(gatewaySubscriptionId) {
    // MercadoPago não tem cancelamento direto de assinatura
    // Apenas marcamos como cancelada no nosso sistema
    console.log('Cancelamento MercadoPago:', gatewaySubscriptionId);
  }

  async processWebhook(gateway, payload, signature) {
    try {
      switch (gateway) {
        case 'stripe':
          return await this.processStripeWebhook(payload, signature);
        case 'paypal':
          return await this.processPayPalWebhook(payload);
        case 'mercadopago':
          return await this.processMercadoPagoWebhook(payload);
        default:
          throw new Error('Gateway não suportado');
      }
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      throw error;
    }
  }

  async processStripeWebhook(payload, signature) {
    const stripe = require('stripe')(this.gateways.stripe.secretKey);
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, this.gateways.stripe.webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handleSuccessfulPayment(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleFailedPayment(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object);
        break;
    }

    return { received: true };
  }

  async processPayPalWebhook(payload) {
    // Implementar processamento de webhook PayPal
    console.log('Webhook PayPal recebido:', payload);
    return { received: true };
  }

  async processMercadoPagoWebhook(payload) {
    // Implementar processamento de webhook MercadoPago
    console.log('Webhook MercadoPago recebido:', payload);
    return { received: true };
  }

  async handleSuccessfulPayment(invoice) {
    // Atualizar status da assinatura
    await db.query(`
      UPDATE subscriptions SET 
        status = 'ativa',
        data_ultimo_pagamento = NOW(),
        data_proximo_pagamento = DATE_ADD(NOW(), INTERVAL 1 MONTH),
        updated_date = NOW()
      WHERE gateway_subscription_id = ?
    `, [invoice.subscription]);

    // Registrar pagamento
    await db.query(`
      INSERT INTO payments (
        subscription_id, gateway, gateway_payment_id, valor, status, data_pagamento
      ) VALUES (?, 'stripe', ?, ?, 'pago', NOW())
    `, [invoice.subscription, invoice.payment_intent, invoice.amount_paid / 100]);
  }

  async handleFailedPayment(invoice) {
    // Marcar assinatura como com pagamento pendente
    await db.query(`
      UPDATE subscriptions SET 
        status = 'pagamento_pendente',
        updated_date = NOW()
      WHERE gateway_subscription_id = ?
    `, [invoice.subscription]);
  }

  async handleSubscriptionCancelled(subscription) {
    // Marcar assinatura como cancelada
    await db.query(`
      UPDATE subscriptions SET 
        status = 'cancelada',
        data_cancelamento = NOW(),
        updated_date = NOW()
      WHERE gateway_subscription_id = ?
    `, [subscription.id]);
  }

  async getSubscriptionPlans() {
    return [
      {
        id: 'basic',
        nome: 'Básico',
        descricao: 'Funcionalidades essenciais',
        valor: 19.90,
        moeda: 'BRL',
        periodo: 'mensal',
        features: [
          'Controle de receitas e despesas',
          'Categorização de transações',
          'Relatórios básicos',
          'Metas financeiras',
          'Suporte por email'
        ]
      },
      {
        id: 'premium',
        nome: 'Premium',
        descricao: 'Funcionalidades avançadas',
        valor: 39.90,
        moeda: 'BRL',
        periodo: 'mensal',
        features: [
          'Todas as funcionalidades do Básico',
          'Importação de extratos',
          'Relatórios avançados',
          'Insights inteligentes',
          'Notificações personalizadas',
          'Suporte prioritário'
        ]
      },
      {
        id: 'enterprise',
        nome: 'Empresarial',
        descricao: 'Para empresas e consultores',
        valor: 99.90,
        moeda: 'BRL',
        periodo: 'mensal',
        features: [
          'Todas as funcionalidades do Premium',
          'Múltiplos usuários',
          'API de integração',
          'Relatórios customizados',
          'Suporte dedicado',
          'Treinamento incluído'
        ]
      }
    ];
  }

  async getUserSubscription(userId) {
    return await db.queryOne(`
      SELECT 
        s.*,
        p.nome as plan_name,
        p.descricao as plan_description
      FROM subscriptions s
      LEFT JOIN subscription_plans p ON p.id = s.plan_id
      WHERE s.user_id = ? AND s.status = 'ativa'
      ORDER BY s.data_inicio DESC
      LIMIT 1
    `, [userId]);
  }

  async getPaymentHistory(userId) {
    return await db.query(`
      SELECT 
        p.*,
        s.plan_id,
        sp.nome as plan_name
      FROM payments p
      LEFT JOIN subscriptions s ON s.id = p.subscription_id
      LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
      WHERE s.user_id = ?
      ORDER BY p.data_pagamento DESC
    `, [userId]);
  }

  /**
   * Marcar usuário como pago
   */
  async markUserAsPaid(userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Atualizar status da subscription do usuário
      await connection.query(
        'UPDATE users SET subscription_status = ?, subscription_ends_at = DATE_ADD(NOW(), INTERVAL 1 MONTH), updated_at = NOW() WHERE id = ?',
        ['active', userId]
      );

      // Criar ou atualizar registro de subscription
      const [existingSubscriptions] = await connection.query(
        'SELECT id FROM user_subscriptions WHERE user_id = ?',
        [userId]
      );

      if (existingSubscriptions.length > 0) {
        // Atualizar existente
        await connection.query(
          'UPDATE user_subscriptions SET status = ?, current_period_start = NOW(), current_period_end = DATE_ADD(NOW(), INTERVAL 1 MONTH), updated_at = NOW() WHERE user_id = ?',
          ['active', userId]
        );
      } else {
        // Criar novo
        await connection.query(
          'INSERT INTO user_subscriptions (user_id, status, current_period_start, current_period_end, created_at, updated_at) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), NOW(), NOW())',
          [userId, 'active']
        );
      }

      await connection.commit();
      logger.info(`Usuário ${userId} marcado como pago com sucesso`);
      return true;

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('Erro ao marcar usuário como pago:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * Verificar se usuário está pago
   */
  async isUserPaid(userId) {
    let connection;
    try {
      connection = await db.getConnection();
      const [rows] = await connection.query(
        'SELECT subscription_status, subscription_ends_at FROM users WHERE id = ?',
        [userId]
      );

      if (rows.length === 0) {
        return false;
      }

      const user = rows[0];
      const now = new Date();
      const endsAt = user.subscription_ends_at ? new Date(user.subscription_ends_at) : null;

      // Verificar se está ativo e não expirou
      return user.subscription_status === 'active' && (!endsAt || endsAt > now);

    } catch (error) {
      logger.error('Erro ao verificar se usuário está pago:', error);
      return false;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * Simular pagamento bem-sucedido (para desenvolvimento)
   */
  async simulatePaymentSuccess(userId) {
    try {
      await this.markUserAsPaid(userId);
      
      // Registrar na tabela de histórico de pagamentos
      await db.query(
        'INSERT INTO payment_history (user_id, amount, currency, status, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, 20.00, 'BRL', 'succeeded', 'Pagamento simulado - Plano Mensal']
      );

      logger.info(`Pagamento simulado com sucesso para usuário ${userId}`);
      return true;

    } catch (error) {
      logger.error('Erro ao simular pagamento:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService(); 