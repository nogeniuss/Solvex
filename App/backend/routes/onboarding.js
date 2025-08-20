const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { authenticateToken } = require('./auth');

// GET - Status do onboarding do usuário
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const status = await verificarStatusOnboarding(userId);
    
    res.json({ status });
  } catch (error) {
    console.error('Erro ao verificar status do onboarding:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Marcar etapa como concluída
router.post('/etapa/:etapa', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const etapa = req.params.etapa;
    
    await marcarEtapaConcluida(userId, etapa);
    
    res.json({ message: 'Etapa marcada como concluída' });
  } catch (error) {
    console.error('Erro ao marcar etapa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Próximos passos recomendados
router.get('/proximos-passos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const proximosPassos = await gerarProximosPassos(userId);
    
    res.json({ proximos_passos: proximosPassos });
  } catch (error) {
    console.error('Erro ao gerar próximos passos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Evento de ativação
router.post('/ativacao', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tipo_ativacao } = req.body;
    
    await registrarAtivacao(userId, tipo_ativacao);
    
    res.json({ message: 'Ativação registrada com sucesso' });
  } catch (error) {
    console.error('Erro ao registrar ativação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET - Dicas personalizadas
router.get('/dicas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const dicas = await gerarDicasPersonalizadas(userId);
    
    res.json({ dicas });
  } catch (error) {
    console.error('Erro ao gerar dicas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para verificar status do onboarding
async function verificarStatusOnboarding(userId) {
  try {
    // Verificar se o usuário já tem dados básicos
    const temReceitas = await queryOne(`
      SELECT COUNT(*) as total FROM receitas WHERE user_id = ?
    `, [userId]);

    const temDespesas = await queryOne(`
      SELECT COUNT(*) as total FROM despesas WHERE user_id = ?
    `, [userId]);

    const temCategorias = await queryOne(`
      SELECT COUNT(*) as total FROM categorias WHERE user_id = ?
    `, [userId]);

    const temMetas = await queryOne(`
      SELECT COUNT(*) as total FROM metas WHERE user_id = ?
    `, [userId]);

    const temInvestimentos = await queryOne(`
      SELECT COUNT(*) as total FROM investimentos WHERE user_id = ?
    `, [userId]);

    // Calcular progresso geral
    const etapas = [
      { nome: 'cadastro', concluida: true, peso: 10 },
      { nome: 'primeira_receita', concluida: temReceitas.total > 0, peso: 20 },
      { nome: 'primeira_despesa', concluida: temDespesas.total > 0, peso: 20 },
      { nome: 'categorias_personalizadas', concluida: temCategorias.total > 0, peso: 15 },
      { nome: 'primeira_meta', concluida: temMetas.total > 0, peso: 20 },
      { nome: 'primeiro_investimento', concluida: temInvestimentos.total > 0, peso: 15 }
    ];

    const progresso = etapas.reduce((total, etapa) => {
      return total + (etapa.concluida ? etapa.peso : 0);
    }, 0);

    const status = {
      progresso: progresso,
      etapas: etapas,
      completo: progresso >= 80,
      nivel: progresso < 30 ? 'iniciante' : progresso < 60 ? 'intermediario' : 'avancado'
    };

    return status;
  } catch (error) {
    console.error('Erro ao verificar status do onboarding:', error);
    return { progresso: 0, etapas: [], completo: false, nivel: 'iniciante' };
  }
}

// Função para marcar etapa como concluída
async function marcarEtapaConcluida(userId, etapa) {
  try {
    // Verificar se já existe registro
    const existente = await queryOne(`
      SELECT * FROM onboarding_etapas WHERE user_id = ? AND etapa = ?
    `, [userId, etapa]);

    if (!existente) {
      await query(`
        INSERT INTO onboarding_etapas (user_id, etapa, data_conclusao)
        VALUES (?, ?, NOW())
      `, [userId, etapa]);
    }
  } catch (error) {
    console.error('Erro ao marcar etapa:', error);
  }
}

// Função para gerar próximos passos
async function gerarProximosPassos(userId) {
  const passos = [];
  
  try {
    const status = await verificarStatusOnboarding(userId);
    
    // Verificar etapas não concluídas
    const etapasPendentes = status.etapas.filter(etapa => !etapa.concluida);
    
    if (etapasPendentes.length > 0) {
      etapasPendentes.forEach(etapa => {
        switch (etapa.nome) {
          case 'primeira_receita':
            passos.push({
              titulo: 'Registrar sua primeira receita',
              descricao: 'Comece registrando seu salário ou outras fontes de renda',
              acao: 'Ir para Receitas',
              rota: '/receitas',
              prioridade: 'alta'
            });
            break;
          
          case 'primeira_despesa':
            passos.push({
              titulo: 'Registrar sua primeira despesa',
              descricao: 'Registre suas despesas para começar a controlar seus gastos',
              acao: 'Ir para Despesas',
              rota: '/despesas',
              prioridade: 'alta'
            });
            break;
          
          case 'categorias_personalizadas':
            passos.push({
              titulo: 'Criar categorias personalizadas',
              descricao: 'Organize suas transações com categorias que façam sentido para você',
              acao: 'Ir para Categorias',
              rota: '/categorias',
              prioridade: 'media'
            });
            break;
          
          case 'primeira_meta':
            passos.push({
              titulo: 'Definir sua primeira meta financeira',
              descricao: 'Estabeleça objetivos para manter o foco e motivação',
              acao: 'Ir para Metas',
              rota: '/metas',
              prioridade: 'media'
            });
            break;
          
          case 'primeiro_investimento':
            passos.push({
              titulo: 'Registrar seu primeiro investimento',
              descricao: 'Comece a acompanhar seus investimentos e patrimônio',
              acao: 'Ir para Investimentos',
              rota: '/investimentos',
              prioridade: 'baixa'
            });
            break;
        }
      });
    } else {
      // Usuário já completou o onboarding básico
      passos.push({
        titulo: 'Explorar relatórios avançados',
        descricao: 'Descubra insights detalhados sobre suas finanças',
        acao: 'Ir para Relatórios',
        rota: '/relatorios',
        prioridade: 'media'
      });
      
      passos.push({
        titulo: 'Configurar recorrências',
        descricao: 'Automatize lançamentos recorrentes como contas mensais',
        acao: 'Configurar Recorrências',
        rota: '/recorrencias',
        prioridade: 'baixa'
      });
    }

  } catch (error) {
    console.error('Erro ao gerar próximos passos:', error);
  }

  return passos;
}

// Função para registrar ativação
async function registrarAtivacao(userId, tipoAtivacao) {
  try {
    await query(`
      INSERT INTO ativacoes (user_id, tipo_ativacao, data_ativacao)
      VALUES (?, ?, NOW())
    `, [userId, tipoAtivacao]);

    // Verificar se é a primeira ativação
    const totalAtivacoes = await queryOne(`
      SELECT COUNT(*) as total FROM ativacoes WHERE user_id = ?
    `, [userId]);

    if (totalAtivacoes.total === 1) {
      // Primeira ativação - marcar usuário como ativo
      await query(`
        UPDATE users SET status = 'ativo', data_ativacao = NOW()
        WHERE id = ?
      `, [userId]);
    }
  } catch (error) {
    console.error('Erro ao registrar ativação:', error);
  }
}

// Função para gerar dicas personalizadas
async function gerarDicasPersonalizadas(userId) {
  const dicas = [];
  
  try {
    const status = await verificarStatusOnboarding(userId);
    
    // Dicas baseadas no nível do usuário
    if (status.nivel === 'iniciante') {
      dicas.push({
        titulo: 'Comece pequeno',
        descricao: 'Não tente registrar tudo de uma vez. Comece com as transações mais importantes.',
        categoria: 'dica_iniciante'
      });
      
      dicas.push({
        titulo: 'Use categorias',
        descricao: 'Categorizar suas despesas ajuda a identificar onde você gasta mais dinheiro.',
        categoria: 'dica_iniciante'
      });
    } else if (status.nivel === 'intermediario') {
      dicas.push({
        titulo: 'Defina metas realistas',
        descricao: 'Metas muito ambiciosas podem desmotivar. Comece com objetivos menores e aumente gradualmente.',
        categoria: 'dica_intermediario'
      });
      
      dicas.push({
        titulo: 'Analise seus relatórios',
        descricao: 'Use os relatórios para identificar padrões e oportunidades de economia.',
        categoria: 'dica_intermediario'
      });
    } else {
      dicas.push({
        titulo: 'Diversifique investimentos',
        descricao: 'Considere diferentes tipos de investimentos para reduzir riscos.',
        categoria: 'dica_avancado'
      });
      
      dicas.push({
        titulo: 'Automatize processos',
        descricao: 'Use recorrências para não esquecer de registrar transações regulares.',
        categoria: 'dica_avancado'
      });
    }

    // Dicas baseadas no comportamento
    const ultimaTransacao = await queryOne(`
      SELECT created_date FROM (
        SELECT created_date FROM receitas WHERE user_id = ?
        UNION ALL
        SELECT created_date FROM despesas WHERE user_id = ?
      ) as transacoes
      ORDER BY created_date DESC
      LIMIT 1
    `, [userId, userId]);

    if (ultimaTransacao) {
      const diasDesdeUltimaTransacao = Math.floor((new Date() - new Date(ultimaTransacao.created_date)) / (1000 * 60 * 60 * 24));
      
      if (diasDesdeUltimaTransacao > 3) {
        dicas.push({
          titulo: 'Mantenha o hábito',
          descricao: 'Registrar transações regularmente é fundamental para o controle financeiro.',
          categoria: 'dica_comportamento'
        });
      }
    }

  } catch (error) {
    console.error('Erro ao gerar dicas:', error);
  }

  return dicas;
}

module.exports = router; 