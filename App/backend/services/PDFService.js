const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { query } = require('../database');
const logger = require('../config/logger');

class PDFService {
  constructor() {
    this.outputDir = path.join(__dirname, '../reports');
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // Gerar relatório mensal em PDF
  async generateMonthlyReport(userId, mes, ano) {
    try {
      const filename = `relatorio-mensal-${userId}-${ano}-${mes.toString().padStart(2, '0')}.pdf`;
      const filepath = path.join(this.outputDir, filename);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Buscar dados do mês
      const dados = await this.getMonthlyData(userId, mes, ano);

      // Cabeçalho
      this.addHeader(doc, `Relatório Mensal - ${this.getMonthName(mes)}/${ano}`);

      // Resumo executivo
      this.addExecutiveSummary(doc, dados);

      // Receitas
      this.addRevenuesSection(doc, dados.receitas);

      // Despesas
      this.addExpensesSection(doc, dados.despesas);

      // Investimentos
      this.addInvestmentsSection(doc, dados.investimentos);

      // Metas
      this.addGoalsSection(doc, dados.metas);

      // Gráficos (simulados)
      this.addChartsSection(doc, dados);

      // Rodapé
      this.addFooter(doc);

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          logger.info('Monthly report PDF generated', { userId, mes, ano, filename });
          resolve({ filename, filepath });
        });
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error generating monthly report PDF:', error);
      throw error;
    }
  }

  // Gerar relatório anual em PDF
  async generateAnnualReport(userId, ano) {
    try {
      const filename = `relatorio-anual-${userId}-${ano}.pdf`;
      const filepath = path.join(this.outputDir, filename);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Buscar dados do ano
      const dados = await this.getAnnualData(userId, ano);

      // Cabeçalho
      this.addHeader(doc, `Relatório Anual - ${ano}`);

      // Resumo executivo anual
      this.addAnnualExecutiveSummary(doc, dados);

      // Evolução mensal
      this.addMonthlyEvolution(doc, dados.evolucaoMensal);

      // Análise de categorias
      this.addCategoryAnalysis(doc, dados.analiseCategorias);

      // Investimentos
      this.addAnnualInvestments(doc, dados.investimentos);

      // Metas e conquistas
      this.addAnnualGoals(doc, dados.metas);

      // Projeções
      this.addProjections(doc, dados.projecoes);

      // Rodapé
      this.addFooter(doc);

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          logger.info('Annual report PDF generated', { userId, ano, filename });
          resolve({ filename, filepath });
        });
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Error generating annual report PDF:', error);
      throw error;
    }
  }

  // Adicionar cabeçalho
  addHeader(doc, title) {
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('Sistema Financeiro Pessoal', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(18)
       .font('Helvetica')
       .text(title, { align: 'center' })
       .moveDown(2);

    doc.fontSize(10)
       .font('Helvetica')
       .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'right' })
       .moveDown(2);
  }

  // Adicionar resumo executivo
  addExecutiveSummary(doc, dados) {
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Resumo Executivo')
       .moveDown(1);

    const saldo = dados.totalReceitas - dados.totalDespesas;
    const saldoColor = saldo >= 0 ? 'green' : 'red';

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Receitas Totais: R$ ${dados.totalReceitas.toFixed(2)}`)
       .text(`Despesas Totais: R$ ${dados.totalDespesas.toFixed(2)}`)
       .text(`Saldo: R$ ${saldo.toFixed(2)}`, { color: saldoColor })
       .moveDown(1);

    doc.text(`Total de Transações: ${dados.totalTransacoes}`)
       .text(`Investimentos: R$ ${dados.totalInvestimentos.toFixed(2)}`)
       .text(`Metas Ativas: ${dados.metasAtivas}`)
       .moveDown(2);
  }

  // Adicionar seção de receitas
  addRevenuesSection(doc, receitas) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Receitas')
       .moveDown(1);

    if (receitas.length === 0) {
      doc.fontSize(10)
         .font('Helvetica')
         .text('Nenhuma receita registrada neste período.')
         .moveDown(2);
      return;
    }

    receitas.forEach((receita, index) => {
      doc.fontSize(10)
         .font('Helvetica')
         .text(`${index + 1}. ${receita.titulo}`)
         .fontSize(9)
         .text(`   Valor: R$ ${receita.valor.toFixed(2)} | Data: ${receita.data_recebimento} | Categoria: ${receita.categoria || 'Sem categoria'}`)
         .moveDown(0.5);
    });

    doc.moveDown(1);
  }

  // Adicionar seção de despesas
  addExpensesSection(doc, despesas) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Despesas')
       .moveDown(1);

    if (despesas.length === 0) {
      doc.fontSize(10)
         .font('Helvetica')
         .text('Nenhuma despesa registrada neste período.')
         .moveDown(2);
      return;
    }

    despesas.forEach((despesa, index) => {
      doc.fontSize(10)
         .font('Helvetica')
         .text(`${index + 1}. ${despesa.titulo}`)
         .fontSize(9)
         .text(`   Valor: R$ ${despesa.valor.toFixed(2)} | Vencimento: ${despesa.data_vencimento} | Status: ${despesa.status} | Categoria: ${despesa.categoria || 'Sem categoria'}`)
         .moveDown(0.5);
    });

    doc.moveDown(1);
  }

  // Adicionar seção de investimentos
  addInvestmentsSection(doc, investimentos) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Investimentos')
       .moveDown(1);

    if (investimentos.length === 0) {
      doc.fontSize(10)
         .font('Helvetica')
         .text('Nenhum investimento registrado neste período.')
         .moveDown(2);
      return;
    }

    investimentos.forEach((investimento, index) => {
      doc.fontSize(10)
         .font('Helvetica')
         .text(`${index + 1}. ${investimento.titulo}`)
         .fontSize(9)
         .text(`   Valor: R$ ${investimento.valor_inicial.toFixed(2)} | Tipo: ${investimento.tipo} | Rentabilidade: ${investimento.rentabilidade}%`)
         .moveDown(0.5);
    });

    doc.moveDown(1);
  }

  // Adicionar seção de metas
  addGoalsSection(doc, metas) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Metas')
       .moveDown(1);

    if (metas.length === 0) {
      doc.fontSize(10)
         .font('Helvetica')
         .text('Nenhuma meta registrada.')
         .moveDown(2);
      return;
    }

    metas.forEach((meta, index) => {
      const progresso = (meta.valor_atual / meta.valor_meta) * 100;
      const status = progresso >= 100 ? 'Concluída' : 'Em andamento';

      doc.fontSize(10)
         .font('Helvetica')
         .text(`${index + 1}. ${meta.titulo}`)
         .fontSize(9)
         .text(`   Meta: R$ ${meta.valor_meta.toFixed(2)} | Atual: R$ ${meta.valor_atual.toFixed(2)} | Progresso: ${progresso.toFixed(1)}% | Status: ${status}`)
         .moveDown(0.5);
    });

    doc.moveDown(1);
  }

  // Adicionar seção de gráficos (simulada)
  addChartsSection(doc, dados) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Análise Gráfica')
       .moveDown(1);

    doc.fontSize(10)
       .font('Helvetica')
       .text('Gráficos e visualizações disponíveis no sistema web.')
       .text('Este relatório contém apenas os dados tabulares.')
       .moveDown(2);
  }

  // Adicionar rodapé
  addFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      doc.fontSize(8)
         .font('Helvetica')
         .text(
           'Sistema Financeiro Pessoal - Relatório Gerado Automaticamente',
           50,
           doc.page.height - 50,
           { align: 'center', width: doc.page.width - 100 }
         );
    }
  }

  // Buscar dados mensais
  async getMonthlyData(userId, mes, ano) {
    const [receitas, despesas, investimentos, metas] = await Promise.all([
      query(`
        SELECT r.*, c.nome as categoria
        FROM receitas r
        LEFT JOIN categorias c ON r.categoria_id = c.id
        WHERE r.user_id = ? AND MONTH(r.data_recebimento) = ? AND YEAR(r.data_recebimento) = ?
        ORDER BY r.data_recebimento DESC
      `, [userId, mes, ano]),
      query(`
        SELECT d.*, c.nome as categoria
        FROM despesas d
        LEFT JOIN categorias c ON d.categoria_id = c.id
        WHERE d.user_id = ? AND MONTH(d.data_vencimento) = ? AND YEAR(d.data_vencimento) = ?
        ORDER BY d.data_vencimento DESC
      `, [userId, mes, ano]),
      query(`
        SELECT i.*, c.nome as categoria
        FROM investimentos i
        LEFT JOIN categorias c ON i.categoria_id = c.id
        WHERE i.user_id = ? AND MONTH(i.data_inicio) = ? AND YEAR(i.data_inicio) = ?
        ORDER BY i.data_inicio DESC
      `, [userId, mes, ano]),
      query(`
        SELECT * FROM metas
        WHERE user_id = ? AND status = 'ativa'
        ORDER BY data_fim ASC
      `, [userId])
    ]);

    const totalReceitas = receitas.reduce((sum, r) => sum + parseFloat(r.valor), 0);
    const totalDespesas = despesas.reduce((sum, d) => sum + parseFloat(d.valor), 0);
    const totalInvestimentos = investimentos.reduce((sum, i) => sum + parseFloat(i.valor_inicial), 0);

    return {
      receitas,
      despesas,
      investimentos,
      metas,
      totalReceitas,
      totalDespesas,
      totalInvestimentos,
      totalTransacoes: receitas.length + despesas.length,
      metasAtivas: metas.length
    };
  }

  // Buscar dados anuais
  async getAnnualData(userId, ano) {
    // Implementação similar ao getMonthlyData mas para o ano inteiro
    return {
      evolucaoMensal: [],
      analiseCategorias: [],
      investimentos: [],
      metas: [],
      projecoes: []
    };
  }

  // Obter nome do mês
  getMonthName(mes) {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes - 1];
  }
}

module.exports = new PDFService(); 