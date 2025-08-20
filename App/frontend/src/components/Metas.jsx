import React, { useState, useEffect } from 'react';
import ChartViewer from './ChartViewer';
import FiltersToggle from './FiltersToggle';
import DateRangeFilter from './DateRangeFilter';

const Metas = () => {
  const [loading, setLoading] = useState(true);
  const [metas, setMetas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMeta, setEditingMeta] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filtros, setFiltros] = useState({
    status: 'todas',
    tipo: 'todos',
    mes: null,
    ano: null,
    data_inicio: '',
    data_fim: ''
  });

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    valor_meta: '',
    tipo_meta: 'economia',
    data_limite: '',
    categoria_id: ''
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    fetchMetas();
    fetchCategorias();
  }, [filtros]);

  const fetchMetas = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        ano: new Date().getFullYear(),
        mes: new Date().getMonth() + 1
      });

      const response = await fetch(`/api/metas?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMetas(data.metas);
      }
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      setError('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categorias', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCategorias(data.categories || []);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingMeta ? `/api/metas/${editingMeta.id}` : '/api/metas';
      const method = editingMeta ? 'PUT' : 'POST';

      // Preparar dados para envio
      const submitData = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        valor_meta: parseFloat(formData.valor_meta),
        tipo: formData.tipo_meta, // Backend espera 'tipo', não 'tipo_meta'
        data_fim: formData.data_limite, // Backend espera 'data_fim', não 'data_limite'
        categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
        status: editingMeta ? editingMeta.status : 'ativa'
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        setSuccess(editingMeta ? 'Meta atualizada com sucesso!' : 'Meta criada com sucesso!');
        resetForm();
        fetchMetas();
      } else {
        const errorData = await response.json();
        setError(errorData.error || errorData.details || 'Erro ao salvar meta');
      }
    } catch (error) {
      console.error('Erro:', error);
      setError('Erro ao salvar meta');
    }
  };

  const handleEdit = (meta) => {
    setEditingMeta(meta);
    setFormData({
      titulo: meta.titulo,
      descricao: meta.descricao || '',
      valor_meta: meta.valor_meta,
      tipo_meta: meta.tipo || meta.tipo_meta, // O backend retorna 'tipo'
      data_limite: meta.data_fim ? meta.data_fim.split('T')[0] : '', // O backend retorna 'data_fim'
      categoria_id: meta.categoria_id || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (metaId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta meta?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/metas/${metaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccess('Meta excluída com sucesso!');
        fetchMetas();
      } else {
        setError('Erro ao excluir meta');
      }
    } catch (error) {
      console.error('Erro:', error);
      setError('Erro ao excluir meta');
    }
  };

  const handleUpdateProgress = async (metaId, novoValor) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/metas/${metaId}/progresso`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ valor_atual: novoValor })
      });

      if (response.ok) {
        setSuccess('Progresso da meta atualizado com sucesso!');
        fetchMetas();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao atualizar progresso');
      }
    } catch (error) {
      console.error('Erro:', error);
      setError('Erro ao atualizar progresso');
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      valor_meta: '',
      tipo_meta: 'economia',
      data_limite: '',
      categoria_id: ''
    });
    setEditingMeta(null);
    setShowForm(false);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercentage = (value) => {
    return `${parseFloat(value).toFixed(2)}%`;
  };

  const getTipoLabel = (tipo) => {
    const tipos = {
      economia: 'Economia',
      investimento: 'Investimento',
      receita: 'Receita',
      reducao_despesas: 'Redução de Despesas'
    };
    return tipos[tipo] || tipo;
  };

  const getStatusBadge = (status, percentual) => {
    if (percentual >= 100) {
      return { text: 'Concluída', color: 'var(--success-color)' };
    }
    
    const statusConfig = {
      ativa: { text: 'Ativa', color: 'var(--primary-color)' },
      pausada: { text: 'Pausada', color: 'var(--warning-color)' },
      cancelada: { text: 'Cancelada', color: 'var(--danger-color)' },
      concluida: { text: 'Concluída', color: 'var(--success-color)' }
    };
    
    return statusConfig[status] || { text: status, color: 'var(--text-secondary)' };
  };

  const getProgressColor = (percentual) => {
    if (percentual >= 100) return 'var(--success-color)';
    if (percentual >= 75) return 'var(--warning-color)';
    if (percentual >= 50) return 'var(--info-color)';
    return 'var(--danger-color)';
  };

  // Filtrar metas
  const metasFiltradas = metas.filter(meta => {
    if (filtros.status !== 'todas' && meta.status !== filtros.status) return false;
    if (filtros.tipo !== 'todos' && meta.tipo_meta !== filtros.tipo) return false;
    return true;
  });

  // Preparar dados para gráficos
  const prepareChartData = () => {
    const porTipo = metasFiltradas.reduce((acc, meta) => {
      const tipo = getTipoLabel(meta.tipo || meta.tipo_meta);
      if (!acc[tipo]) {
        acc[tipo] = { tipo, total: 0, concluidas: 0, ativas: 0 };
      }
      acc[tipo].total++;
      if (parseFloat(meta.percentual) >= 100) {
        acc[tipo].concluidas++;
      } else {
        acc[tipo].ativas++;
      }
      return acc;
    }, {});

    return Object.values(porTipo);
  };

  const chartData = prepareChartData();

  if (loading) {
    return (
      <div className="main-content">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando metas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="container">
        <div className="welcome-card">
          <div className="header-content">
            <div>
              <h2>Metas Financeiras</h2>
              <p>Defina e acompanhe seus objetivos financeiros com insights personalizados.</p>
            </div>
            <button className="btn btn-primary btn-create" onClick={() => setShowForm(true)}>
              <i className="fas fa-plus"></i>
              Nova Meta
            </button>
          </div>
        </div>

        {/* Filtros */}
        <FiltersToggle title="Filtros de Metas">
          <div className="filters-container">
            <div className="filters-header">
              <div>
                <h3 className="filters-title">
                  Filtros de Metas
                  <span className="filters-count">
                    {Object.values(filtros).filter(v => v !== 'todas' && v !== 'todos').length}
                  </span>
                </h3>
                <p className="filters-subtitle">Filtre suas metas por status e tipo</p>
              </div>
            </div>
          
          <div className="filters-row">
            <div className={`filter-group ${filtros.status !== 'todas' ? 'has-value' : ''}`} data-tooltip="Filtrar por status da meta">
              <label>Status</label>
              <select
                className="form-control"
                value={filtros.status}
                onChange={(e) => setFiltros({...filtros, status: e.target.value})}
              >
                <option value="todas">Todas</option>
                <option value="ativa">Ativas</option>
                <option value="concluida">Concluídas</option>
                <option value="pausada">Pausadas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>
            
            <div className={`filter-group ${filtros.tipo !== 'todos' ? 'has-value' : ''}`} data-tooltip="Filtrar por tipo de meta">
              <label>Tipo</label>
              <select
                className="form-control"
                value={filtros.tipo}
                onChange={(e) => setFiltros({...filtros, tipo: e.target.value})}
              >
                <option value="todos">Todos</option>
                <option value="economia">Economia</option>
                <option value="investimento">Investimento</option>
                <option value="receita">Receita</option>
                <option value="reducao_despesas">Redução de Despesas</option>
              </select>
            </div>
          </div>
          
          {/* Filtros de Data */}
          <DateRangeFilter
            filtros={filtros}
            setFiltros={setFiltros}
            title="Período"
            subtitle="Configure o período para filtrar as metas"
            showQuickActions={true}
          />
          
          <div className="filter-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setFiltros({
                status: 'todas',
                tipo: 'todos',
                mes: null,
                ano: null,
                data_inicio: '',
                data_fim: ''
              })}
            >
              Limpar Filtros
            </button>
            {/* Botão movido para o header */}
          </div>
        </div>
        </FiltersToggle>

        {/* Alertas */}
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}
        
        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {/* Formulário */}
        {showForm && (
          <div className="welcome-card">
            <h3>{editingMeta ? 'Editar Meta' : 'Nova Meta'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Título *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.titulo}
                      onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Tipo de Meta *</label>
                    <select
                      className="form-control"
                      value={formData.tipo_meta}
                      onChange={(e) => setFormData({...formData, tipo_meta: e.target.value})}
                      required
                    >
                      <option value="economia">Economia</option>
                      <option value="investimento">Investimento</option>
                      <option value="receita">Receita</option>
                      <option value="reducao_despesas">Redução de Despesas</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  className="form-control"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Valor da Meta *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.valor_meta}
                      onChange={(e) => setFormData({...formData, valor_meta: e.target.value})}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Data Limite</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.data_limite}
                      onChange={(e) => setFormData({...formData, data_limite: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Categoria</label>
                    <select
                      className="form-control"
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                    >
                      <option value="">Selecione uma categoria</option>
                      {(categorias || []).map(categoria => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingMeta ? 'Atualizar' : 'Criar'} Meta
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Gráficos */}
        {metasFiltradas.length > 0 && (
          <div className="charts-section">
            <ChartViewer
              data={chartData}
              title="Metas por Tipo"
              subtitle="Distribuição de metas ativas e concluídas por tipo"
              chartTypes={['bar', 'line', 'area']}
              defaultType="bar"
              formatValue={(value) => value}
              xAxisKey="tipo"
              yAxisKey="total"
              multiSeries={[
                { key: 'ativas', name: 'Ativas', color: '#3B82F6' },
                { key: 'concluidas', name: 'Concluídas', color: '#10B981' }
              ]}
              colors={['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B']}
            />
            
            <ChartViewer
              data={[
                { name: 'Ativas', value: metasFiltradas.filter(m => m.status === 'ativa').length },
                { name: 'Concluídas', value: metasFiltradas.filter(m => m.status === 'concluida').length },
                { name: 'Pausadas', value: metasFiltradas.filter(m => m.status === 'pausada').length },
                { name: 'Canceladas', value: metasFiltradas.filter(m => m.status === 'cancelada').length }
              ]}
              title="Distribuição por Status"
              subtitle="Proporção de metas por status"
              chartTypes={['pie', 'bar', 'area']}
              defaultType="pie"
              formatValue={(value) => value}
              colors={COLORS}
            />
          </div>
        )}

        {/* Lista de Metas */}
        <div className="col-md-12">
          <div className="welcome-card">
          <h3>Suas Metas</h3>
          {metasFiltradas.length > 0 ? (
            <div className="metas-grid">
              {metasFiltradas.map((meta) => (
                <div key={meta.id} className="meta-card">
                  <div className="meta-header">
                    <h4>{meta.titulo}</h4>
                    <div className="meta-actions">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEdit(meta)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(meta.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  
                  <div className="meta-content">
                    <p className="meta-descricao">{meta.descricao || 'Sem descrição'}</p>
                    
                    <div className="meta-info">
                      <div className="meta-tipo">
                        <span className="badge" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                          {getTipoLabel(meta.tipo || meta.tipo_meta)}
                        </span>
                      </div>
                      
                      <div className="meta-status">
                        <span className="badge" style={{ 
                          backgroundColor: getStatusBadge(meta.status, meta.percentual).color, 
                          color: 'white' 
                        }}>
                          {getStatusBadge(meta.status, meta.percentual).text}
                        </span>
                      </div>
                    </div>
                    
                    <div className="meta-progresso">
                      <div className="progresso-header">
                        <span>Progresso</span>
                        <span>{formatPercentage(meta.percentual)}</span>
                      </div>
                      
                      <div className="progresso-bar">
                        <div
                          className="progresso-fill"
                          style={{
                            width: `${Math.min(meta.percentual, 100)}%`,
                            backgroundColor: getProgressColor(meta.percentual)
                          }}
                        />
                      </div>
                      
                      <div className="progresso-valores">
                        <span>{formatCurrency(meta.progresso)}</span>
                        <span>{formatCurrency(meta.valor_meta)}</span>
                      </div>
                    </div>
                    
                    {meta.data_limite && (
                      <div className="meta-prazo">
                        <small>Prazo: {new Date(meta.data_limite).toLocaleDateString('pt-BR')}</small>
                        {meta.dias_restantes !== null && meta.dias_restantes > 0 && (
                          <small style={{ color: 'var(--warning-color)' }}>
                            • Faltam {meta.dias_restantes} dias
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
              <h4>Nenhuma meta encontrada</h4>
              <p>Crie sua primeira meta financeira para começar a acompanhar seus objetivos!</p>
              <button
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                Criar Primeira Meta
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Metas; 