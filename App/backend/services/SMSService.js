const twilio = require('twilio');
const { Client } = require('whatsapp-web.js');
const logger = require('../config/logger');

class SMSService {
  constructor() {
    this.twilioClient = null;
    this.whatsappClient = null;
    this.init();
  }

  async init() {
    try {
      // Inicializar Twilio
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        logger.info('Twilio SMS service initialized');
      }

      // Inicializar WhatsApp
      if (process.env.WHATSAPP_ENABLED === 'true') {
        this.whatsappClient = new Client({
          puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          }
        });

        this.whatsappClient.on('qr', (qr) => {
          logger.info('WhatsApp QR Code generated');
          // Salvar QR code para escaneamento
        });

        this.whatsappClient.on('ready', () => {
          logger.info('WhatsApp client ready');
        });

        this.whatsappClient.on('authenticated', () => {
          logger.info('WhatsApp authenticated');
        });

        await this.whatsappClient.initialize();
      }
    } catch (error) {
      logger.error('SMS/WhatsApp service initialization error:', error);
    }
  }

  async sendSMS(to, message) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio not configured');
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_FROM_NUMBER,
        to: to
      });

      logger.info('SMS sent successfully', { to, messageId: result.sid });
      return { success: true, messageId: result.sid };
    } catch (error) {
      logger.error('SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWhatsApp(to, message) {
    try {
      if (!this.whatsappClient) {
        throw new Error('WhatsApp not configured');
      }

      const result = await this.whatsappClient.sendMessage(to, message);
      
      logger.info('WhatsApp message sent successfully', { to, messageId: result.id._serialized });
      return { success: true, messageId: result.id._serialized };
    } catch (error) {
      logger.error('WhatsApp send error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendNotification(to, message, channels = ['sms']) {
    const results = {};

    if (channels.includes('sms')) {
      results.sms = await this.sendSMS(to, message);
    }

    if (channels.includes('whatsapp')) {
      results.whatsapp = await this.sendWhatsApp(to, message);
    }

    return results;
  }

  // Notificações específicas para o sistema financeiro
  async sendDespesaVencida(telefone, despesa) {
    const message = `🚨 Despesa Vencida!\n\n${despesa.titulo}\nValor: R$ ${despesa.valor}\nVencimento: ${despesa.data_vencimento}\n\nAcesse o sistema para regularizar.`;
    return this.sendNotification(telefone, message, ['sms', 'whatsapp']);
  }

  async sendMetaAtingida(telefone, meta) {
    const message = `🎉 Meta Atingida!\n\n${meta.titulo}\nMeta: R$ ${meta.valor_meta}\nAtual: R$ ${meta.valor_atual}\n\nParabéns! Você conseguiu!`;
    return this.sendNotification(telefone, message, ['sms', 'whatsapp']);
  }

  async sendRelatorioMensal(telefone, dados) {
    const message = `📊 Relatório Mensal\n\nReceitas: R$ ${dados.receitas}\nDespesas: R$ ${dados.despesas}\nSaldo: R$ ${dados.saldo}\n\nAcesse o sistema para mais detalhes.`;
    return this.sendNotification(telefone, message, ['sms', 'whatsapp']);
  }
}

module.exports = new SMSService(); 