const nodemailer = require('nodemailer');
const axios = require('axios');
const config = require('../config/notifications');
const { query } = require('../database');
const vonageSMS = require('./VonageSMSService');

class NotificationService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  // Inicializar transportador de email (fallback SMTP)
  initTransporter() {
    try {
      // Se temos API key da Brevo, priorizamos API HTTP; SMTP fica como fallback
      const hasBrevoApi = !!config.email.brevoApiKey;

      if (!hasBrevoApi) {
        if (!config.email.auth.user || !config.email.auth.pass) {
          console.log('ℹ️  Email não configurado');
          return;
        }

        this.transporter = nodemailer.createTransport({
          host: config.email.host,
          port: config.email.port,
          secure: config.email.secure,
          auth: {
            user: config.email.auth.user,
            pass: config.email.auth.pass
          }
        });

        this.transporter.verify((error, success) => {
          if (error) {
            console.error('❌ Erro na configuração de email (SMTP):', error);
            this.transporter = null;
          } else {
            console.log('✅ Servidor de email (SMTP) configurado com sucesso');
          }
        });
      } else {
        console.log('✅ Envio de email via Brevo API habilitado');
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar transportador de email:', error);
      this.transporter = null;
    }
  }

  // Persistir notificação na tabela `notificacoes`
  async createNotification({ user_id, titulo, mensagem, tipo = 'sistema', canal = 'email', agendamento = null }) {
    try {
      const result = await query(`
        INSERT INTO notificacoes (titulo, mensagem, tipo, canal, agendamento, user_id, status, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, 'pendente', NOW())
      `, [titulo, mensagem, tipo, canal, agendamento, user_id]);
      return result.insertId;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  }

  // Envio via Brevo API
  async sendViaBrevoApi({ to, subject, html, text }) {
    const apiKey = config.email.brevoApiKey;
    if (!apiKey) {
      return { success: false, error: 'Brevo API key ausente' };
    }

    try {
      const resp = await axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: { name: config.email.fromName, email: config.email.fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html || undefined,
        textContent: text || undefined
      }, {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (resp.status >= 200 && resp.status < 300) {
        const messageId = resp.data?.messageId || resp.headers['x-mailin-message-id'] || null;
        console.log(`✅ Email enviado via Brevo API para ${to}${messageId ? ` (messageId=${messageId})` : ''}`);
        return { success: true, messageId };
      }

      return { success: false, error: `Status ${resp.status}` };
    } catch (error) {
      console.error('❌ Erro ao enviar via Brevo API:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Envio via SMTP (fallback)
  async sendViaSmtp({ to, subject, html, text }) {
    try {
      if (!this.transporter) {
        throw new Error('Transportador de email (SMTP) não configurado');
      }

      const mailOptions = {
        from: `${config.email.fromName} <${config.email.fromEmail}>`,
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email enviado via SMTP para ${to}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Erro ao enviar via SMTP:', error);
      return { success: false, error: error.message };
    }
  }

  // Enviar email (auto: Brevo API -> SMTP)
  async sendEmail({ to, subject, template, data, html, text }) {
    // Preparar conteúdo
    let emailHtml = html;
    let emailText = text;

    if (template && config.templates[template]) {
      emailHtml = this.processTemplate(config.templates[template].html, data);
      emailText = this.processTemplate(config.templates[template].text || '', data);
      subject = subject || config.templates[template].subject;
    }

    // Tenta Brevo API primeiro
    if (config.email.brevoApiKey) {
      const apiResult = await this.sendViaBrevoApi({ to, subject, html: emailHtml, text: emailText });
      if (apiResult.success) return apiResult;
      console.warn('⚠️  Falha Brevo API, tentando SMTP como fallback...');
    }

    // Fallback SMTP
    return await this.sendViaSmtp({ to, subject, html: emailHtml, text: emailText });
  }

  // Enviar SMS usando Vonage (prioritário) ou Twilio (fallback)
  async sendSMS({ to, message, template, data }) {
    try {
      let smsMessage = message;
      if (template && config.templates[template]) {
        smsMessage = this.processTemplate(config.templates[template].sms || message, data);
      }

      // Tentar Vonage primeiro
      if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) {
        console.log('📱 Enviando SMS via Vonage...');
        const vonageResult = await vonageSMS.sendSMS(to, smsMessage);
        
        if (vonageResult.success) {
          console.log(`✅ SMS enviado via Vonage para ${to}: ${vonageResult.messageId}`);
          return {
            success: true,
            messageId: vonageResult.messageId,
            provider: 'vonage',
            messagePrice: vonageResult.messagePrice,
            network: vonageResult.network
          };
        } else {
          console.warn('⚠️  Falha no Vonage, tentando Twilio como fallback...', vonageResult.error);
        }
      }

      // Fallback para Twilio
      if (config.sms.accountSid && config.sms.authToken) {
        console.log('📱 Enviando SMS via Twilio (fallback)...');
        const twilio = require('twilio')(config.sms.accountSid, config.sms.authToken);
        const result = await twilio.messages.create({ 
          body: smsMessage, 
          from: config.sms.fromNumber, 
          to 
        });
        console.log(`✅ SMS enviado via Twilio para ${to}: ${result.sid}`);
        return { 
          success: true, 
          messageId: result.sid,
          provider: 'twilio'
        };
      }

      throw new Error('Nenhum provedor de SMS configurado (Vonage ou Twilio)');
      
    } catch (error) {
      console.error('❌ Erro ao enviar SMS:', error);
      return { success: false, error: error.message };
    }
  }

  processTemplate(template, data) {
    if (!template || !data) return template;
    let processedTemplate = template;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, data[key] || '');
    });
    processedTemplate = this.processConditionals(processedTemplate, data);
    return processedTemplate;
  }

  processConditionals(template, data) {
    const conditionalRegex = /{{#if\s+(\w+)}}(.*?){{\/if}}/gs;
    return template.replace(conditionalRegex, (match, condition, content) => {
      if (data[condition]) return content;
      return '';
    });
  }

  async sendNotification({ to, email, phone, subject, template, data, channels = ['email'] }) {
    const results = {};
    if (channels.includes('email') && email) {
      results.email = await this.sendEmail({ to: email, subject, template, data });
    }
    if (channels.includes('sms') && phone) {
      results.sms = await this.sendSMS({ to: phone, message: data.message || '', template, data });
    }
    return results;
  }

  async sendDespesaVencidaNotification(user, despesa) {
    return await this.sendNotification({
      email: user.email,
      phone: user.telefone,
      template: 'despesaVencida',
      data: {
        nome: user.nome,
        titulo: despesa.titulo,
        valor: despesa.valor.toFixed(2),
        data_vencimento: despesa.data_vencimento,
        categoria: despesa.categoria_nome || 'Sem categoria',
        descricao: despesa.descricao
      },
      channels: ['email']
    });
  }

  async sendMetaVencendoNotification(user, meta) {
    const progresso = ((meta.valor_atual / meta.valor_meta) * 100).toFixed(1);
    const diasRestantes = Math.ceil((new Date(meta.data_fim) - new Date()) / (1000 * 60 * 60 * 24));
    return await this.sendNotification({
      email: user.email,
      phone: user.telefone,
      template: 'metaVencimento',
      data: {
        nome: user.nome,
        titulo: meta.titulo,
        valor_meta: meta.valor_meta.toFixed(2),
        valor_atual: meta.valor_atual.toFixed(2),
        progresso,
        data_fim: meta.data_fim,
        dias_restantes: diasRestantes
      },
      channels: ['email']
    });
  }

  async sendConquistaNotification(user, conquista) {
    return await this.sendNotification({
      email: user.email,
      phone: user.telefone,
      template: 'conquista',
      data: { nome: user.nome, titulo: conquista.titulo, descricao: conquista.descricao, pontos: conquista.pontos },
      channels: ['email']
    });
  }

  async sendRelatorioMensal(user, dados) {
    return await this.sendNotification({
      email: user.email,
      phone: user.telefone,
      template: 'relatorioMensal',
      data: { nome: user.nome, ...dados },
      channels: ['email']
    });
  }

  async sendCustomNotification({ to, subject, message, type = 'info' }) {
    const templates = {
      info: { subject: 'ℹ️ Informação - Sistema de Finanças', html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #0891b2;">ℹ️ Informação</h2><p>{{message}}</p><p>Atenciosamente,<br>Sistema de Finanças</p></div>` },
      success: { subject: '✅ Sucesso - Sistema de Finanças', html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #059669;">✅ Sucesso</h2><p>{{message}}</p><p>Atenciosamente,<br>Sistema de Finanças</p></div>` },
      warning: { subject: '⚠️ Aviso - Sistema de Finanças', html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #d97706;">⚠️ Aviso</h2><p>{{message}}</p><p>Atenciosamente,<br>Sistema de Finanças</p></div>` },
      error: { subject: '❌ Erro - Sistema de Finanças', html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2 style="color: #dc2626;">❌ Erro</h2><p>{{message}}</p><p>Atenciosamente,<br>Sistema de Finanças</p></div>` }
    };
    const template = templates[type] || templates.info;
    return await this.sendEmail({ to, subject: subject || template.subject, html: this.processTemplate(template.html, { message }) });
  }

  async testEmailConfig() {
    if (config.email.brevoApiKey) {
      return { success: true, message: 'Brevo API configurada' };
    }
    try {
      if (!this.transporter) throw new Error('Transportador de email não configurado');
      await this.transporter.verify();
      return { success: true, message: 'SMTP configurado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testSMSConfig() {
    try {
      // Testar Vonage primeiro
      if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) {
        console.log('🧪 Testando configuração Vonage...');
        const vonageTest = await vonageSMS.testConfig();
        
        if (vonageTest.success) {
          return {
            success: true,
            message: 'Vonage SMS configurado corretamente',
            provider: 'vonage',
            balance: vonageTest.balance,
            autoReload: vonageTest.autoReload
          };
        } else {
          console.warn('⚠️  Vonage não funcional, testando Twilio...');
        }
      }

      // Fallback para Twilio
      if (config.sms.accountSid && config.sms.authToken) {
        console.log('🧪 Testando configuração Twilio...');
        const twilio = require('twilio')(config.sms.accountSid, config.sms.authToken);
        const account = await twilio.api.accounts(config.sms.accountSid).fetch();
        return {
          success: true,
          message: 'Twilio SMS configurado corretamente',
          provider: 'twilio',
          account: account.friendlyName
        };
      }

      return {
        success: false,
        error: 'Nenhum provedor de SMS configurado (Vonage ou Twilio)'
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationService; 