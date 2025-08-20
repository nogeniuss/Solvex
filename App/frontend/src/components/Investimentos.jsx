import React, { useState, useEffect, useMemo } from 'react'
import ChartViewer from './ChartViewer'
import DateRangeFilter from './DateRangeFilter'
import FiltersToggle from './FiltersToggle'

const Investimentos = () => {
  const [investimentos, setInvestimentos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtros, setFiltros] = useState({
    mes: null,
    ano: null,
    data_inicio: '',
    data_fim: ''
  })
  const [stats, setStats] = useState(null)

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    valor_inicial: '',
    data_inicio: '',
    categoria_id: '',
    tipo_investimento: 'renda_fixa',
    rentabilidade: '',
    data_resgate: '',
    instituicao: '',
    observacoes: ''
  })

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  useEffect(() => {
    fetchInvestimentos()
    fetchCategorias()
    fetchStats()
  }, [filtroStatus, filtroCategoria])

  const fetchInvestimentos = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      const url = `/api/investimentos?${new URLSearchParams({
        ...(filtroStatus && { status: filtroStatus }),
        ...(filtroCategoria && { categoria_id: filtroCategoria })
      }).toString()}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setInvestimentos(data.investimentos || [])
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao carregar investimentos')
      }
    } catch (error) {
      console.error('Erro ao carregar investimentos:', error)
      setError('Erro de conexão ao carregar investimentos')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategorias = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/categorias', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCategorias(data.categories || [])
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/investimentos/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const url = editingId 
        ? `/api/investimentos/${editingId}`
        : '/api/investimentos'
      
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        setShowModal(false)
        resetForm()
        fetchInvestimentos()
        fetchStats()
      } else {
        setError(data.error || 'Erro ao salvar investimento')
      }
    } catch (error) {
      setError('Erro de conexão')
    }
  }

  const handleEdit = (investimento) => {
    // Converter datas para formato yyyy-MM-dd
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toISOString().split('T')[0];
    };

    setFormData({
      titulo: investimento.titulo,
      descricao: investimento.descricao || '',
      valor_inicial: investimento.valor_inicial,
      data_inicio: formatDateForInput(investimento.data_inicio),
      categoria_id: investimento.categoria_id || '',
      tipo_investimento: investimento.tipo_investimento || 'renda_fixa',
      rentabilidade: investimento.rentabilidade || '',
      data_resgate: formatDateForInput(investimento.data_resgate),
      instituicao: investimento.instituicao || '',
      observacoes: investimento.observacoes || ''
    })
    setEditingId(investimento.id)
    setShowModal(true)
  }

  const handleDelete = async (investimento) => {
    if (!window.confirm('Tem certeza que deseja excluir este investimento?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/investimentos/${investimento.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setSuccess('Investimento excluído com sucesso')
        fetchInvestimentos()
        fetchStats()
      } else {
        setError('Erro ao excluir investimento')
      }
    } catch (error) {
      setError('Erro de conexão')
    }
  }

  const handleResgatar = async (id) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/investimentos/${id}/resgatar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setSuccess('Investimento marcado como resgatado')
        fetchInvestimentos()
        fetchStats()
      } else {
        setError('Erro ao marcar como resgatado')
      }
    } catch (error) {
      setError('Erro de conexão')
    }
  }

  const openModal = () => {
    resetForm()
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      valor_inicial: '',
      data_inicio: '',
      categoria_id: '',
      tipo_investimento: 'renda_fixa',
      rentabilidade: '',
      data_resgate: '',
      instituicao: '',
      observacoes: ''
    })
    setEditingId(null)
  }

  const handleCancel = () => {
    closeModal()
  }

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
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getTipoLabel = (tipo) => {
    const tipos = {
      acoes: 'Ações',
      renda_fixa: 'Renda Fixa',
      fundos_imobiliarios: 'Fundos Imobiliários',
      tesouro_direto: 'Tesouro Direto',
      criptomoedas: 'Criptomoedas',
      outros: 'Outros'
    }
    return tipos[tipo] || tipo
  }

  const getStatusBadge = (status) => {
    const configs = {
      ativo: { label: 'Ativo', color: 'var(--success-color)' },
      resgatado: { label: 'Resgatado', color: 'var(--info-color)' },
      cancelado: { label: 'Cancelado', color: 'var(--danger-color)' }
    }
    return configs[status] || { label: status, color: 'var(--border-color)' }
  }

  const calcularPerformance = (investimento) => {
    const valorInicial = safeValue(investimento.valor_inicial);
    const rendimentoEsperado = safeValue(investimento.rentabilidade);
    const dataInvestimento = new Date(investimento.data_inicio || Date.now());
    const hoje = new Date();
    
    const mesesInvestido = Math.max(0, (hoje.getFullYear() - dataInvestimento.getFullYear()) * 12 + 
                          (hoje.getMonth() - dataInvestimento.getMonth()));
    
    const rendimentoMensal = rendimentoEsperado / 12 / 100;
    const valorAtual = valorInicial * Math.pow(1 + rendimentoMensal, mesesInvestido);
    const lucro = valorAtual - valorInicial;
    const percentualLucro = valorInicial > 0 ? (lucro / valorInicial) * 100 : 0;
    
    return {
      valorAtual: safeValue(valorAtual),
      lucro: safeValue(lucro),
      percentualLucro: safeValue(percentualLucro)
    };
  };

  // Projeção mensal do investimento com base nos dados do formulário
  const projectionData = useMemo(() => {
    const principal = safeValue(formData.valor_inicial);
    const annualRate = safeValue(formData.rentabilidade);
    const hasRequired = principal > 0 && formData.data_inicio;
    if (!hasRequired) return [];

    const start = new Date(formData.data_inicio);
    const end = formData.data_resgate ? new Date(formData.data_resgate) : new Date(start.getFullYear(), start.getMonth() + 12, start.getDate());
    // Garantir que o fim não seja antes do início
    const totalMonths = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
    const monthlyRate = annualRate / 12 / 100;

    const series = [];
    let value = principal;
    for (let i = 0; i <= totalMonths; i++) {
      if (i > 0) value = value * (1 + monthlyRate);
      const pointDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
      series.push({
        name: pointDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        valor: safeValue(value)
      });
    }
    console.log('Dados projectionData preparados:', series);
    return series;
  }, [formData.valor_inicial, formData.rentabilidade, formData.data_inicio, formData.data_resgate]);

  const prepareChartData = () => {
    const tipos = {};
    (investimentos || []).forEach(investimento => {
      const tipo = investimento.tipo_investimento || 'outros';
      if (!tipos[tipo]) {
        tipos[tipo] = 0;
      }
      tipos[tipo] += safeValue(investimento.valor_inicial);
    });

    const result = Object.entries(tipos)
      .map(([tipo, valor]) => ({
        name: getTipoLabel(tipo),
        value: safeValue(valor)
      }))
      .filter(item => item.value > 0);
    
    console.log('Dados Investimentos preparados:', result);
    return result;
  };

  const pieData = prepareChartData()

  const lineData = (investimentos || []).map(investimento => {
    const performance = calcularPerformance(investimento);
    return {
      name: investimento.titulo || 'Investimento',  // CORRIGIDO: usar 'name' para compatibilidade
      value: safeValue(performance.valorAtual),      // CORRIGIDO: usar 'value' como chave principal
      valor_inicial: safeValue(investimento.valor_inicial),
      valor_atual: safeValue(performance.valorAtual)
    };
  }).filter(item => item.value > 0);

  console.log('Dados lineData Investimentos:', lineData);

  if (loading) {
    return (
      <div className="main-content">
        <div className="container">
          <div className="loading">Carregando investimentos...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="main-content">
        <div className="container">
          <div className="welcome-card">
            <h2>Gestão de Investimentos</h2>
            <p>Controle seus investimentos, acompanhe a performance e visualize o crescimento do seu patrimônio.</p>
          </div>

          {stats && (
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <h3 style={{ color: 'var(--primary-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {formatCurrency(stats.totalInvestido)}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Investido</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <h3 style={{ color: 'var(--success-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {formatCurrency(stats.valorAtual)}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Valor Atual</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <h3 style={{ color: 'var(--success-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {formatCurrency(stats.lucroTotal)}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Lucro Total</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <h3 style={{ color: 'var(--info-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {stats.rentabilidadeMedia ? `${stats.rentabilidadeMedia.toFixed(2)}%` : '0%'}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Rentabilidade Média</p>
                </div>
              </div>
            </div>
          )}

          <div className="charts-section">
            <ChartViewer
              data={pieData}
              title="Investimentos por Tipo"
              subtitle="Distribuição dos investimentos por tipo"
              chartTypes={['pie', 'bar', 'area']}
              defaultType="pie"
              formatValue={(value) => {
                if (value === null || value === undefined || isNaN(value)) {
                  return 'R$ 0,00';
                }
                return formatCurrency(value);
              }}
              colors={COLORS}
              xAxisKey="name"
              yAxisKey="value"
            />
            
            <ChartViewer
              data={lineData}
              title="Performance dos Investimentos"
              subtitle="Comparação entre valor inicial e atual"
              chartTypes={['line', 'area', 'bar']}
              defaultType="area"
              formatValue={(value) => {
                if (value === null || value === undefined || isNaN(value)) {
                  return 'R$ 0,00';
                }
                return formatCurrency(value);
              }}
              xAxisKey="name"
              yAxisKey="valor_atual"
              multiSeries={true}
              seriesKeys={['valor_inicial', 'valor_atual']}
              colors={['#10b981', '#3b82f6']}
            />
          </div>

          <FiltersToggle title="Filtros de Investimentos">
            <div className="filters-container">
              <div className="filters-header">
                <div>
                  <h3 className="filters-title">
                    Filtros de Investimentos
                    <span className="filters-count">
                      {(filtroStatus ? 1 : 0) + (filtroCategoria ? 1 : 0)}
                    </span>
                  </h3>
                  <p className="filters-subtitle">Filtre seus investimentos por status e categoria</p>
                </div>
              </div>
            
              <div className="filters-row">
                <div className={`filter-group ${filtroStatus ? 'has-value' : ''}`} data-tooltip="Filtrar por status do investimento">
                  <label>Status</label>
                  <select
                    className="form-control"
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                  >
                    <option value="">Todos os status</option>
                    <option value="ativo">Ativo</option>
                    <option value="resgatado">Resgatado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className={`filter-group ${filtroCategoria ? 'has-value' : ''}`} data-tooltip="Filtrar por categoria">
                  <label>Categoria</label>
                  <select
                    className="form-control"
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                  >
                    <option value="">Todas as categorias</option>
                    {categorias.map(categoria => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="filters-summary">
                <div className="filters-count">
                  {investimentos.length} investimento{investimentos.length !== 1 ? 's' : ''} encontrado{investimentos.length !== 1 ? 's' : ''}
                </div>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setFiltroStatus('')
                    setFiltroCategoria('')
                  }}
                  disabled={!filtroStatus && !filtroCategoria}
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </FiltersToggle>

          <div className="welcome-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3>Lista de Investimentos</h3>
              <button
                className="btn btn-primary"
                onClick={openModal}
              >
                <i className="fas fa-plus"></i> Novo Investimento
              </button>
            </div>
            
            {investimentos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📈</div>
                <p>Nenhum investimento encontrado.</p>
              </div>
            ) : (
              <div className="table-container">
                <div className="table-header table-header--6">
                  <div>Título</div>
                  <div>Valor</div>
                  <div>Performance</div>
                  <div>Tipo</div>
                  <div>Status</div>
                  <div>Ações</div>
                </div>
                
                {investimentos.map((investimento) => {
                  const performance = calcularPerformance(investimento)
                  const statusConfig = getStatusBadge(investimento.status)
                  
                  return (
                    <div key={investimento.id} className="table-row table-row--6">
                      <div data-label="Título">
                        <div style={{ fontWeight: '600' }}>{investimento.titulo}</div>
                        {investimento.descricao && (
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {investimento.descricao}
                          </div>
                        )}
                      </div>
                      
                      <div data-label="Valor">
                        <div style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                          {formatCurrency(investimento.valor_inicial)}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {investimento.instituicao}
                        </div>
                      </div>
                      
                      <div data-label="Performance">
                        <div style={{ fontWeight: '600', color: performance.lucro >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                          {formatCurrency(performance.valorAtual)}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: performance.lucro >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                          {performance.lucro >= 0 ? '+' : ''}{formatCurrency(performance.lucro)} ({performance.percentualLucro.toFixed(2)}%)
                        </div>
                      </div>
                      
                      <div data-label="Tipo">
                        <span className="badge" style={{ 
                          backgroundColor: investimento.categoria_cor || 'var(--border-color)',
                          color: 'white'
                        }}>
                          {getTipoLabel(investimento.tipo_investimento)}
                        </span>
                      </div>
                      
                      <div data-label="Status">
                        <span className="badge" style={{ 
                          backgroundColor: statusConfig.color,
                          color: 'white'
                        }}>
                          {statusConfig.label}
                        </span>
                      </div>
                      
                      <div className="action-buttons d-flex gap-2">
                        {investimento.status === 'ativo' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleResgatar(investimento.id)}
                          >
                            Resgatar
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEdit(investimento)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(investimento)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Investimento */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Investimento' : 'Novo Investimento'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Título</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.titulo}
                      onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                      required
                      style={{ color: '#333' }}
                    />
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Valor Investido</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.valor_inicial}
                      onChange={(e) => setFormData({...formData, valor_inicial: e.target.value})}
                      required
                      style={{ color: '#333' }}
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Data do Investimento</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.data_inicio}
                      onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                      required
                      style={{ color: '#333' }}
                    />
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Tipo de Investimento</label>
                    <select
                      className="form-control"
                      value={formData.tipo_investimento}
                      onChange={(e) => setFormData({...formData, tipo_investimento: e.target.value})}
                      style={{ color: '#333' }}
                    >
                      <option value="acoes">Ações</option>
                      <option value="renda_fixa">Renda Fixa</option>
                      <option value="fundos_imobiliarios">Fundos Imobiliários</option>
                      <option value="tesouro_direto">Tesouro Direto</option>
                      <option value="criptomoedas">Criptomoedas</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Rendimento Esperado (% ao ano)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.rentabilidade}
                      onChange={(e) => setFormData({...formData, rentabilidade: e.target.value})}
                      placeholder="0.00"
                      style={{ color: '#333' }}
                    />
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Instituição</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.instituicao}
                      onChange={(e) => setFormData({...formData, instituicao: e.target.value})}
                      placeholder="Nome da instituição"
                      style={{ color: '#333' }}
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Categoria</label>
                    <select
                      className="form-control"
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                      style={{ color: '#333' }}
                    >
                      <option value="">Selecione uma categoria</option>
                      {categorias.map(categoria => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Data de Resgate (Opcional)</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.data_resgate}
                      onChange={(e) => setFormData({...formData, data_resgate: e.target.value})}
                      style={{ color: '#333' }}
                    />
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
                  placeholder="Descrição detalhada do investimento"
                  style={{ color: '#333' }}
                />
              </div>

              <div className="form-group">
                <label>Observações</label>
                <textarea
                  className="form-control"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows="3"
                  placeholder="Observações adicionais"
                  style={{ color: '#333' }}
                />
              </div>

              {/* Gráfico de projeção da performance dentro do modal */}
              {projectionData.length > 0 && (
                <div className="welcome-card" style={{ marginTop: '1rem' }}>
                  <ChartViewer
                    data={projectionData}
                    title="Projeção de Performance"
                    subtitle={formData.data_resgate ? 'Até a data de resgate' : 'Projeção para 12 meses'}
                    chartTypes={['line', 'area', 'bar']}
                    defaultType="line"
                    formatValue={(value) => {
                      if (value === null || value === undefined || isNaN(value)) {
                        return 'R$ 0,00';
                      }
                      return formatCurrency(value);
                    }}
                    xAxisKey="name"
                    yAxisKey="valor"
                    colors={COLORS}
                    height={260}
                  />
                </div>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Atualizar' : 'Criar'} Investimento
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </>
  )
}

export default Investimentos 