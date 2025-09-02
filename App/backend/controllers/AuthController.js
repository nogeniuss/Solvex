const UserService = require('../services/UserService');
const EmailService = require('../services/EmailService');
const StripeService = require('../services/StripeService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../database');
const logger = require('../config/logger');

class AuthController {
  async register(req, res) {
    let connection;
    try {
      const { nome, email, senha, telefone } = req.body;

      // Validações básicas
      if (!nome || !email || !senha || !telefone) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      // Verificar se usuário já existe
      const [existingUsers] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'E-mail já cadastrado' });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(senha, 10);

      // Inserir usuário
      const [result] = await connection.query(
        `INSERT INTO users (nome, email, senha, telefone, payment_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', NOW(), NOW())`,
        [nome, email, hashedPassword, telefone]
      );

      // Gerar token JWT
      const token = jwt.sign(
        { 
          id: result.insertId,
          userId: result.insertId,
          email: email,
          nome: nome
        },
        process.env.JWT_SECRET || 'sua_chave_secreta',
        { expiresIn: '24h' }
      );

      await connection.commit();

      // Retornar token e dados do usuário
      res.status(201).json({
        message: 'Usuário criado com sucesso',
        token,
        user: {
          id: result.insertId,
          nome,
          email,
          telefone,
          payment_status: 'pending'
        }
      });

      logger.info('✅ Novo usuário registrado:', { userId: result.insertId, email });

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('❌ Erro no registro:', error);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async login(req, res) {
    let connection;
    try {
      const { email, senha } = req.body;

      // Validações básicas
      if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      connection = await db.getConnection();

      // Buscar usuário
      const [users] = await connection.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      const user = users[0];
      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Verificar senha
      const isValidPassword = await bcrypt.compare(senha, user.senha);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Gerar token JWT
      const token = jwt.sign(
        { id: user.id, userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'sua_chave_secreta',
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          payment_status: user.payment_status
        }
      });

    } catch (error) {
      logger.error('❌ Erro no login:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async getProfile(req, res) {
    let connection;
    try {
      const userId = req.user.userId || req.user.id; // Support both formats

      connection = await db.getConnection();
      const [users] = await connection.query(
        'SELECT id, nome, email, telefone, payment_status FROM users WHERE id = ?',
        [userId]
      );

      const user = users[0];
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({ user });

    } catch (error) {
      logger.error('❌ Erro ao buscar perfil:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async updateProfile(req, res) {
    let connection;
    try {
      const userId = req.user.userId;
      const { nome, email, telefone } = req.body;

      connection = await db.getConnection();
      await connection.beginTransaction();

      // Verificar se email já existe
      if (email) {
        const [existingUsers] = await connection.query(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, userId]
        );

        if (existingUsers.length > 0) {
          await connection.rollback();
          return res.status(400).json({ error: 'E-mail já está em uso' });
        }
      }

      // Atualizar usuário
      await connection.query(
        `UPDATE users 
         SET nome = ?, email = ?, telefone = ?, updated_at = NOW()
         WHERE id = ?`,
        [nome, email, telefone, userId]
      );

      await connection.commit();

      // Buscar usuário atualizado
      const [users] = await connection.query(
        'SELECT id, nome, email, telefone, payment_status FROM users WHERE id = ?',
        [userId]
      );

      res.json({ user: users[0] });

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('❌ Erro ao atualizar perfil:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
      if (connection) {
        connection.release();
      }
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