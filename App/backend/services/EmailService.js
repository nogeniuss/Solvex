const nodemailer = require('nodemailer');
const config = require('../config/notifications');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: config.email.service,
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass
      }
    });
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"Solvex" <${config.email.fromEmail}>`,
      to: user.email,
      subject: '🔐 Redefinição de Senha - Solvex',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3B82F6; margin: 0;">Solvex</h1>
            <p style="color: #6B7280; margin: 5px 0;">Sistema Financeiro</p>
          </div>
          
          <div style="background-color: #F3F4F6; padding: 30px; border-radius: 10px;">
            <h2 style="color: #1F2937; margin: 0 0 20px 0;">🔐 Redefinição de Senha</h2>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              Olá <strong>${user.nome}</strong>,
            </p>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              Recebemos uma solicitação para redefinir sua senha no Solvex. 
              Se você não fez essa solicitação, pode ignorar este email.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #3B82F6; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold; 
                        display: inline-block;">
                Redefinir Senha
              </a>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin-bottom: 20px;">
              <strong>Importante:</strong> Este link é válido por 1 hora. 
              Após esse período, você precisará solicitar uma nova redefinição.
            </p>
            
            <p style="color: #6B7280; font-size: 14px; margin-bottom: 0;">
              Se o botão não funcionar, copie e cole este link no seu navegador:
            </p>
            <p style="color: #3B82F6; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
              ${resetUrl}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; font-size: 12px; margin: 0;">
              Este é um email automático, não responda a esta mensagem.
            </p>
            <p style="color: #6B7280; font-size: 12px; margin: 5px 0 0 0;">
              © 2024 Solvex. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email de redefinição enviado para ${user.email}`);
      return true;
    } catch (error) {
      console.error('Erro ao enviar email de redefinição:', error);
      throw new Error('Erro ao enviar email de redefinição');
    }
  }

  async sendAccountBlockedEmail(user) {
    const mailOptions = {
      from: `"Solvex" <${config.email.fromEmail}>`,
      to: user.email,
      subject: '🚫 Conta Bloqueada - Solvex',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3B82F6; margin: 0;">Solvex</h1>
            <p style="color: #6B7280; margin: 5px 0;">Sistema Financeiro</p>
          </div>
          
          <div style="background-color: #FEF2F2; padding: 30px; border-radius: 10px; border-left: 4px solid #DC2626;">
            <h2 style="color: #DC2626; margin: 0 0 20px 0;">🚫 Conta Bloqueada</h2>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              Olá <strong>${user.nome}</strong>,
            </p>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              Sua conta no Solvex foi bloqueada devido a múltiplas tentativas de login com senha incorreta.
            </p>
            
            <div style="background-color: #FEE2E2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #DC2626; margin: 0 0 10px 0;">O que aconteceu?</h3>
              <ul style="color: #374151; margin: 0; padding-left: 20px;">
                <li>Foram detectadas 5 ou mais tentativas de login com senha incorreta</li>
                <li>Sua conta foi automaticamente bloqueada por segurança</li>
                <li>Você não conseguirá acessar o sistema até que a conta seja desbloqueada</li>
              </ul>
            </div>
            
            <div style="background-color: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #059669; margin: 0 0 10px 0;">Como resolver?</h3>
              <p style="color: #374151; margin: 0;">
                Entre em contato com o suporte para solicitar o desbloqueio da sua conta. 
                Você pode usar a opção "Esqueci minha senha" para redefinir sua senha.
              </p>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin: 20px 0 0 0;">
              <strong>Data do bloqueio:</strong> ${new Date().toLocaleString('pt-BR')}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; font-size: 12px; margin: 0;">
              Este é um email automático, não responda a esta mensagem.
            </p>
            <p style="color: #6B7280; font-size: 12px; margin: 5px 0 0 0;">
              © 2024 Solvex. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email de bloqueio enviado para ${user.email}`);
      return true;
    } catch (error) {
      console.error('Erro ao enviar email de bloqueio:', error);
      throw new Error('Erro ao enviar email de bloqueio');
    }
  }

  async sendPasswordChangedEmail(user) {
    const mailOptions = {
      from: `"Solvex" <${config.email.fromEmail}>`,
      to: user.email,
      subject: '✅ Senha Alterada - Solvex',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3B82F6; margin: 0;">Solvex</h1>
            <p style="color: #6B7280; margin: 5px 0;">Sistema Financeiro</p>
          </div>
          
          <div style="background-color: #F0FDF4; padding: 30px; border-radius: 10px; border-left: 4px solid #059669;">
            <h2 style="color: #059669; margin: 0 0 20px 0;">✅ Senha Alterada com Sucesso</h2>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              Olá <strong>${user.nome}</strong>,
            </p>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              Sua senha no Solvex foi alterada com sucesso. 
              Se você não fez essa alteração, entre em contato conosco imediatamente.
            </p>
            
            <div style="background-color: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #059669; margin: 0 0 10px 0;">Informações da alteração:</h3>
              <ul style="color: #374151; margin: 0; padding-left: 20px;">
                <li>Data e hora: ${new Date().toLocaleString('pt-BR')}</li>
                <li>IP de origem: ${req.ip || 'Não disponível'}</li>
                <li>Dispositivo: ${req.headers['user-agent'] || 'Não disponível'}</li>
              </ul>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin: 20px 0 0 0;">
              Agora você pode fazer login normalmente com sua nova senha.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <p style="color: #6B7280; font-size: 12px; margin: 0;">
              Este é um email automático, não responda a esta mensagem.
            </p>
            <p style="color: #6B7280; font-size: 12px; margin: 5px 0 0 0;">
              © 2024 Solvex. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Email de confirmação de alteração enviado para ${user.email}`);
      return true;
    } catch (error) {
      console.error('Erro ao enviar email de confirmação:', error);
      throw new Error('Erro ao enviar email de confirmação');
    }
  }
}

module.exports = new EmailService(); 