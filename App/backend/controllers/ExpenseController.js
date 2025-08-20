const ExpenseRepository = require('../repositories/ExpenseRepository');

class ExpenseController {
  async getExpenses(req, res) {
    try {
      const userId = req.user.id;
      const filters = {
        mes: req.query.mes ? parseInt(req.query.mes) : null,
        ano: req.query.ano ? parseInt(req.query.ano) : null,
        categoria_id: req.query.categoria_id ? parseInt(req.query.categoria_id) : null,
        status: req.query.status
      };

      const expenses = await ExpenseRepository.findAll(userId, filters);
      
      res.json({ expenses });
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async createExpense(req, res) {
    try {
      const userId = req.user.id;
      const {
        titulo,
        descricao,
        valor,
        categoria_id,
        data_vencimento,
        recorrencia,
        data_fim_recorrencia,
        juros,
        multa
      } = req.body;

      // Validações básicas
      if (!titulo || !valor || !categoria_id || !data_vencimento) {
        return res.status(400).json({ 
          error: 'Título, valor, categoria e data de vencimento são obrigatórios' 
        });
      }

      if (valor <= 0) {
        return res.status(400).json({ 
          error: 'Valor deve ser maior que zero' 
        });
      }

      if (juros && (juros < 0 || juros > 100)) {
        return res.status(400).json({ 
          error: 'Juros deve estar entre 0 e 100%' 
        });
      }

      if (multa && (multa < 0 || multa > 100)) {
        return res.status(400).json({ 
          error: 'Multa deve estar entre 0 e 100%' 
        });
      }

      const expense = await ExpenseRepository.create({
        titulo: titulo.trim(),
        descricao: descricao?.trim() || '',
        valor: parseFloat(valor),
        categoria_id: parseInt(categoria_id),
        user_id: userId,
        data_vencimento,
        recorrencia: recorrencia || 'nenhuma',
        data_fim_recorrencia: data_fim_recorrencia || null,
        juros: juros ? parseFloat(juros) : 0,
        multa: multa ? parseFloat(multa) : 0
      });
      
      res.status(201).json({
        message: 'Despesa criada com sucesso',
        expense
      });
    } catch (error) {
      console.error('Erro ao criar despesa:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async updateExpense(req, res) {
    try {
      const userId = req.user.id;
      const expenseId = parseInt(req.params.id);
      const {
        titulo,
        descricao,
        valor,
        categoria_id,
        data_vencimento,
        recorrencia,
        data_fim_recorrencia,
        juros,
        multa
      } = req.body;

      // Validações básicas
      if (!expenseId || isNaN(expenseId)) {
        return res.status(400).json({ 
          error: 'ID da despesa inválido' 
        });
      }

      if (!titulo || !valor || !categoria_id || !data_vencimento) {
        return res.status(400).json({ 
          error: 'Título, valor, categoria e data de vencimento são obrigatórios' 
        });
      }

      if (valor <= 0) {
        return res.status(400).json({ 
          error: 'Valor deve ser maior que zero' 
        });
      }

      const expense = await ExpenseRepository.update(expenseId, userId, {
        titulo: titulo.trim(),
        descricao: descricao?.trim() || '',
        valor: parseFloat(valor),
        categoria_id: parseInt(categoria_id),
        data_vencimento,
        recorrencia: recorrencia || 'nenhuma',
        data_fim_recorrencia: data_fim_recorrencia || null,
        juros: juros ? parseFloat(juros) : 0,
        multa: multa ? parseFloat(multa) : 0
      });
      
      res.json({
        message: 'Despesa atualizada com sucesso',
        expense
      });
    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async deleteExpense(req, res) {
    try {
      const userId = req.user.id;
      const expenseId = parseInt(req.params.id);

      if (!expenseId || isNaN(expenseId)) {
        return res.status(400).json({ 
          error: 'ID da despesa inválido' 
        });
      }

      const result = await ExpenseRepository.delete(expenseId, userId);
      
      res.json({
        message: result.message
      });
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async markAsPaid(req, res) {
    try {
      const userId = req.user.id;
      const expenseId = parseInt(req.params.id);

      if (!expenseId || isNaN(expenseId)) {
        return res.status(400).json({ 
          error: 'ID da despesa inválido' 
        });
      }

      // Buscar a despesa antes de marcar como paga para verificar recorrência
      const expenseData = await ExpenseRepository.findById(expenseId, userId);
      if (!expenseData) {
        return res.status(404).json({ error: 'Despesa não encontrada' });
      }

      const expense = await ExpenseRepository.markAsPaid(expenseId, userId);
      
      // Se tem recorrência, criar próxima despesa
      if (expenseData.recorrencia && expenseData.recorrencia !== 'nenhuma') {
        try {
          await this.createRecurrentExpense(expenseData, userId);
        } catch (recurrenceError) {
          console.error('Erro ao criar despesa recorrente:', recurrenceError);
          // Não falha a operação principal, apenas loga o erro
        }
      }
      
      res.json({
        message: 'Despesa marcada como paga',
        expense
      });
    } catch (error) {
      console.error('Erro ao marcar despesa como paga:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async createRecurrentExpense(originalExpense, userId) {
    const currentDate = new Date(originalExpense.data_vencimento);
    let nextDate = new Date(currentDate);

    // Calcular próxima data baseada na recorrência
    switch (originalExpense.recorrencia) {
      case 'diario':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'semanal':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'quinzenal':
        nextDate.setDate(nextDate.getDate() + 15);
        break;
      case 'mensal':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'bimestral':
        nextDate.setMonth(nextDate.getMonth() + 2);
        break;
      case 'trimestral':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'semestral':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'anual':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        return; // Recorrência não reconhecida
    }

    // Verificar se ainda está dentro do período de recorrência
    if (originalExpense.data_fim_recorrencia) {
      const endDate = new Date(originalExpense.data_fim_recorrencia);
      if (nextDate > endDate) {
        return; // Não criar nova despesa, recorrência expirou
      }
    }

    // Criar nova despesa
    const newExpenseData = {
      titulo: originalExpense.titulo,
      descricao: originalExpense.descricao,
      valor: originalExpense.valor,
      categoria_id: originalExpense.categoria_id,
      data_vencimento: nextDate.toISOString().split('T')[0],
      recorrencia: originalExpense.recorrencia,
      data_fim_recorrencia: originalExpense.data_fim_recorrencia,
      juros: originalExpense.juros,
      multa: originalExpense.multa,
      user_id: userId,
      status: 'pendente'
    };

    await ExpenseRepository.create(newExpenseData);
  }

  async getExpenseById(req, res) {
    try {
      const userId = req.user.id;
      const expenseId = parseInt(req.params.id);

      if (!expenseId || isNaN(expenseId)) {
        return res.status(400).json({ 
          error: 'ID da despesa inválido' 
        });
      }

      const expense = await ExpenseRepository.findById(expenseId, userId);
      
      if (!expense) {
        return res.status(404).json({ 
          error: 'Despesa não encontrada' 
        });
      }

      res.json({ expense });
    } catch (error) {
      console.error('Erro ao buscar despesa:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async getExpenseStats(req, res) {
    try {
      const userId = req.user.id;
      const filters = {
        mes: req.query.mes ? parseInt(req.query.mes) : null,
        ano: req.query.ano ? parseInt(req.query.ano) : null
      };

      const stats = await ExpenseRepository.getStats(userId, filters);
      
      res.json({ stats });
    } catch (error) {
      console.error('Erro ao buscar estatísticas das despesas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async getExpensesByCategory(req, res) {
    try {
      const userId = req.user.id;
      const filters = {
        mes: req.query.mes ? parseInt(req.query.mes) : null,
        ano: req.query.ano ? parseInt(req.query.ano) : null
      };

      const expensesByCategory = await ExpenseRepository.getByCategory(userId, filters);
      
      res.json({ expensesByCategory });
    } catch (error) {
      console.error('Erro ao buscar despesas por categoria:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async getOverdueExpenses(req, res) {
    try {
      const userId = req.user.id;
      const overdueExpenses = await ExpenseRepository.getOverdue(userId);
      
      res.json({ overdueExpenses });
    } catch (error) {
      console.error('Erro ao buscar despesas vencidas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async calculateInterestAndPenalty(req, res) {
    try {
      const userId = req.user.id;
      const expenseId = parseInt(req.params.id);

      if (!expenseId || isNaN(expenseId)) {
        return res.status(400).json({ 
          error: 'ID da despesa inválido' 
        });
      }

      const calculation = await ExpenseRepository.calculateInterestAndPenalty(expenseId, userId);
      
      res.json({ calculation });
    } catch (error) {
      console.error('Erro ao calcular juros e multas:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }

  async bulkUpdateStatus(req, res) {
    try {
      const userId = req.user.id;
      const { expenseIds, status } = req.body;

      if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
        return res.status(400).json({ 
          error: 'Lista de IDs de despesas é obrigatória' 
        });
      }

      if (!status || !['pendente', 'pago'].includes(status)) {
        return res.status(400).json({ 
          error: 'Status deve ser "pendente" ou "pago"' 
        });
      }

      const results = [];
      
      for (const expenseId of expenseIds) {
        try {
          if (status === 'pago') {
            const expense = await ExpenseRepository.markAsPaid(expenseId, userId);
            results.push({ id: expenseId, success: true, expense });
          } else {
            // Marcar como pendente
            const result = await ExpenseRepository.bulkUpdateStatus([expenseId], userId, status);
            results.push({ id: expenseId, success: true, message: result.message });
          }
        } catch (error) {
          results.push({ id: expenseId, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      res.json({
        message: `${successCount} despesas atualizadas com sucesso${errorCount > 0 ? `, ${errorCount} com erro` : ''}`,
        results,
        summary: {
          total: expenseIds.length,
          success: successCount,
          errors: errorCount
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar status em lote:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor' 
      });
    }
  }
}

module.exports = new ExpenseController(); 