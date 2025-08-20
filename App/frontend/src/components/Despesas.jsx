import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ChartViewer from './ChartViewer';
import DateRangeFilter from './DateRangeFilter';
import FiltersToggle from './FiltersToggle';
import { despesaSchema, validateData, formatValidationErrors } from '../utils/validation';

const Despesas = () => {
  const [despesas, setDespesas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [stats, setStats] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    categoria_id: '',
    status: '',
    data_inicio: '',
    data_fim: ''
  });

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    valor: '',
    categoria_id: '',
    data_vencimento: '',
    recorrencia: 'nenhuma',
    data_fim_recorrencia: '',
    juros: 0,
    multa: 0
  });

  // Estado para controlar se a recorrência é infinita
  const [recorrenciaInfinita, setRecorrenciaInfinita] = useState(false);

  const recorrencias = [
    { value: 'nenhuma', label: 'Nenhuma' },
    { value: 'mensal', label: 'Mensal' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'semestral', label: 'Semestral' },
    { value: 'anual', label: 'Anual' }
  ];

  useEffect(() => {
    fetchCategorias();
    fetchDespesas();
    fetchStats();
  }, [filters]);

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
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const fetchDespesas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.mes) params.append('mes', filters.mes);
      if (filters.ano) params.append('ano', filters.ano);
      if (filters.categoria_id) params.append('categoria_id', filters.categoria_id);
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`/api/despesas?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDespesas(data.expenses);
      } else {
        setError('Erro ao carregar despesas');
      }
    } catch (error) {
      setError('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.mes) params.append('mes', filters.mes);
      if (filters.ano) params.append('ano', filters.ano);

      const response = await fetch(`/api/despesas/stats/overview?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      valor: '',
      categoria_id: '',
      data_vencimento: '',
      recorrencia: 'nenhuma',
      data_fim_recorrencia: '',
      juros: 0,
      multa: 0
    });
    setRecorrenciaInfinita(false);
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `/api/despesas/${editingId}` : '/api/despesas';
      const method = editingId ? 'PUT' : 'POST';

      // Preparar dados do formulário
      const submitData = {
        ...formData,
        valor: parseFloat(formData.valor),
        categoria_id: parseInt(formData.categoria_id),
        juros: parseFloat(formData.juros || 0),
        multa: parseFloat(formData.multa || 0)
      };

      // Se a recorrência for infinita ou data_fim_recorrencia estiver vazia, enviar null
      if (recorrenciaInfinita || !submitData.data_fim_recorrencia) {
        submitData.data_fim_recorrencia = null;
      }

      // Validar dados
      const validation = await validateData(despesaSchema, submitData);
      if (!validation.isValid) {
        setError(formatValidationErrors(validation.errors));
        return;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(validation.data)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingId ? 'Despesa atualizada com sucesso!' : 'Despesa criada com sucesso!');
        setShowModal(false);
        resetForm();
        fetchDespesas();
        fetchStats();
      } else {
        setError(data.error || data.details || 'Erro ao salvar despesa');
      }
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      setError('Erro ao salvar despesa');
    }
  };

  const handleEdit = (despesa) => {
    // Converter datas para formato yyyy-MM-dd
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toISOString().split('T')[0];
    };

    setFormData({
      titulo: despesa.titulo,
      descricao: despesa.descricao || '',
      valor: despesa.valor.toString(),
      categoria_id: despesa.categoria_id?.toString() || '',
      data_vencimento: formatDateForInput(despesa.data_vencimento),
      recorrencia: despesa.recorrencia || 'nenhuma',
      data_fim_recorrencia: formatDateForInput(despesa.data_fim_recorrencia),
      juros: despesa.juros?.toString() || '0',
      multa: despesa.multa?.toString() || '0'
    });
    setEditingId(despesa.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta despesa?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/despesas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccess('Despesa excluída com sucesso!');
        fetchDespesas();
        fetchStats();
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao excluir despesa');
      }
    } catch (error) {
      setError('Erro ao excluir despesa');
    }
  };

  const handlePagar = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/despesas/${id}/pagar`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccess('Despesa marcada como paga!');
        fetchDespesas();
        fetchStats();
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao marcar como paga');
      }
    } catch (error) {
      setError('Erro ao marcar como paga');
    }
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const formatCurrency = (value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || value === null || value === undefined) {
      return 'R$ 0,00';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  const safeValue = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '' || isNaN(value)) {
      return defaultValue;
    }
    const numValue = parseFloat(value);
    return isNaN(numValue) ? defaultValue : numValue;
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pago': return 'var(--success-color)';
      case 'pendente': return 'var(--warning-color)';
      case 'vencido': return 'var(--danger-color)';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pago': return 'fas fa-check-circle';
      case 'pendente': return 'fas fa-clock';
      case 'vencido': return 'fas fa-exclamation-triangle';
      default: return 'fas fa-question-circle';
    }
  };

  const prepareChartData = () => {
    // Dados para gráfico de pizza por categoria
    const categoriaData = (categorias || []).map(cat => {
      const total = (despesas || [])
        .filter(d => d.categoria_id === cat.id)
        .reduce((sum, d) => sum + safeValue(d.valor), 0);
      return {
        name: cat.nome || 'Sem categoria',
        value: safeValue(total),
        color: cat.cor
      };
    }).filter(item => item.value > 0);

    // Dados para gráfico de linha por mês - CORRIGIDO para usar 'name' e 'value'
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const linhaData = meses.map((mes, index) => {
      const total = (despesas || [])
        .filter(d => {
          if (!d.data_vencimento) return false;
          return new Date(d.data_vencimento).getMonth() === index;
        })
        .reduce((sum, d) => sum + safeValue(d.valor), 0);
        
      const pago = (despesas || [])
        .filter(d => {
          if (!d.data_vencimento) return false;
          return new Date(d.data_vencimento).getMonth() === index && d.status === 'pago';
        })
        .reduce((sum, d) => sum + safeValue(d.valor), 0);
        
      return {
        name: mes,  // CORRIGIDO: usar 'name' para compatibilidade
        value: safeValue(total), // CORRIGIDO: usar 'value' como chave principal
        total: safeValue(total),
        pago: safeValue(pago)
      };
    }).filter(item => item.value > 0); // Filtrar meses sem despesas

    console.log('Dados Despesas preparados:', { categoriaData, linhaData });
    return { categoriaData, linhaData };
  };

  const { categoriaData, linhaData } = prepareChartData();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando despesas...</p>
      </div>
    );
  }

  return (
    <div className="despesas-container">
      <div className="despesas-header">
        <div className="header-content">
          <h1>Gerenciar Despesas</h1>
          <button className="btn btn-primary btn-create" onClick={openModal}>
            <i className="fas fa-plus"></i>
            Nova Despesa
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}

      {/* Filtros */}
      <FiltersToggle title="Filtros de Despesas">
        <div className="filters-container">
          <div className="filters-header">
            <div>
              <h3 className="filters-title">
                Filtros de Despesas
                <span className="filters-count">
                  {Object.values(filters).filter(v => v !== '').length}
                </span>
              </h3>
              <p className="filters-subtitle">Filtre suas despesas por diferentes critérios</p>
            </div>
          </div>
          
          <div className="filters-row">
            <div className={`filter-group ${filters.categoria_id ? 'has-value' : ''}`} data-tooltip="Filtrar por categoria">
              <label>Categoria</label>
              <select
                className="form-control"
                value={filters.categoria_id}
                onChange={(e) => setFilters({...filters, categoria_id: e.target.value})}
              >
                <option value="">Todas</option>
                {(categorias || []).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            </div>

            <div className={`filter-group ${filters.status ? 'has-value' : ''}`} data-tooltip="Filtrar por status">
              <label>Status</label>
              <select
                className="form-control"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>
          </div>
        
        {/* Filtros de Data */}
        <DateRangeFilter
          filtros={filters}
          setFiltros={setFilters}
          title="Período"
          subtitle="Configure o período para filtrar as despesas"
          showQuickActions={true}
        />
        
        <div className="filter-actions">
          <div className="filter-actions-left">
            <button
              className="btn btn-secondary"
              onClick={() => setFilters({
                mes: new Date().getMonth() + 1,
                ano: new Date().getFullYear(),
                categoria_id: '',
                status: '',
                data_inicio: '',
                data_fim: ''
              })}
            >
              Limpar Filtros
            </button>
          </div>
          <div className="filter-actions-right">
            {/* Botão movido para o header */}
          </div>
        </div>
        </div>
      </FiltersToggle>

      {/* Estatísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{backgroundColor: 'var(--primary-color-alpha)'}}>
            <i className="fas fa-receipt" style={{color: 'var(--primary-color)'}}></i>
          </div>
          <div className="stat-content">
            <h3>Total de Despesas</h3>
            <p className="stat-value">{formatCurrency(stats.total_despesas || 0)}</p>
            <small>{stats.total_despesas || 0} registros</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{backgroundColor: 'var(--success-color-alpha)'}}>
            <i className="fas fa-check" style={{color: 'var(--success-color)'}}></i>
          </div>
          <div className="stat-content">
            <h3>Total Pago</h3>
            <p className="stat-value">{formatCurrency(stats.total_pago || 0)}</p>
            <small>{stats.total_pago || 0} registros</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{backgroundColor: 'var(--warning-color-alpha)'}}>
            <i className="fas fa-clock" style={{color: 'var(--warning-color)'}}></i>
          </div>
          <div className="stat-content">
            <h3>Total Pendente</h3>
            <p className="stat-value">{formatCurrency(stats.total_pendente || 0)}</p>
            <small>{stats.total_pendente || 0} registros</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{backgroundColor: 'var(--danger-color-alpha)'}}>
            <i className="fas fa-exclamation-triangle" style={{color: 'var(--danger-color)'}}></i>
          </div>
          <div className="stat-content">
            <h3>Total Vencido</h3>
            <p className="stat-value">{formatCurrency(stats.total_vencido || 0)}</p>
            <small>{stats.total_vencido || 0} registros</small>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-section">
        <ChartViewer
          data={categoriaData}
          title="Despesas por Categoria"
          subtitle="Distribuição das despesas por categoria"
          chartTypes={['pie', 'bar', 'area']}
          defaultType="pie"
          formatValue={(value) => {
            if (value === null || value === undefined || isNaN(value)) {
              return 'R$ 0,00';
            }
            return formatCurrency(value);
          }}
          colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']}
          xAxisKey="name"
          yAxisKey="value"
        />
        
        <ChartViewer
          data={linhaData}
          title="Evolução Mensal das Despesas"
          subtitle="Comparação entre total e pago"
          chartTypes={['line', 'area', 'bar']}
          defaultType="line"
          formatValue={(value) => {
            if (value === null || value === undefined || isNaN(value)) {
              return 'R$ 0,00';
            }
            return formatCurrency(value);
          }}
          xAxisKey="name"
          yAxisKey="value"
          multiSeries={true}
          seriesKeys={['total', 'pago']}
          colors={['#3b82f6', '#10b981']}
        />
      </div>

      {/* Lista de Despesas */}
      <div className="despesas-list">
        <h3>Lista de Despesas</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Recorrência</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {despesas.map((despesa) => (
                <tr key={despesa.id}>
                  <td>
                    <div className="despesa-info">
                      <strong>{despesa.titulo}</strong>
                      {despesa.descricao && (
                        <small>{despesa.descricao}</small>
                      )}
                    </div>
                  </td>
                  <td>
                    <span 
                      className="categoria-badge"
                      style={{backgroundColor: despesa.categoria_cor + '20', color: despesa.categoria_cor}}
                    >
                      {despesa.categoria_nome}
                    </span>
                  </td>
                  <td>
                    <strong>{formatCurrency(despesa.valor)}</strong>
                    {(despesa.juros > 0 || despesa.multa > 0) && (
                      <small className="text-muted">
                        + {formatCurrency((despesa.valor * despesa.juros / 100) + (despesa.valor * despesa.multa / 100))} (juros/multa)
                      </small>
                    )}
                  </td>
                  <td>{formatDate(despesa.data_vencimento)}</td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{color: getStatusColor(despesa.status)}}
                    >
                      <i className={getStatusIcon(despesa.status)}></i>
                      {despesa.status}
                    </span>
                  </td>
                  <td>
                    {despesa.recorrencia !== 'nenhuma' && (
                      <span className="recorrencia-badge">
                        {despesa.recorrencia}
                        {despesa.data_fim_recorrencia && (
                          <small> até {formatDate(despesa.data_fim_recorrencia)}</small>
                        )}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {despesa.status === 'pendente' && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handlePagar(despesa.id)}
                          title="Marcar como paga"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                      )}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEdit(despesa)}
                        title="Editar"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(despesa.id)}
                        title="Excluir"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {despesas.length === 0 && (
          <div className="empty-state">
            <i className="fas fa-receipt"></i>
            <h3>Nenhuma despesa encontrada</h3>
            <p>Crie sua primeira despesa para começar a controlar seus gastos!</p>
          </div>
        )}
      </div>

      {/* Modal de Despesa */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Despesa' : 'Nova Despesa'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="titulo">Título *</label>
                  <input
                    type="text"
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    placeholder="Ex: Conta de luz"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="valor">Valor *</label>
                  <input
                    type="number"
                    id="valor"
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    placeholder="0,00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="descricao">Descrição</label>
                <textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Descrição opcional da despesa"
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="categoria_id">Categoria *</label>
                  <select
                    id="categoria_id"
                    value={formData.categoria_id}
                    onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                    required
                  >
                    <option value="">Selecione uma categoria</option>
                    {(categorias || []).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="data_vencimento">Data de Vencimento *</label>
                  <input
                    type="date"
                    id="data_vencimento"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="recorrencia">Recorrência</label>
                  <select
                    id="recorrencia"
                    value={formData.recorrencia}
                    onChange={(e) => setFormData({...formData, recorrencia: e.target.value})}
                  >
                    {recorrencias.map(rec => (
                      <option key={rec.value} value={rec.value}>{rec.label}</option>
                    ))}
                  </select>
                </div>

                {!recorrenciaInfinita && (
                  <div className="form-group">
                    <label htmlFor="data_fim_recorrencia">Data Fim da Recorrência</label>
                    <input
                      type="date"
                      id="data_fim_recorrencia"
                      value={formData.data_fim_recorrencia}
                      onChange={(e) => setFormData({...formData, data_fim_recorrencia: e.target.value})}
                      placeholder="Opcional - deixe vazio para recorrência infinita"
                    />
                  </div>
                )}
                
                <div className="form-group">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      id="recorrencia_infinita"
                      checked={recorrenciaInfinita}
                      onChange={(e) => {
                        setRecorrenciaInfinita(e.target.checked);
                        if (e.target.checked) {
                          setFormData({...formData, data_fim_recorrencia: ''});
                        }
                      }}
                      className="form-check-input"
                    />
                    <label htmlFor="recorrencia_infinita" className="form-check-label">
                      Recorrência infinita
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="juros">Juros (%)</label>
                  <input
                    type="number"
                    id="juros"
                    value={formData.juros}
                    onChange={(e) => setFormData({...formData, juros: e.target.value})}
                    placeholder="0"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="multa">Multa (%)</label>
                  <input
                    type="number"
                    id="multa"
                    value={formData.multa}
                    onChange={(e) => setFormData({...formData, multa: e.target.value})}
                    placeholder="0"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i>
                  {editingId ? 'Atualizar' : 'Criar'} Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Despesas; 