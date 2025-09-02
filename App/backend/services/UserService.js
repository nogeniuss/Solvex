const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');
const logger = require('../config/logger');

class UserService {
  async createUser({ nome, email, telefone, senha }) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Hash da senha
      const hashedPassword = await bcrypt.hash(senha, 10);

      // Verificar se email já existe
      const [existingUsers] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        throw new Error('Email já cadastrado');
      }

      // Inserir usuário
      const [result] = await connection.query(
        `INSERT INTO users (nome, email, telefone, senha, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [nome, email, telefone, hashedPassword]
      );

      await connection.commit();

      return {
        id: result.insertId,
        nome,
        email,
        telefone
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async getUserById(id) {
    let connection;
    try {
      connection = await db.getConnection();
      const [rows] = await connection.query(
        'SELECT id, nome, email, telefone, role, status FROM users WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async getUserByEmail(email) {
    let connection;
    try {
      connection = await db.getConnection();
      const [rows] = await connection.query(
        'SELECT id, nome, email, telefone, senha, role, status FROM users WHERE email = ?',
        [email]
      );
      return rows[0];
    } catch (error) {
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async authenticateUser(emailOrPhone, senha) {
    let connection;
    try {
      connection = await db.getConnection();
      const [rows] = await connection.query(
        'SELECT * FROM users WHERE email = ? OR telefone = ?',
        [emailOrPhone, emailOrPhone]
      );

      const user = rows[0];
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      const isValidPassword = await bcrypt.compare(senha, user.senha);
      if (!isValidPassword) {
        throw new Error('Senha incorreta');
      }

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
          role: user.role,
          status: user.status
        },
        token
      };

    } catch (error) {
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async updateUser(id, { nome, email, telefone }) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Verificar se email já existe (exceto para o próprio usuário)
      if (email) {
        const [existingUsers] = await connection.query(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, id]
        );

        if (existingUsers.length > 0) {
          throw new Error('Email já está em uso');
        }
      }

      // Atualizar usuário
      await connection.query(
        `UPDATE users 
         SET nome = ?, email = ?, telefone = ?, updated_at = NOW()
         WHERE id = ?`,
        [nome, email, telefone, id]
      );

      await connection.commit();

      // Retornar usuário atualizado
      const [rows] = await connection.query(
        'SELECT id, nome, email, telefone, role, status FROM users WHERE id = ?',
        [id]
      );
      return rows[0];

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async deleteUser(id) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Deletar usuário
      await connection.query('DELETE FROM users WHERE id = ?', [id]);

      await connection.commit();
      return true;

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}

module.exports = new UserService(); 