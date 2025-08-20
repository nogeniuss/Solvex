import React, { useEffect, useMemo, useState } from 'react';

const Importacao = () => {
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [sample, setSample] = useState([]);
  const [mapping, setMapping] = useState({ data: '', descricao: '', valor: '', categoria: '' });
  const [templates, setTemplates] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetch('/api/importacao/templates', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || {});
        }
      } catch (e) {
        // ignore silently
      }
    };
    loadTemplates();
  }, [token]);

  const handleTemplateChange = (e) => {
    const key = e.target.value;
    setSelectedTemplate(key);
    if (key && templates[key]) {
      setMapping(templates[key].mapeamento || { data: '', descricao: '', valor: '', categoria: '' });
    }
  };

  const onFileChange = async (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setSample([]);
    setColumns([]);
    setResult(null);
    setError('');

    if (!f) return;

    // Call backend /validar to get sample and columns
    setValidating(true);
    try {
      const form = new FormData();
      form.append('arquivo', f);
      // send empty mapping; backend returns sample and columns
      form.append('mapeamento', JSON.stringify({}));

      const res = await fetch('/api/importacao/validar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha na validação');
      }

      const data = await res.json();
      setSample(data.amostra || []);
      setColumns(data.colunas_disponiveis || Object.keys((data.amostra && data.amostra[0]) || {}));

      // If template selected, try auto-fill mapping using first row columns
      if (selectedTemplate && templates[selectedTemplate]) {
        setMapping(templates[selectedTemplate].mapeamento || mapping);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleMappingChange = (field, value) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const handleImport = async () => {
    setError('');
    setResult(null);

    if (!file) {
      setError('Selecione um arquivo CSV.');
      return;
    }

    // Basic validation
    const required = ['data', 'descricao', 'valor'];
    const missing = required.filter((k) => !mapping[k]);
    if (missing.length) {
      setError(`Mapeie as colunas obrigatórias: ${missing.join(', ')}`);
      return;
    }

    setImporting(true);
    try {
      const form = new FormData();
      form.append('arquivo', file);
      form.append('mapeamento', JSON.stringify(mapping));
      form.append('tipo_importacao', 'extrato_bancario');

      const res = await fetch('/api/importacao/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao importar');

      setResult(data.resultados || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page-container importacao-container" style={{ padding: '1.5rem' }}>
      <div className="page-header importacao-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>Importação de Extrato</h2>
      </div>

      <div className="card" style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-primary)', boxShadow: 'var(--shadow-md)', marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="importacao-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Template (opcional)</label>
              <select value={selectedTemplate} onChange={handleTemplateChange} style={{ width: '100%', padding: '0.5rem' }}>
                <option value="">Selecione...</option>
                {Object.entries(templates).map(([key, t]) => (
                  <option key={key} value={key}>{t.nome}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 2, minWidth: '280px' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Arquivo CSV</label>
              <input type="file" accept=".csv,text/csv" onChange={onFileChange} />
            </div>
            <div>
              <button disabled={!file || validating} onClick={onFileChange} style={{ padding: '0.6rem 1rem' }}>
                {validating ? 'Validando...' : 'Revalidar' }
              </button>
            </div>
          </div>

          {!!columns.length && (
            <div className="importacao-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Data</label>
                <select value={mapping.data} onChange={(e) => handleMappingChange('data', e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                  <option value="">Selecione a coluna...</option>
                  {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Descrição</label>
                <select value={mapping.descricao} onChange={(e) => handleMappingChange('descricao', e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                  <option value="">Selecione a coluna...</option>
                  {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Valor</label>
                <select value={mapping.valor} onChange={(e) => handleMappingChange('valor', e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                  <option value="">Selecione a coluna...</option>
                  {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Categoria (opcional)</label>
                <select value={mapping.categoria} onChange={(e) => handleMappingChange('categoria', e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                  <option value="">Selecione a coluna...</option>
                  {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {!!sample.length && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Amostra (primeiras linhas)</div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {Object.keys(sample[0] || {}).map((k) => (
                        <th key={k} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--border-color)' }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sample.map((row, idx) => (
                      <tr key={idx}>
                        {Object.keys(sample[0] || {}).map((k) => (
                          <td key={k} style={{ padding: 8, borderBottom: '1px solid var(--border-color)', fontFamily: 'monospace' }}>{row[k]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: 'var(--danger-color)', fontWeight: 600 }}>{error}</div>
          )}

          <div className="importacao-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button disabled={!file || importing} onClick={handleImport} style={{ padding: '0.6rem 1rem', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: 6 }}>
              {importing ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="card" style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-primary)', boxShadow: 'var(--shadow-md)' }}>
          <h3 style={{ marginTop: 0 }}>Resultado</h3>
          <div className="importacao-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div><strong>Total</strong><div>{result.total}</div></div>
            <div><strong>Importados</strong><div>{result.importados}</div></div>
            <div><strong>Erros</strong><div>{result.erros}</div></div>
            <div><strong>Status</strong><div>{result.erros > 0 ? 'Concluído com erros' : 'Concluído'}</div></div>
          </div>
          {Array.isArray(result.detalhes) && result.detalhes.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Erros</div>
              <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 8 }}>
                {result.detalhes.map((d, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>Linha {d.linha}: {d.erro}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{JSON.stringify(d.dados)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
        Observação: valores positivos serão importados como receitas e valores negativos como despesas. Datas aceitas: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY.
      </div>
    </div>
  );
};

export default Importacao; 