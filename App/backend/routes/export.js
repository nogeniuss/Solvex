const express = require('express');
const router = express.Router();
const { query } = require('../database');
const { authenticateToken } = require('./auth');

function buildPeriodFilter(periodo, dateColumn) {
  switch (periodo) {
    case 'mes_atual':
      return `MONTH(${dateColumn}) = MONTH(CURDATE()) AND YEAR(${dateColumn}) = YEAR(CURDATE())`;
    case 'trimestre_atual':
      return `${dateColumn} >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)`;
    case 'ano_atual':
      return `YEAR(${dateColumn}) = YEAR(CURDATE())`;
    case 'todos':
    default:
      return '1=1';
  }
}

function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  const headerLine = headers.join(',');
  const dataLines = rows.map(r => headers.map(h => escape(r[h])).join(','));
  return [headerLine, ...dataLines].join('\n');
}

router.post('/csv', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tipo, periodo = 'todos' } = req.body || {};

    if (!tipo || !['despesas', 'receitas', 'categorias', 'metas'].includes(tipo)) {
      return res.status(400).json({ error: 'Parametro tipo inválido' });
    }

    let sql = '';
    let params = [userId];
    let filename = `${tipo}-${new Date().toISOString().slice(0,10)}.csv`;

    if (tipo === 'despesas') {
      const wherePeriod = buildPeriodFilter(periodo, 'd.data_vencimento');
      sql = `
        SELECT d.id, d.titulo, d.descricao, d.valor, d.status, d.recorrencia,
               d.data_vencimento, d.data_pagamento, c.nome AS categoria
        FROM despesas d
        LEFT JOIN categorias c ON c.id = d.categoria_id
        WHERE d.user_id = ? AND ${wherePeriod}
        ORDER BY d.data_vencimento DESC, d.id DESC
      `;
    }

    if (tipo === 'receitas') {
      const wherePeriod = buildPeriodFilter(periodo, 'r.data_recebimento');
      sql = `
        SELECT r.id, r.titulo, r.descricao, r.valor, r.valor_liquido, r.status, r.recorrencia,
               r.data_recebimento, r.data_recebimento_real, c.nome AS categoria
        FROM receitas r
        LEFT JOIN categorias c ON c.id = r.categoria_id
        WHERE r.user_id = ? AND ${wherePeriod}
        ORDER BY r.data_recebimento DESC, r.id DESC
      `;
    }

    if (tipo === 'categorias') {
      sql = `
        SELECT c.id, c.nome, c.descricao, c.cor, c.icone, c.created_date
        FROM categorias c
        WHERE (c.user_id = ? OR c.user_id IS NULL) AND c.deleted_at IS NULL
        ORDER BY c.nome ASC
      `;
    }

    if (tipo === 'metas') {
      const wherePeriod = buildPeriodFilter(periodo, 'm.data_inicio');
      sql = `
        SELECT m.id, m.titulo, m.descricao, m.tipo, m.valor_meta, m.valor_atual, m.status,
               m.data_inicio, m.data_fim, c.nome AS categoria
        FROM metas m
        LEFT JOIN categorias c ON c.id = m.categoria_id
        WHERE m.user_id = ? AND ${wherePeriod}
        ORDER BY m.data_inicio DESC, m.id DESC
      `;
    }

    const rows = await query(sql, params);
    const csv = toCSV(rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Erro na exportação CSV:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 