const UserService = require('../services/UserService');
const EmailService = require('../services/EmailService');
const StripeService = require('../services/StripeService');

class AuthController {
  async register(req, res) {
    try {
      const { nome, email, telefone, senha } = req.body;

      // Validações básicas
      if (!nome || !email || !telefone || !senha) {
        return res.status(400).json({ 
          error: 'Todos os campos são obrigatórios' 
        });
      }

      if (senha.length < 6) {
        return res.status(400).json({ 
          error: 'A senha deve ter pelo menos 6 caracteres' 
        });
      }

      const user = await UserService.createUser({ nome, email, telefone, senha, subscription_status: 'incomplete' });
      
      res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          status: user.status,
          subscription_status: user.subscription_status || 'incomplete'
        },
        requiresPayment: true,
        isNewUser: true
      });
    } catch (error) {
      console.error('Erro no registro:', error);
      
      if (error.message === 'Email já cadastrado' || error.message === 'Telefone já cadastrado') {
        return res.status(409).json({ error: error.message });
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async login(req, res) {
    try {
      const { email, telefone, senha } = req.body;

      // Validações básicas
      if ((!email && !telefone) || !senha) {
        return res.status(400).json({ 
          error: 'Email ou telefone e senha são obrigatórios' 
        });
      }

      const emailOrPhone = email || telefone;
      const result = await UserService.authenticateUser(emailOrPhone, senha);
      
      // Para login simples, por enquanto não verificar subscription
      // (deixar para depois conforme solicitado)
      res.json({
        message: 'Login realizado com sucesso',
        user: result.user,
        token: result.token,
        requiresPayment: false // Temporariamente desabilitado para login
      });
    } catch (error) {
      console.error('Erro no login:', error);
      
      if (error.message.includes('bloqueado')) {
        return res.status(403).json({ error: error.message });
      }
      
      if (error.message.includes('Senha incorreta')) {
        return res.status(401).json({ error: error.message });
      }
      
      if (error.message === 'Usuário não encontrado') {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await UserService.getUserById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          status: user.status,
          role: user.role,
          created_date: user.created_date,
          last_login: user.last_login
        }
      });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { nome, email, telefone } = req.body;
      const userId = req.user.id;

      // Validações básicas
      if (!nome || !email || !telefone) {
        return res.status(400).json({ 
          error: 'Nome, email e telefone são obrigatórios' 
        });
      }

      const updatedUser = await UserService.updateUser(userId, { nome, email, telefone });
      
      res.json({
        message: 'Perfil atualizado com sucesso',
        user: {
          id: updatedUser.id,
          nome: updatedUser.nome,
          email: updatedUser.email,
          telefone: updatedUser.telefone,
          status: updatedUser.status,
          role: updatedUser.role
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { senha_atual, nova_senha } = req.body;
      const userId = req.user.id;

      // Validações básicas
      if (!senha_atual || !nova_senha) {
        return res.status(400).json({ 
          error: 'Senha atual e nova senha são obrigatórias' 
        });
      }

      if (nova_senha.length < 6) {
        return res.status(400).json({ 
          error: 'A nova senha deve ter pelo menos 6 caracteres' 
        });
      }

      // Verificar senha atual
      const user = await UserService.getUserById(userId);
      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(senha_atual, user.senha);
      
      if (!isValidPassword) {
        return res.status(401).json({ 
          error: 'Senha atual incorreta' 
        });
      }

      await UserService.updateUserPassword(userId, nova_senha);
      
      // Enviar email de confirmação
      try {
        await EmailService.sendPasswordChangedEmail(user);
      } catch (emailError) {
        console.error('Erro ao enviar email de confirmação:', emailError);
      }
      
      res.json({
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;
      
      await UserService.deleteUser(userId);
      
      res.json({
        message: 'Conta excluída com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ 
          error: 'Email é obrigatório' 
        });
      }

      // Verificar se o usuário existe
      const user = await UserService.getUserByEmail(email);
      
      if (!user) {
        // Por segurança, não informar se o email existe ou não
        return res.json({
          message: 'Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha'
        });
      }

      // Gerar token de redefinição
      const { token } = await UserService.createPasswordResetToken(email);

      // Enviar email
      try {
        await EmailService.sendPasswordResetEmail(user, token);
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
        return res.status(500).json({ 
          error: 'Erro ao enviar email de redefinição' 
        });
      }

      res.json({
        message: 'Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha'
      });
    } catch (error) {
      console.error('Erro no forgot password:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, nova_senha } = req.body;

      if (!token || !nova_senha) {
        return res.status(400).json({ 
          error: 'Token e nova senha são obrigatórios' 
        });
      }

      if (nova_senha.length < 6) {
        return res.status(400).json({ 
          error: 'A nova senha deve ter pelo menos 6 caracteres' 
        });
      }

      // Redefinir senha
      await UserService.resetPassword(token, nova_senha);

      res.json({
        message: 'Senha redefinida com sucesso'
      });
    } catch (error) {
      console.error('Erro no reset password:', error);
      
      if (error.message === 'Token inválido ou expirado') {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async unblockUser(req, res) {
    try {
      const { userId } = req.params;
      
      // Verificar se o usuário tem permissão de admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Acesso negado' 
        });
      }

      await UserService.unblockUser(userId);
      
      res.json({
        message: 'Usuário desbloqueado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao desbloquear usuário:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }
}

module.exports = new AuthController(); 