const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { authenticateToken } = require('./auth');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.csv');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// GET - Listar importações do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const importacoes = await query(`
      SELECT * FROM importacoes 
      WHERE user_id = ?
      ORDER BY data_importacao DESC
      LIMIT 20
    `, [userId]);

    res.json({ importacoes });
  } catch (error) {
    console.error('Erro ao buscar importações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST - Upload e processamento de CSV
router.post('/upload', authenticateToken, upload.single('arquivo'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { mapeamento, tipo_importacao } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    if (!mapeamento) {
      return res.status(400).json({ error: 'Mapeamento de colunas é obrigatório' });
    }

    const mapeamentoObj = JSON.parse(mapeamento);
    const resultados = await processarCSV(req.file.path, mapeamentoObj, tipo_importacao, userId);

    // Salvar registro da importação
    await query(`
      INSERT INTO importacoes (
        nome_arquivo, tipo_importacao, total_registros, registros_importados,
        registros_com_erro, mapeamento, user_id, data_importacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      req.file.originalname,
      tipo_importacao,
      resultados.total,
      resultados.importados,
      resultados.erros,
      mapeamento,
      userId
    ]);

    // Limpar arquivo temporário
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Importação concluída com sucesso',
      resultados: resultados
    });
  } catch (error) {
    console.error('Erro ao processar importação:', error);
    
    // Limpar arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Erro ao processar importação' });
  }
});

// POST - Validar mapeamento antes da importação
router.post('/validar', authenticateToken, upload.single('arquivo'), async (req, res) => {
  try {
    const { mapeamento } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const mapeamentoObj = JSON.parse(mapeamento);
    const amostra = await lerAmostraCSV(req.file.path, 5);

    // Validar se as colunas mapeadas existem no CSV
    const colunasCSV = Object.keys(amostra[0] || {});
    const colunasMapeadas = Object.values(mapeamentoObj);
    const colunasInvalidas = colunasMapeadas.filter(col => !colunasCSV.includes(col));

    if (colunasInvalidas.length > 0) {
      return res.status(400).json({
        error: 'Colunas não encontradas no arquivo',
        colunas_invalidas: colunasInvalidas,
        colunas_disponiveis: colunasCSV
      });
    }

    // Limpar arquivo temporário
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Mapeamento válido',
      amostra: amostra,
      colunas_disponiveis: colunasCSV
    });
  } catch (error) {
    console.error('Erro ao validar mapeamento:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Erro ao validar mapeamento' });
  }
});

// GET - Templates de mapeamento
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const templates = {
      nubank: {
        nome: 'Nubank',
        mapeamento: {
          data: 'data',
          descricao: 'descricao',
          valor: 'valor',
          categoria: 'categoria'
        },
        exemplo: [
          { data: '2024-01-15', descricao: 'Supermercado', valor: '-150.00', categoria: 'Alimentação' },
          { data: '2024-01-16', descricao: 'Salário', valor: '5000.00', categoria: 'Receita' }
        ]
      },
      itau: {
        nome: 'Itaú',
        mapeamento: {
          data: 'Data',
          descricao: 'Histórico',
          valor: 'Valor',
          categoria: 'Categoria'
        },
        exemplo: [
          { Data: '15/01/2024', Historico: 'Pagamento', Valor: '-150,00', Categoria: 'Compras' },
          { Data: '16/01/2024', Historico: 'Depósito', Valor: '5000,00', Categoria: 'Receita' }
        ]
      },
      bradesco: {
        nome: 'Bradesco',
        mapeamento: {
          data: 'Data',
          descricao: 'Descrição',
          valor: 'Valor',
          categoria: 'Tipo'
        },
        exemplo: [
          { Data: '15/01/2024', Descrição: 'Pagamento', Valor: '-150,00', Tipo: 'Débito' },
          { Data: '16/01/2024', Descrição: 'Depósito', Valor: '5000,00', Tipo: 'Crédito' }
        ]
      }
    };

    res.json({ templates });
  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para processar CSV
async function processarCSV(arquivoPath, mapeamento, tipoImportacao, userId) {
  const resultados = {
    total: 0,
    importados: 0,
    erros: 0,
    detalhes: []
  };

  return new Promise((resolve, reject) => {
    const registros = [];
    
    fs.createReadStream(arquivoPath)
      .pipe(csv())
      .on('data', (row) => {
        registros.push(row);
        resultados.total++;
      })
      .on('end', async () => {
        try {
          for (const registro of registros) {
            try {
              await processarRegistro(registro, mapeamento, tipoImportacao, userId);
              resultados.importados++;
            } catch (error) {
              resultados.erros++;
              resultados.detalhes.push({
                linha: resultados.total,
                erro: error.message,
                dados: registro
              });
            }
          }
          resolve(resultados);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

// Função para ler amostra do CSV
async function lerAmostraCSV(arquivoPath, linhas) {
  return new Promise((resolve, reject) => {
    const amostra = [];
    
    fs.createReadStream(arquivoPath)
      .pipe(csv())
      .on('data', (row) => {
        if (amostra.length < linhas) {
          amostra.push(row);
        }
      })
      .on('end', () => resolve(amostra))
      .on('error', reject);
  });
}

// Função para processar registro individual
async function processarRegistro(registro, mapeamento, tipoImportacao, userId) {
  try {
    // Extrair dados do registro usando o mapeamento
    const data = parsearData(registro[mapeamento.data]);
    const descricao = registro[mapeamento.descricao] || '';
    const valor = parsearValor(registro[mapeamento.valor]);
    const categoriaNome = registro[mapeamento.categoria] || 'Importado';

    // Determinar tipo baseado no valor
    const tipo = valor >= 0 ? 'receita' : 'despesa';
    const valorAbsoluto = Math.abs(valor);

    // Buscar ou criar categoria
    let categoriaId = null;
    if (categoriaNome) {
      const categoriaExistente = await queryOne(`
        SELECT id FROM categorias WHERE nome = ? AND user_id = ?
      `, [categoriaNome, userId]);

      if (categoriaExistente) {
        categoriaId = categoriaExistente.id;
      } else {
        // Criar nova categoria
        const novaCategoria = await query(`
          INSERT INTO categorias (nome, user_id, origem) VALUES (?, ?, 'importada')
        `, [categoriaNome, userId]);
        categoriaId = novaCategoria.insertId;
      }
    }

    // Inserir lançamento
    if (tipo === 'receita') {
      await query(`
        INSERT INTO receitas (
          titulo, descricao, valor, categoria_id, user_id, 
          data_recebimento, status, origem_importacao, created_date
        ) VALUES (?, ?, ?, ?, ?, ?, 'pendente', 'csv', NOW())
      `, [descricao, descricao, valorAbsoluto, categoriaId, userId, data]);
    } else {
      await query(`
        INSERT INTO despesas (
          titulo, descricao, valor, categoria_id, user_id, 
          data_vencimento, status, origem_importacao, created_date
        ) VALUES (?, ?, ?, ?, ?, ?, 'pendente', 'csv', NOW())
      `, [descricao, descricao, valorAbsoluto, categoriaId, userId, data]);
    }
  } catch (error) {
    throw new Error(`Erro ao processar registro: ${error.message}`);
  }
}

// Função para parsear data
function parsearData(dataString) {
  if (!dataString) return new Date().toISOString().split('T')[0];
  
  // Tentar diferentes formatos
  const formatos = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
  ];

  for (const formato of formatos) {
    if (formato.test(dataString)) {
      if (dataString.includes('/')) {
        const [dia, mes, ano] = dataString.split('/');
        return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      } else if (dataString.includes('-')) {
        if (dataString.length === 10) {
          return dataString;
        }
      }
    }
  }

  return new Date().toISOString().split('T')[0];
}

// Função para parsear valor
function parsearValor(valorString) {
  if (!valorString) return 0;
  
  // Remover caracteres não numéricos exceto vírgula e ponto
  const valorLimpo = valorString.toString().replace(/[^\d,.-]/g, '');
  
  // Converter vírgula para ponto se necessário
  const valorNumerico = valorLimpo.replace(',', '.');
  
  return parseFloat(valorNumerico) || 0;
}

module.exports = router; 