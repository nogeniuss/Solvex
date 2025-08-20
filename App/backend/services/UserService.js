const { query, queryOne } = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserService {
  async createUser(userData) {
    const { nome, email, telefone, senha } = userData;
    
    // Verificar se o email já existe
    const existingUserByEmail = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUserByEmail) {
      throw new Error('Email já cadastrado');
    }

    // Verificar se o telefone já existe
    const existingUserByPhone = await queryOne('SELECT id FROM users WHERE telefone = ?', [telefone]);
    if (existingUserByPhone) {
      throw new Error('Telefone já cadastrado');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Criar usuário
    const result = await query(`
      INSERT INTO users (nome, email, telefone, senha, status, role, created_date)
      VALUES (?, ?, ?, ?, 'ativo', 'user', NOW())
    `, [nome, email, telefone, hashedPassword]);

    return { id: result.insertId, nome, email, telefone, status: 'ativo' };
  }

  async authenticateUser(emailOrPhone, senha) {
    // Verificar se é email ou telefone
    const isEmail = emailOrPhone.includes('@');
    const sqlQuery = isEmail 
      ? 'SELECT * FROM users WHERE email = ?' 
      : 'SELECT * FROM users WHERE telefone = ?';
    
    const user = await queryOne(sqlQuery, [emailOrPhone]);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se o usuário está bloqueado
    if (user.status === 'bloqueado') {
      throw new Error('Usuário bloqueado. Entre em contato com o suporte.');
    }

    const isValidPassword = await bcrypt.compare(senha, user.senha);
    
    if (!isValidPassword) {
      // Incrementar tentativas de login
      const newAttempts = user.tentativas_login + 1;
      await query('UPDATE users SET tentativas_login = ? WHERE id = ?', [newAttempts, user.id]);
      
      // Se atingiu 5 tentativas, bloquear o usuário
      if (newAttempts >= 5) {
        await query('UPDATE users SET status = ?, data_bloqueio = NOW() WHERE id = ?', ['bloqueado', user.id]);
        
        // Enviar email de bloqueio
        try {
          const EmailService = require('./EmailService');
          await EmailService.sendAccountBlockedEmail(user);
        } catch (emailError) {
          console.error('Erro ao enviar email de bloqueio:', emailError);
        }
        
        throw new Error('Conta bloqueada devido a múltiplas tentativas de login. Entre em contato com o suporte.');
      }
      
      throw new Error(`Senha incorreta. Tentativas restantes: ${5 - newAttempts}`);
    }

    // Login bem-sucedido, resetar tentativas
    await query('UPDATE users SET tentativas_login = 0, last_login = NOW() WHERE id = ?', [user.id]);

    // Gerar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'sua_chave_secreta',
      { expiresIn: '24h' }
    );

    return {
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        status: user.status,
        role: user.role
      },
      token
    };
  }

  async getUserById(userId) {
    return await queryOne('SELECT id, nome, email, telefone, status, role, created_date, last_login FROM users WHERE id = ?', [userId]);
  }

  async getUserByEmail(email) {
    return await queryOne('SELECT * FROM users WHERE email = ?', [email]);
  }

  async updateUser(userId, userData) {
    const { nome, email, telefone, status } = userData;
    
    await query(`
      UPDATE users SET 
        nome = ?, 
        email = ?, 
        telefone = ?,
        status = ?
      WHERE id = ?
    `, [nome, email, telefone, status, userId]);

    return await this.getUserById(userId);
  }

  async updateUserPassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await query('UPDATE users SET senha = ? WHERE id = ?', [hashedPassword, userId]);
    
    return { message: 'Senha atualizada com sucesso' };
  }

  async deleteUser(userId) {
    await query('DELETE FROM users WHERE id = ?', [userId]);
    return { message: 'Usuário excluído com sucesso' };
  }

  async createPasswordResetToken(email) {
    const user = await this.getUserByEmail(email);
    
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Gerar token único
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora

    // Salvar token no banco
    await query(`
      INSERT INTO password_resets (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `, [user.id, token, expiresAt]);

    return { token, user };
  }

  async validatePasswordResetToken(token) {
    const resetRecord = await queryOne(`
      SELECT pr.*, u.email, u.nome 
      FROM password_resets pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.token = ? AND pr.used = 0 AND pr.expires_at > NOW()
    `, [token]);

    if (!resetRecord) {
      throw new Error('Token inválido ou expirado');
    }

    return resetRecord;
  }

  async resetPassword(token, newPassword) {
    const resetRecord = await this.validatePasswordResetToken(token);
    
    // Atualizar senha
    await this.updateUserPassword(resetRecord.user_id, newPassword);
    
    // Marcar token como usado
    await query('UPDATE password_resets SET used = 1 WHERE token = ?', [token]);
    
    return { message: 'Senha redefinida com sucesso' };
  }

  async unblockUser(userId) {
    await query(`
      UPDATE users SET 
        status = 'ativo', 
        tentativas_login = 0, 
        data_bloqueio = NULL 
      WHERE id = ?
    `, [userId]);
    
    return { message: 'Usuário desbloqueado com sucesso' };
  }

  async getUsersStats() {
    const totalUsers = await queryOne('SELECT COUNT(*) as total FROM users');
    const activeUsers = await queryOne('SELECT COUNT(*) as total FROM users WHERE status = "ativo"');
    const blockedUsers = await queryOne('SELECT COUNT(*) as total FROM users WHERE status = "bloqueado"');
    const newUsers = await queryOne(`
      SELECT COUNT(*) as total FROM users 
      WHERE created_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    return {
      total: totalUsers.total,
      active: activeUsers.total,
      blocked: blockedUsers.total,
      new: newUsers.total,
      activationRate: totalUsers.total > 0 ? (activeUsers.total / totalUsers.total * 100).toFixed(1) : 0
    };
  }
}

module.exports = new UserService(); 