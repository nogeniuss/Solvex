const axios = require('axios');
const logger = require('../config/logger');

class VonageSMSService {
  constructor() {
    this.apiKey = process.env.VONAGE_API_KEY;
    this.apiSecret = process.env.VONAGE_API_SECRET;
    this.fromNumber = process.env.VONAGE_FROM_NUMBER || 'Vonage APIs';
    this.baseURL = 'https://rest.nexmo.com/sms/json';
    
    if (!this.apiKey || !this.apiSecret) {
      logger.warn('⚠️  Vonage SMS não configurado - variáveis VONAGE_API_KEY e VONAGE_API_SECRET necessárias');
    } else {
      logger.info('✅ Vonage SMS service initialized');
    }
  }

  /**
   * Enviar SMS via Vonage API
   * @param {string} to - Número de telefone no formato internacional (ex: 5547991206552)
   * @param {string} text - Mensagem a ser enviada
   * @param {string} from - Número ou nome do remetente (opcional)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendSMS(to, text, from = null) {
    try {
      if (!this.apiKey || !this.apiSecret) {
        throw new Error('Vonage SMS não configurado - API Key ou Secret ausentes');
      }

      // Garantir que o número esteja no formato correto
      const formattedTo = this.formatPhoneNumber(to);
      
      const data = {
        from: from || this.fromNumber,
        text: text,
        to: formattedTo,
        api_key: this.apiKey,
        api_secret: this.apiSecret
      };

      logger.info(`📱 Enviando SMS via Vonage para ${formattedTo}`);

      const response = await axios.post(this.baseURL, new URLSearchParams(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      // Vonage retorna um array de mensagens
      const messages = response.data.messages;
      
      if (messages && messages.length > 0) {
        const message = messages[0];
        
        if (message.status === '0') {
          // Sucesso
          logger.info(`✅ SMS enviado com sucesso via Vonage`, {
            to: formattedTo,
            messageId: message['message-id'],
            messagePrice: message['message-price'],
            network: message['network']
          });
          
          return {
            success: true,
            messageId: message['message-id'],
            messagePrice: message['message-price'],
            network: message['network'],
            remainingBalance: message['remaining-balance']
          };
        } else {
          // Erro na mensagem
          const errorText = message['error-text'] || 'Erro desconhecido';
          logger.error(`❌ Erro ao enviar SMS via Vonage`, {
            status: message.status,
            errorText: errorText,
            to: formattedTo
          });
          
          return {
            success: false,
            error: `Vonage Error ${message.status}: ${errorText}`,
            errorCode: message.status
          };
        }
      } else {
        throw new Error('Resposta inválida da API Vonage');
      }

    } catch (error) {
      logger.error('❌ Erro ao enviar SMS via Vonage:', error);
      
      if (error.response) {
        return {
          success: false,
          error: `Erro HTTP ${error.response.status}: ${error.response.data?.message || error.message}`,
          httpStatus: error.response.status
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Formatar número de telefone para formato internacional
   * @param {string} phoneNumber - Número de telefone
   * @returns {string} Número formatado
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    // Remove espaços, parênteses, traços
    let clean = phoneNumber.replace(/[\s\(\)\-\+]/g, '');
    
    // Se já começar com código do país, retorna como está
    if (clean.startsWith('55') && clean.length >= 13) {
      return clean;
    }
    
    // Se começar com 0, remove (formato nacional brasileiro)
    if (clean.startsWith('0')) {
      clean = clean.substring(1);
    }
    
    // Adiciona código do Brasil se necessário
    if (clean.length >= 10 && !clean.startsWith('55')) {
      clean = '55' + clean;
    }
    
    return clean;
  }

  /**
   * Verificar status da conta Vonage
   * @returns {Promise<Object>} Status da conta
   */
  async getAccountBalance() {
    try {
      if (!this.apiKey || !this.apiSecret) {
        throw new Error('Vonage não configurado');
      }

      const response = await axios.get('https://rest.nexmo.com/account/get-balance', {
        params: {
          api_key: this.apiKey,
          api_secret: this.apiSecret
        },
        timeout: 10000
      });

      return {
        success: true,
        balance: response.data.value,
        autoReload: response.data.autoReload
      };

    } catch (error) {
      logger.error('❌ Erro ao consultar saldo Vonage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar notificação de despesa vencida
   * @param {string} telefone - Número de telefone
   * @param {Object} despesa - Dados da despesa
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendDespesaVencida(telefone, despesa) {
    const message = `🚨 DESPESA VENCIDA!\n\n${despesa.titulo}\nValor: R$ ${despesa.valor}\nVencimento: ${despesa.data_vencimento}\n\nAcesse o sistema para regularizar.`;
    return await this.sendSMS(telefone, message);
  }

  /**
   * Enviar notificação de meta atingida
   * @param {string} telefone - Número de telefone  
   * @param {Object} meta - Dados da meta
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendMetaAtingida(telefone, meta) {
    const message = `🎉 META ATINGIDA!\n\n${meta.titulo}\nMeta: R$ ${meta.valor_meta}\nAtual: R$ ${meta.valor_atual}\n\nParabéns! Você conseguiu!`;
    return await this.sendSMS(telefone, message);
  }

  /**
   * Enviar relatório mensal
   * @param {string} telefone - Número de telefone
   * @param {Object} dados - Dados do relatório
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendRelatorioMensal(telefone, dados) {
    const message = `📊 RELATÓRIO MENSAL\n\nReceitas: R$ ${dados.receitas}\nDespesas: R$ ${dados.despesas}\nSaldo: R$ ${dados.saldo}\n\nAcesse o sistema para mais detalhes.`;
    return await this.sendSMS(telefone, message);
  }

  /**
   * Enviar notificação de lembrete personalizado
   * @param {string} telefone - Número de telefone
   * @param {string} titulo - Título do lembrete
   * @param {string} mensagem - Mensagem do lembrete
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendLembrete(telefone, titulo, mensagem) {
    const message = `📋 LEMBRETE\n\n${titulo}\n\n${mensagem}`;
    return await this.sendSMS(telefone, message);
  }

  /**
   * Testar configuração do Vonage
   * @returns {Promise<Object>} Resultado do teste
   */
  async testConfig() {
    try {
      if (!this.apiKey || !this.apiSecret) {
        return {
          success: false,
          error: 'API Key ou Secret não configurados'
        };
      }

      const balanceResult = await this.getAccountBalance();
      
      if (balanceResult.success) {
        return {
          success: true,
          message: 'Vonage SMS configurado corretamente',
          balance: balanceResult.balance,
          autoReload: balanceResult.autoReload
        };
      } else {
        return {
          success: false,
          error: 'Falha ao verificar conta Vonage: ' + balanceResult.error
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new VonageSMSService(); 