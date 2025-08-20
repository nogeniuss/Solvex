const cron = require('node-cron');
const { query, queryOne } = require('../database');
const config = require('../config/notifications');
const NotificationService = require('./NotificationService');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class NotificationScheduler {
  constructor() {
    this.jobs = new Map();
    this.notificationService = new NotificationService();
  }

  // Inicializar todos os cron jobs
  init() {
    console.log('🚀 Inicializando agendadores de notificação...');
    
    // Verificar despesas vencidas diariamente às 9h
    this.scheduleDespesasVencidas();
    
    // Verificar metas vencendo diariamente às 10h
    this.scheduleMetasVencendo();
    
    // Relatório mensal no primeiro dia do mês às 8h
    this.scheduleRelatorioMensal();
    
    // Verificar conquistas diariamente às 11h
    this.scheduleConquistas();
    
    // Backup automático semanal (domingo às 2h)
    this.scheduleBackup();

    // Novos: lembretes
    this.scheduleReceitasHoje();
    this.scheduleDespesasHoje();
    this.scheduleInvestimentosResgateHoje();
    this.scheduleMetasAtualizacaoMensal();
    
    console.log('✅ Agendadores de notificação inicializados com sucesso!');
  }

  // Agendar verificação de despesas vencidas
  scheduleDespesasVencidas() {
    const job = cron.schedule(config.schedule.despesasVencidas, async () => {
      console.log('🔍 Verificando despesas vencidas...');
      await this.verificarDespesasVencidas();
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });

    this.jobs.set('despesasVencidas', job);
  }

  // Agendar verificação de metas vencendo
  scheduleMetasVencendo() {
    const job = cron.schedule(config.schedule.metasVencendo, async () => {
      console.log('🔍 Verificando metas vencendo...');
      await this.verificarMetasVencendo();
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });

    this.jobs.set('metasVencendo', job);
  }

  // Agendar relatório mensal
  scheduleRelatorioMensal() {
    const job = cron.schedule(config.schedule.relatorioMensal, async () => {
      console.log('📊 Gerando relatório mensal...');
      await this.gerarRelatorioMensal();
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });

    this.jobs.set('relatorioMensal', job);
  }

  // Agendar verificação de conquistas
  scheduleConquistas() {
    const job = cron.schedule(config.schedule.conquistas, async () => {
      console.log('🏆 Verificando conquistas...');
      await this.verificarConquistas();
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });

    this.jobs.set('conquistas', job);
  }

  // Agendar backup automático
  scheduleBackup() {
    const job = cron.schedule(config.schedule.backup, async () => {
      console.log('💾 Executando backup automático...');
      await this.executarBackup();
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });

    this.jobs.set('backup', job);
  }

  // Novos agendamentos
  scheduleReceitasHoje() {
    const job = cron.schedule(config.schedule.receitasHoje, async () => {
      console.log('📥 Verificando receitas a receber hoje...');
      await this.verificarReceitasHoje();
    }, { scheduled: true, timezone: 'America/Sao_Paulo' });
    this.jobs.set('receitasHoje', job);
  }

  scheduleDespesasHoje() {
    const job = cron.schedule(config.schedule.despesasHoje, async () => {
      console.log('💸 Verificando despesas a pagar hoje...');
      await this.verificarDespesasHoje();
    }, { scheduled: true, timezone: 'America/Sao_Paulo' });
    this.jobs.set('despesasHoje', job);
  }

  scheduleInvestimentosResgateHoje() {
    const job = cron.schedule(config.schedule.investimentosResgateHoje, async () => {
      console.log('🏦 Verificando investimentos com resgate hoje...');
      await this.verificarInvestimentosResgateHoje();
    }, { scheduled: true, timezone: 'America/Sao_Paulo' });
    this.jobs.set('investimentosResgateHoje', job);
  }

  scheduleMetasAtualizacaoMensal() {
    const job = cron.schedule(config.schedule.metasAtualizacaoMensal, async () => {
      console.log('📌 Enviando lembrete mensal para atualizar metas...');
      await this.enviarLembreteAtualizacaoMetas();
    }, { scheduled: true, timezone: 'America/Sao_Paulo' });
    this.jobs.set('metasAtualizacaoMensal', job);
  }

  // Verificar receitas a receber hoje (não recebidas, data == hoje)
  async verificarReceitasHoje() {
    try {
      const receitasHoje = await query(`
        SELECT r.*, u.email, u.nome
        FROM receitas r
        JOIN users u ON u.id = r.user_id
        WHERE r.status = 'pendente' AND DATE(r.data_recebimento) = CURDATE()
      `);

      for (const r of receitasHoje) {
        await this.notificationService.sendEmail({
          to: r.email,
          subject: '📥 Lembrete: Receita prevista para hoje',
          html: this.notificationService.processTemplate(`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">📥 Receita prevista para hoje</h2>
              <p>Olá <strong>{{nome}}</strong>,</p>
              <p>Está prevista a entrada da receita: <strong>{{titulo}}</strong> no valor de <strong>R$ {{valor}}</strong>.</p>
              <p>Data prevista: {{data}}</p>
            </div>
          `, { nome: r.nome, titulo: r.titulo, valor: Number(r.valor).toFixed(2), data: r.data_recebimento })
        });
        await sleep(config.email.sendDelayMs);
      }

      console.log(`✅ Lembretes de receitas enviados: ${receitasHoje.length}`);
    } catch (error) {
      console.error('❌ Erro ao verificar receitas de hoje:', error);
    }
  }

  // Verificar despesas a pagar hoje (não pagas, data == hoje)
  async verificarDespesasHoje() {
    try {
      const despesasHoje = await query(`
        SELECT d.*, u.email, u.nome, c.nome as categoria_nome
        FROM despesas d
        JOIN users u ON u.id = d.user_id
        LEFT JOIN categorias c ON c.id = d.categoria_id
        WHERE d.status = 'pendente' AND DATE(d.data_vencimento) = CURDATE()
      `);

      for (const d of despesasHoje) {
        await this.notificationService.sendEmail({
          to: d.email,
          subject: '💸 Lembrete: Despesa vence hoje',
          html: this.notificationService.processTemplate(`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">💸 Despesa vence hoje</h2>
              <p>Olá <strong>{{nome}}</strong>,</p>
              <p>Vence hoje a despesa: <strong>{{titulo}}</strong> no valor de <strong>R$ {{valor}}</strong>.</p>
              <p>Categoria: {{categoria}}</p>
              <p>Data de vencimento: {{data}}</p>
            </div>
          `, { nome: d.nome, titulo: d.titulo, valor: Number(d.valor).toFixed(2), categoria: d.categoria_nome || 'Sem categoria', data: d.data_vencimento })
        });
        await sleep(config.email.sendDelayMs);
      }

      console.log(`✅ Lembretes de despesas enviados: ${despesasHoje.length}`);
    } catch (error) {
      console.error('❌ Erro ao verificar despesas de hoje:', error);
    }
  }

  // Verificar investimentos com data de resgate hoje (status ativo, data_resgate == hoje)
  async verificarInvestimentosResgateHoje() {
    try {
      const investimentosHoje = await query(`
        SELECT i.*, u.email, u.nome, c.nome as categoria_nome
        FROM investimentos i
        JOIN users u ON u.id = i.user_id
        LEFT JOIN categorias c ON c.id = i.categoria_id
        WHERE i.status = 'ativo' AND i.data_resgate IS NOT NULL AND DATE(i.data_resgate) = CURDATE()
      `);

      for (const i of investimentosHoje) {
        await this.notificationService.sendEmail({
          to: i.email,
          subject: '🏦 Lembrete: Resgate de investimento hoje',
          html: this.notificationService.processTemplate(`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1d4ed8;">🏦 Resgate de investimento hoje</h2>
              <p>Olá <strong>{{nome}}</strong>,</p>
              <p>Seu investimento <strong>{{titulo}}</strong> está com resgate previsto para hoje.</p>
              <p>Instituição: {{instituicao}}</p>
              <p>Valor inicial: R$ {{valor}}</p>
              <p>Data de resgate: {{data}}</p>
            </div>
          `, { nome: i.nome, titulo: i.titulo, instituicao: i.instituicao || '-', valor: Number(i.valor_inicial).toFixed(2), data: i.data_resgate })
        });
        await sleep(config.email.sendDelayMs);
      }

      console.log(`✅ Lembretes de investimentos enviados: ${investimentosHoje.length}`);
    } catch (error) {
      console.error('❌ Erro ao verificar resgates de investimentos de hoje:', error);
    }
  }

  // Lembrete mensal para atualizar metas (para metas ativas e não expiradas)
  async enviarLembreteAtualizacaoMetas() {
    try {
      const metas = await query(`
        SELECT m.*, u.email, u.nome
        FROM metas m
        JOIN users u ON u.id = m.user_id
        WHERE m.status = 'ativa' AND (m.data_fim IS NULL OR DATE(m.data_fim) >= CURDATE())
      `);

      for (const m of metas) {
        await this.notificationService.sendEmail({
          to: m.email,
          subject: '📌 Atualize o progresso da sua meta',
          html: this.notificationService.processTemplate(`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #d97706;">📌 Atualize sua meta</h2>
              <p>Olá <strong>{{nome}}</strong>,</p>
              <p>Não se esqueça de atualizar o progresso da meta <strong>{{titulo}}</strong>.</p>
              <p>Data início: {{data_inicio}} | Data final: {{data_fim}}</p>
            </div>
          `, { nome: m.nome, titulo: m.titulo, data_inicio: m.data_inicio || '-', data_fim: m.data_fim || '-' })
        });
        await sleep(config.email.sendDelayMs);
      }

      console.log(`✅ Lembretes de atualização de metas enviados: ${metas.length}`);
    } catch (error) {
      console.error('❌ Erro ao enviar lembretes de atualização de metas:', error);
    }
  }

  // Verificar despesas vencidas
  async verificarDespesasVencidas() {
    try {
      // Buscar usuários com despesas vencidas
      const usuariosComDespesasVencidas = await query(`
        SELECT DISTINCT u.id, u.nome, u.email
        FROM users u
        JOIN despesas d ON u.id = d.user_id
        WHERE d.status = 'pendente' 
        AND d.data_vencimento < CURDATE()
        AND d.data_vencimento >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      `);

      for (const usuario of usuariosComDespesasVencidas) {
        // Buscar despesas vencidas do usuário
        const despesasVencidas = await query(`
          SELECT d.*, c.nome as categoria_nome
          FROM despesas d
          LEFT JOIN categorias c ON d.categoria_id = c.id
          WHERE d.user_id = ? 
          AND d.status = 'pendente' 
          AND d.data_vencimento < CURDATE()
          ORDER BY d.data_vencimento ASC
        `, [usuario.id]);

        if (despesasVencidas.length > 0) {
          // Enviar notificação para cada despesa vencida
          for (const despesa of despesasVencidas) {
            await this.notificationService.sendEmail({
              to: usuario.email,
              subject: config.templates.despesaVencida.subject,
              template: 'despesaVencida',
              data: {
                nome: usuario.nome,
                titulo: despesa.titulo,
                valor: Number(despesa.valor || 0).toFixed(2),
                data_vencimento: despesa.data_vencimento,
                categoria: despesa.categoria_nome || 'Sem categoria',
                descricao: despesa.descricao
              }
            });
            await sleep(config.email.sendDelayMs);
          }
        }
      }

      console.log(`✅ Verificação de despesas vencidas concluída. ${usuariosComDespesasVencidas.length} usuários notificados.`);
    } catch (error) {
      console.error('❌ Erro ao verificar despesas vencidas:', error);
    }
  }

  // Verificar metas vencendo
  async verificarMetasVencendo() {
    try {
      const diasAlerta = config.alerts.metasVencimento;
      
      // Buscar usuários com metas vencendo
      const usuariosComMetasVencendo = await query(`
        SELECT DISTINCT u.id, u.nome, u.email
        FROM users u
        JOIN metas m ON u.id = m.user_id
        WHERE m.status = 'ativa' 
        AND m.data_fim BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      `, [diasAlerta]);

      for (const usuario of usuariosComMetasVencendo) {
        // Buscar metas vencendo do usuário
        const metasVencendo = await query(`
          SELECT m.*, c.nome as categoria_nome
          FROM metas m
          LEFT JOIN categorias c ON m.categoria_id = c.id
          WHERE m.user_id = ? 
          AND m.status = 'ativa' 
          AND m.data_fim BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
          ORDER BY m.data_fim ASC
        `, [usuario.id, diasAlerta]);

        if (metasVencendo.length > 0) {
          // Enviar notificação para cada meta vencendo
          for (const meta of metasVencendo) {
            const progresso = ((meta.valor_atual / meta.valor_meta) * 100).toFixed(1);
            const diasRestantes = Math.ceil((new Date(meta.data_fim) - new Date()) / (1000 * 60 * 60 * 24));

            await this.notificationService.sendEmail({
              to: usuario.email,
              subject: config.templates.metaVencimento.subject,
              template: 'metaVencimento',
              data: {
                nome: usuario.nome,
                titulo: meta.titulo,
                valor_meta: meta.valor_meta.toFixed(2),
                valor_atual: meta.valor_atual.toFixed(2),
                progresso,
                data_fim: meta.data_fim,
                dias_restantes: diasRestantes
              }
            });
          }
        }
      }

      console.log(`✅ Verificação de metas vencendo concluída. ${usuariosComMetasVencendo.length} usuários notificados.`);
    } catch (error) {
      console.error('❌ Erro ao verificar metas vencendo:', error);
    }
  }

  // Gerar relatório mensal
  async gerarRelatorioMensal() {
    try {
      const mesAnterior = new Date();
      mesAnterior.setMonth(mesAnterior.getMonth() - 1);
      const mes = mesAnterior.getMonth() + 1;
      const ano = mesAnterior.getFullYear();

      // Buscar todos os usuários ativos (ajuste de coluna)
      const usuarios = await query("SELECT id, nome, email FROM users WHERE status = 'ativo'");

      for (const usuario of usuarios) {
        // Buscar dados do mês anterior
        const dados = await this.buscarDadosMensais(usuario.id, mes, ano);
        
        if (dados) {
          await this.notificationService.sendEmail({
            to: usuario.email,
            subject: config.templates.relatorioMensal.subject,
            template: 'relatorioMensal',
            data: dados
          });
        }
      }

      console.log(`✅ Relatório mensal enviado para ${usuarios.length} usuários.`);
    } catch (error) {
      console.error('❌ Erro ao gerar relatório mensal:', error);
    }
  }

  // Verificar conquistas
  async verificarConquistas() {
    try {
      // Buscar conquistas do dia (sem depender de coluna notificado)
      const novasConquistas = await query(`
        SELECT c.*, u.nome, u.email
        FROM conquistas c
        JOIN users u ON c.user_id = u.id
        WHERE c.data_conquista >= CURDATE()
      `);

      for (const conquista of novasConquistas) {
        await this.notificationService.sendEmail({
          to: conquista.email,
          subject: config.templates.conquista.subject,
          template: 'conquista',
          data: {
            nome: conquista.nome,
            titulo: conquista.titulo,
            descricao: conquista.descricao,
            pontos: conquista.pontos
          }
        });

        // Campo notificado não existe no schema atual; nenhuma atualização necessária
      }

      console.log(`✅ Verificação de conquistas concluída. ${novasConquistas.length} conquistas notificadas.`);
    } catch (error) {
      console.error('❌ Erro ao verificar conquistas:', error);
    }
  }

  // Executar backup automático
  async executarBackup() {
    try {
      const { exec } = require('child_process');
      const fs = require('fs');
      const path = require('path');

      const backupDir = path.join(__dirname, '../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

      // Comando para fazer backup do MySQL
      const command = `mysqldump -h ${process.env.DB_HOST || 'localhost'} -u ${process.env.DB_USER || 'root'} -p${process.env.DB_PASSWORD || ''} ${process.env.DB_NAME || 'financas'} > ${backupFile}`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Erro ao executar backup:', error);
          return;
        }
        console.log(`✅ Backup criado com sucesso: ${backupFile}`);
      });
    } catch (error) {
      console.error('❌ Erro ao executar backup:', error);
    }
  }

  // Buscar dados mensais do usuário
  async buscarDadosMensais(userId, mes, ano) {
    try {
      // Receitas do mês
      const receitas = await queryOne(`
        SELECT COUNT(*) as total, SUM(valor) as valor_total
        FROM receitas 
        WHERE user_id = ? AND MONTH(data_recebimento) = ? AND YEAR(data_recebimento) = ?
      `, [userId, mes, ano]);

      // Despesas do mês
      const despesas = await queryOne(`
        SELECT COUNT(*) as total, SUM(valor) as valor_total
        FROM despesas 
        WHERE user_id = ? AND MONTH(data_vencimento) = ? AND YEAR(data_vencimento) = ?
      `, [userId, mes, ano]);

      // Investimentos ativos
      const investimentos = await queryOne(`
        SELECT COUNT(*) as total, SUM(valor_atual) as valor_total
        FROM investimentos 
        WHERE user_id = ? AND status = 'ativo'
      `, [userId]);

      // Metas ativas
      const metas = await queryOne(`
        SELECT COUNT(*) as total
        FROM metas 
        WHERE user_id = ? AND status = 'ativa'
      `, [userId]);

      // Conquistas do mês
      const conquistas = await queryOne(`
        SELECT COUNT(*) as total
        FROM conquistas 
        WHERE user_id = ? AND MONTH(data_conquista) = ? AND YEAR(data_conquista) = ?
      `, [userId, mes, ano]);

      // Despesas vencidas
      const despesasVencidas = await queryOne(`
        SELECT COUNT(*) as total
        FROM despesas 
        WHERE user_id = ? AND status = 'pendente' AND data_vencimento < CURDATE()
      `, [userId]);

      // Metas vencendo
      const metasVencendo = await queryOne(`
        SELECT COUNT(*) as total
        FROM metas 
        WHERE user_id = ? AND status = 'ativa' AND data_fim BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      `, [userId]);

      const saldo = (receitas.valor_total || 0) - (despesas.valor_total || 0);

      return {
        receitas_total: (receitas.valor_total || 0).toFixed(2),
        despesas_total: (despesas.valor_total || 0).toFixed(2),
        saldo: saldo.toFixed(2),
        investimentos_total: (investimentos.valor_total || 0).toFixed(2),
        metas_ativas: metas.total || 0,
        conquistas_novas: conquistas.total || 0,
        despesas_vencidas: despesasVencidas.total || 0,
        metas_vencendo: metasVencendo.total || 0
      };
    } catch (error) {
      console.error('Erro ao buscar dados mensais:', error);
      return null;
    }
  }

  // Parar todos os cron jobs
  stop() {
    console.log('🛑 Parando agendadores de notificação...');
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`✅ Job ${name} parado`);
    });
    this.jobs.clear();
  }

  // Listar jobs ativos
  getActiveJobs() {
    const activeJobs = [];
    this.jobs.forEach((job, name) => {
      activeJobs.push({
        name,
        running: job.running,
        nextDate: job.nextDate()
      });
    });
    return activeJobs;
  }
}

module.exports = NotificationScheduler; 