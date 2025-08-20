import React, { useState, useEffect } from 'react';
import DateRangeFilter from './DateRangeFilter';
import ChartViewer from './ChartViewer';
import FiltersToggle from './FiltersToggle';

const Receitas = () => {
  const [receitas, setReceitas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [stats, setStats] = useState(null);
  const [filtros, setFiltros] = useState({
    status: '',
    categoria_id: '',
    data_inicio: '',
    data_fim: '',
    recorrencia: ''
  });
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    valor: '',
    data_recebimento: '',
    categoria_id: '',
    recorrencia: 'nenhuma',
    data_fim_recorrencia: '',
    fonte_receita: '',
    forma_recebimento: '',
    observacoes: '',
    // Campos para impostos
    tem_impostos: false,
    calcular_inss: false,
    calcular_fgts: false,
    calcular_ir: false,
    calcular_outros: false,
    valor_ir: '',
    valor_inss: '',
    valor_fgts: '',
    outros_descontos: '',
    outros_tipo: 'valor', // 'valor' ou 'percentual'
    outros_acao: 'desconta', // 'desconta' ou 'adiciona'
    outros_impostos: []
  });

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'recebido', label: 'Recebido' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  const recorrenciaOptions = [
    { value: 'nenhuma', label: 'Nenhuma' },
    { value: 'diaria', label: 'Diária' },
    { value: 'semanal', label: 'Semanal' },
    { value: 'mensal', label: 'Mensal' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'semestral', label: 'Semestral' },
    { value: 'anual', label: 'Anual' }
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    fetchReceitas();
    fetchCategorias();
    fetchStats();
  }, [filtros]);

  const fetchReceitas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) {
          params.append(key, filtros[key]);
        }
      });

      const response = await fetch(`/api/receitas?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReceitas(data.receitas);
      } else {
        setError('Erro ao carregar receitas');
      }
    } catch (error) {
      setError('Erro ao carregar receitas');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categorias', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategorias(data.categories || []);
      } else {
        setError('Erro ao carregar categorias');
      }
    } catch (error) {
      setError('Erro ao carregar categorias');
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/receitas/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `/api/receitas/${editingId}`
        : '/api/receitas';
      
      const method = editingId ? 'PUT' : 'POST';

      // Calcular valor líquido se tem impostos
      let valorLiquido = parseFloat(formData.valor) || 0;
      if (formData.tem_impostos) {
        const impostos = (parseFloat(formData.valor_ir) || 0) + 
                        (parseFloat(formData.valor_inss) || 0) + 
                        (parseFloat(formData.valor_fgts) || 0) + 
                        (parseFloat(formData.outros_descontos) || 0);
        valorLiquido = valorLiquido - impostos;
      }

      const payload = {
        ...formData,
        valor_liquido: valorLiquido
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setShowModal(false);
        resetForm();
        fetchReceitas();
        fetchStats();
      } else {
        setError(data.error || 'Erro ao salvar receita');
      }
    } catch (error) {
      setError('Erro de conexão');
    }
  };

  const handleEdit = (receita) => {
    // Converter datas para formato yyyy-MM-dd
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toISOString().split('T')[0];
    };

    setFormData({
      titulo: receita.titulo,
      descricao: receita.descricao || '',
      valor: receita.valor,
      data_recebimento: formatDateForInput(receita.data_recebimento),
      categoria_id: receita.categoria_id || '',
      recorrencia: receita.recorrencia || 'nenhuma',
      data_fim_recorrencia: formatDateForInput(receita.data_fim_recorrencia),
      fonte_receita: receita.fonte_receita || '',
      forma_recebimento: receita.forma_recebimento || '',
      observacoes: receita.observacoes || '',
      tem_impostos: receita.tem_impostos || false,
      calcular_inss: receita.calcular_inss || false,
      calcular_fgts: receita.calcular_fgts || false,
      calcular_ir: receita.calcular_ir || false,
      calcular_outros: receita.calcular_outros || false,
      valor_ir: receita.valor_ir || '',
      valor_inss: receita.valor_inss || '',
      valor_fgts: receita.valor_fgts || '',
      outros_descontos: receita.outros_descontos || '',
      outros_tipo: receita.outros_tipo || 'valor',
      outros_acao: receita.outros_acao || 'desconta',
      outros_impostos: receita.outros_impostos || []
    });
    setEditingId(receita.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta receita?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/receitas/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('Receita excluída com sucesso');
        fetchReceitas();
        fetchStats();
      } else {
        setError('Erro ao excluir receita');
      }
    } catch (error) {
      setError('Erro de conexão');
    }
  };

  const handleReceber = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/receitas/${id}/receber`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('Receita marcada como recebida!');
        fetchReceitas();
        fetchStats();
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao marcar como recebida');
      }
    } catch (error) {
      setError('Erro ao marcar como recebida');
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

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      valor: '',
      data_recebimento: '',
      categoria_id: '',
      recorrencia: 'nenhuma',
      data_fim_recorrencia: '',
      fonte_receita: '',
      forma_recebimento: '',
      observacoes: '',
      tem_impostos: false,
      calcular_inss: false,
      calcular_fgts: false,
      calcular_ir: false,
      calcular_outros: false,
      valor_ir: '',
      valor_inss: '',
      valor_fgts: '',
      outros_descontos: '',
      outros_tipo: 'valor',
      outros_acao: 'desconta',
      outros_impostos: []
    });
    setEditingId(null);
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'recebido': return 'var(--success-color)';
      case 'pendente': return 'var(--warning-color)';
      case 'cancelado': return 'var(--danger-color)';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'recebido': return 'fas fa-check-circle';
      case 'pendente': return 'fas fa-clock';
      case 'cancelado': return 'fas fa-times-circle';
      default: return 'fas fa-question-circle';
    }
  };

  const prepareChartData = () => {
    // Dados para gráfico de pizza (por categoria)
    const categoriaData = (categorias || []).map(cat => {
      const total = (receitas || [])
        .filter(r => r.categoria_id === cat.id)
        .reduce((sum, r) => sum + safeValue(r.valor), 0);
      return {
        name: cat.nome || 'Sem categoria',
        value: safeValue(total),
        color: cat.cor
      };
    }).filter(item => item.value > 0);

    const pieData = categoriaData.map((item, index) => ({
      name: item.name,
      value: safeValue(item.value),
      fill: COLORS[index % COLORS.length]
    }));

    // Dados para gráfico de barras (por mês) - CORRIGIDO: usar 'name' ao invés de 'mes'
    const mesData = (receitas || []).reduce((acc, receita) => {
      if (!receita.data_recebimento) return acc;
      
      const mes = new Date(receita.data_recebimento).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      acc[mes] = (acc[mes] || 0) + safeValue(receita.valor);
      return acc;
    }, {});

    const barData = Object.entries(mesData).map(([mes, valor]) => ({
      name: mes,  // CORRIGIDO: usar 'name' para compatibilidade com ChartViewer
      value: safeValue(valor) // CORRIGIDO: usar 'value' para compatibilidade
    })).sort((a, b) => new Date('01 ' + a.name) - new Date('01 ' + b.name));

    // Dados para gráfico de linha (evolução temporal)
    const lineData = (receitas || [])
      .sort((a, b) => new Date(a.data_recebimento) - new Date(b.data_recebimento))
      .map((receita, index) => ({
        data: formatDate(receita.data_recebimento),
        valor: safeValue(receita.valor),
        valor_liquido: safeValue(receita.valor_liquido || receita.valor)
      }));

    console.log('Dados Receitas preparados:', { pieData, barData, lineData });
    return { pieData, barData, lineData };
  };

  const { pieData, barData, lineData } = prepareChartData();

  // Funções de cálculo de impostos
  const calcularINSS = (salarioBruto) => {
    const salario = parseFloat(salarioBruto) || 0;
    
    if (salario <= 1412.00) {
      return salario * 0.075;
    } else if (salario <= 2666.68) {
      return (1412.00 * 0.075) + ((salario - 1412.00) * 0.09);
    } else if (salario <= 4000.03) {
      return (1412.00 * 0.075) + ((2666.68 - 1412.00) * 0.09) + ((salario - 2666.68) * 0.12);
    } else if (salario <= 7786.02) {
      return (1412.00 * 0.075) + ((2666.68 - 1412.00) * 0.09) + ((4000.03 - 2666.68) * 0.12) + ((salario - 4000.03) * 0.14);
    } else {
      // Teto do INSS
      return (1412.00 * 0.075) + ((2666.68 - 1412.00) * 0.09) + ((4000.03 - 2666.68) * 0.12) + ((7786.02 - 4000.03) * 0.14);
    }
  };

  const calcularIR = (salarioBruto, valorINSS) => {
    const salario = parseFloat(salarioBruto) || 0;
    const inss = parseFloat(valorINSS) || 0;
    const baseCalculo = salario - inss;
    
    if (baseCalculo <= 2112.00) {
      return 0;
    } else if (baseCalculo <= 2826.65) {
      return (baseCalculo * 0.075) - 158.40;
    } else if (baseCalculo <= 3751.05) {
      return (baseCalculo * 0.15) - 370.40;
    } else if (baseCalculo <= 4664.68) {
      return (baseCalculo * 0.225) - 651.73;
    } else {
      return (baseCalculo * 0.275) - 884.96;
    }
  };

  const calcularFGTS = (salarioBruto) => {
    const salario = parseFloat(salarioBruto) || 0;
    return salario * 0.08; // 8% padrão
  };

  const calcularImpostosAutomaticos = (salarioBruto, impostosSelecionados) => {
    const inss = impostosSelecionados.calcular_inss ? calcularINSS(salarioBruto) : 0;
    const ir = impostosSelecionados.calcular_ir ? calcularIR(salarioBruto, inss) : 0;
    const fgts = impostosSelecionados.calcular_fgts ? calcularFGTS(salarioBruto) : 0;
    
    return {
      inss: Math.max(0, inss),
      ir: Math.max(0, ir),
      fgts: Math.max(0, fgts)
    };
  };

  const calcularOutrosDescontos = (salarioBruto, outrosValor, outrosTipo, outrosAcao) => {
    if (!outrosValor || parseFloat(outrosValor) === 0) return 0;
    
    let valorCalculado = 0;
    if (outrosTipo === 'percentual') {
      valorCalculado = (salarioBruto * parseFloat(outrosValor)) / 100;
    } else {
      valorCalculado = parseFloat(outrosValor);
    }
    
    return outrosAcao === 'desconta' ? valorCalculado : -valorCalculado;
  };

  const handleValorChange = (valor) => {
    const novoValor = valor;
    setFormData(prev => {
      const novosDados = { ...prev, valor: novoValor };
      
      // Se tem impostos habilitado, calcular automaticamente
      if (prev.tem_impostos && novoValor) {
        const impostos = calcularImpostosAutomaticos(novoValor, {
          calcular_inss: prev.calcular_inss,
          calcular_fgts: prev.calcular_fgts,
          calcular_ir: prev.calcular_ir
        });
        
        novosDados.valor_inss = impostos.inss.toFixed(2);
        novosDados.valor_ir = impostos.ir.toFixed(2);
        novosDados.valor_fgts = impostos.fgts.toFixed(2);
      }
      
      return novosDados;
    });
  };

  const handleImpostoChange = (tipo, checked) => {
    setFormData(prev => {
      const novosDados = { ...prev, [tipo]: checked };
      
      // Se tem impostos habilitado e valor, recalcular
      if (prev.tem_impostos && prev.valor) {
        const impostos = calcularImpostosAutomaticos(prev.valor, {
          calcular_inss: tipo === 'calcular_inss' ? checked : prev.calcular_inss,
          calcular_fgts: tipo === 'calcular_fgts' ? checked : prev.calcular_fgts,
          calcular_ir: tipo === 'calcular_ir' ? checked : prev.calcular_ir
        });
        
        novosDados.valor_inss = impostos.inss.toFixed(2);
        novosDados.valor_ir = impostos.ir.toFixed(2);
        novosDados.valor_fgts = impostos.fgts.toFixed(2);
      }
      
      return novosDados;
    });
  };

  const handleImpostosToggle = (checked) => {
    setFormData(prev => ({
      ...prev,
      tem_impostos: checked,
      calcular_inss: false,
      calcular_fgts: false,
      calcular_ir: false,
      calcular_outros: false,
      valor_ir: '',
      valor_inss: '',
      valor_fgts: ''
    }));
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando receitas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="main-content">
        <div className="container">
          <div className="welcome-card">
            <div className="header-content">
              <h2>Gestão de Receitas</h2>
              <button className="btn btn-primary btn-create" onClick={openModal}>
                <i className="fas fa-plus"></i>
                Nova Receita
              </button>
            </div>
            <p>Controle suas receitas, salários e outras entradas financeiras com cálculo automático de impostos.</p>
          </div>

          {/* Cards de Estatísticas */}
          {stats && (
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <h3 style={{ color: 'var(--success-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {formatCurrency(stats.totalReceitas)}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Total de Receitas</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <h3 style={{ color: 'var(--primary-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {formatCurrency(stats.totalLiquido)}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Valor Líquido</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <h3 style={{ color: 'var(--warning-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {formatCurrency(stats.totalImpostos)}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Total de Impostos</p>
                </div>
              </div>
              <div className="col-md-3">
                <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <h3 style={{ color: 'var(--info-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {stats.totalReceitas > 0 ? Math.round((stats.totalImpostos / stats.totalReceitas) * 100) : 0}%
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Taxa de Impostos</p>
                </div>
              </div>
            </div>
          )}

          {/* Gráficos */}
          <div className="charts-section">
            <ChartViewer
              data={pieData}
              title="Receitas por Categoria"
              subtitle="Distribuição das receitas por categoria"
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
              data={barData}
              title="Receitas por Mês"
              subtitle="Evolução das receitas ao longo do tempo"
              chartTypes={['bar', 'line', 'area']}
              defaultType="bar"
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
          </div>

          {/* Filtros */}
          <FiltersToggle title="Filtros de Receitas">
            <div className="filters-container">
              <div className="row">
                <div className="col-md-2">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      className="form-control"
                      value={filtros.status}
                      onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="col-md-3">
                  <div className="form-group">
                    <label>Categoria</label>
                    <select
                      className="form-control"
                      value={filtros.categoria_id}
                      onChange={(e) => setFiltros({...filtros, categoria_id: e.target.value})}
                    >
                      <option value="">Todas as categorias</option>
                      {(categorias || []).map(categoria => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="col-md-2">
                  <div className="form-group">
                    <label>Recorrência</label>
                    <select
                      className="form-control"
                      value={filtros.recorrencia}
                      onChange={(e) => setFiltros({...filtros, recorrencia: e.target.value})}
                    >
                      <option value="">Todas</option>
                      {recorrenciaOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="col-md-3">
                  <DateRangeFilter
                    startDate={filtros.data_inicio}
                    endDate={filtros.data_fim}
                    onStartDateChange={(date) => setFiltros({...filtros, data_inicio: date})}
                    onEndDateChange={(date) => setFiltros({...filtros, data_fim: date})}
                  />
                </div>
                
                <div className="col-md-2">
                  <div className="form-group">
                    <label>&nbsp;</label>
                    <div>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setFiltros({
                          status: '',
                          categoria_id: '',
                          data_inicio: '',
                          data_fim: '',
                          recorrencia: ''
                        })}
                      >
                        Limpar Filtros
                      </button>
                      {/* Botão movido para o header */}
                    </div>
                  </div>
                </div>
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

          {/* Lista de Receitas */}
          <div className="welcome-card">
            <h3>Lista de Receitas</h3>
            
            {receitas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💰</div>
                <p>Nenhuma receita encontrada.</p>
              </div>
            ) : (
              <div className="table-container">
                <div className="table-header table-header--6">
                  <div>Título</div>
                  <div>Valor</div>
                  <div>Data</div>
                  <div>Categoria</div>
                  <div>Status</div>
                  <div>Ações</div>
                </div>
                
                {receitas.map((receita) => (
                  <div key={receita.id} className="table-row table-row--6">
                    <div data-label="Título">
                      <div style={{ fontWeight: '600' }}>{receita.titulo}</div>
                      {receita.descricao && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {receita.descricao}
                        </div>
                      )}
                    </div>
                    
                    <div data-label="Valor">
                      <div style={{ fontWeight: '600', color: 'var(--success-color)' }}>
                        {formatCurrency(receita.valor)}
                      </div>
                      {receita.tem_impostos && receita.valor_liquido && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          Líquido: {formatCurrency(receita.valor_liquido)}
                        </div>
                      )}
                    </div>
                    
                    <div data-label="Data">{formatDate(receita.data_recebimento)}</div>
                    
                    <div data-label="Categoria">
                      <span className="badge" style={{ 
                        backgroundColor: receita.categoria_cor || 'var(--border-color)',
                        color: 'white'
                      }}>
                        {receita.categoria_nome || 'Sem categoria'}
                      </span>
                    </div>
                    
                    <div data-label="Status">
                      <span className="badge" style={{ 
                        backgroundColor: getStatusColor(receita.status),
                        color: 'white'
                      }}>
                        {getStatusIcon(receita.status)} {receita.status}
                      </span>
                    </div>
                    
                    <div className="action-buttons d-flex gap-2">
                      {receita.status === 'pendente' && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleReceber(receita.id)}
                        >
                          Receber
                        </button>
                      )}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEdit(receita)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(receita.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Receita */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Receita' : 'Nova Receita'}</h2>
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
                    placeholder="Ex: Salário"
                    required
                    style={{ color: '#333' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="valor">Valor *</label>
                  <input
                    type="number"
                    id="valor"
                    value={formData.valor}
                    onChange={(e) => handleValorChange(e.target.value)}
                    placeholder="0,00"
                    step="0.01"
                    min="0"
                    required
                    style={{ color: '#333' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="descricao">Descrição</label>
                <textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Descrição opcional da receita"
                  rows="3"
                  style={{ color: '#333' }}
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
                    style={{ color: '#333' }}
                  >
                    <option value="">Selecione uma categoria</option>
                    {(categorias || []).map(categoria => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="data_recebimento">Data de Recebimento *</label>
                  <input
                    type="date"
                    id="data_recebimento"
                    value={formData.data_recebimento}
                    onChange={(e) => setFormData({...formData, data_recebimento: e.target.value})}
                    required
                    style={{ color: '#333' }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fonte_receita">Fonte da Receita</label>
                  <input
                    type="text"
                    id="fonte_receita"
                    value={formData.fonte_receita}
                    onChange={(e) => setFormData({...formData, fonte_receita: e.target.value})}
                    placeholder="Ex: Empresa, Freelance, Investimentos"
                    style={{ color: '#333' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="forma_recebimento">Forma de Recebimento</label>
                  <input
                    type="text"
                    id="forma_recebimento"
                    value={formData.forma_recebimento}
                    onChange={(e) => setFormData({...formData, forma_recebimento: e.target.value})}
                    placeholder="Ex: PIX, Transferência, Dinheiro"
                    style={{ color: '#333' }}
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
                    style={{ color: '#333' }}
                  >
                    {recorrenciaOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="data_fim_recorrencia">Data Fim da Recorrência</label>
                  <input
                    type="date"
                    id="data_fim_recorrencia"
                    value={formData.data_fim_recorrencia}
                    onChange={(e) => setFormData({...formData, data_fim_recorrencia: e.target.value})}
                    placeholder="Opcional - deixe vazio para recorrência infinita"
                    style={{ color: '#333' }}
                  />
                  <small className="form-text text-muted">
                    Deixe vazio para recorrência infinita
                  </small>
                </div>
              </div>

              <div className="form-group">
                <div className="form-check">
                  <input
                    type="checkbox"
                    id="tem_impostos"
                    checked={formData.tem_impostos}
                    onChange={(e) => handleImpostosToggle(e.target.checked)}
                    className="form-check-input"
                  />
                  <label htmlFor="tem_impostos" className="form-check-label">
                    Esta receita possui impostos/descontos
                  </label>
                </div>
              </div>

              {formData.tem_impostos && (
                <div className="impostos-section">
                  <h4>Selecionar Impostos a Calcular</h4>
                  
                  {/* Checkboxes para selecionar impostos */}
                  <div className="form-row" style={{ marginBottom: '1rem' }}>
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          id="calcular_inss"
                          checked={formData.calcular_inss}
                          onChange={(e) => handleImpostoChange('calcular_inss', e.target.checked)}
                          className="form-check-input"
                        />
                        <label htmlFor="calcular_inss" className="form-check-label">
                          <strong>INSS</strong><br />
                          <small>Tabela 2025 progressiva</small>
                        </label>
                      </div>
                    </div>
                    
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          id="calcular_fgts"
                          checked={formData.calcular_fgts}
                          onChange={(e) => handleImpostoChange('calcular_fgts', e.target.checked)}
                          className="form-check-input"
                        />
                        <label htmlFor="calcular_fgts" className="form-check-label">
                          <strong>FGTS</strong><br />
                          <small>8% do salário bruto</small>
                        </label>
                      </div>
                    </div>
                    
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          id="calcular_ir"
                          checked={formData.calcular_ir}
                          onChange={(e) => handleImpostoChange('calcular_ir', e.target.checked)}
                          className="form-check-input"
                        />
                        <label htmlFor="calcular_ir" className="form-check-label">
                          <strong>IR</strong><br />
                          <small>Base: Salário - INSS</small>
                        </label>
                      </div>
                    </div>
                    
                    <div className="col-md-3">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          id="calcular_outros"
                          checked={formData.calcular_outros}
                          onChange={(e) => setFormData({...formData, calcular_outros: e.target.checked})}
                          className="form-check-input"
                        />
                        <label htmlFor="calcular_outros" className="form-check-label">
                          <strong>Outros</strong><br />
                          <small>Descontos adicionais</small>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Campos de valores calculados */}
                  <div className="form-row">
                    {formData.calcular_inss && (
                      <div className="form-group">
                        <label htmlFor="valor_inss">INSS (R$) - Calculado automaticamente</label>
                        <input
                          type="number"
                          id="valor_inss"
                          value={formData.valor_inss}
                          onChange={(e) => setFormData({...formData, valor_inss: e.target.value})}
                          placeholder="0,00"
                          step="0.01"
                          min="0"
                          readOnly
                          style={{ backgroundColor: '#f8f9fa', color: '#333' }}
                        />
                        <small className="form-text text-muted">
                          Tabela 2025: 7,5% até R$ 1.412, 9% até R$ 2.666,68, 12% até R$ 4.000,03, 14% até R$ 7.786,02
                        </small>
                      </div>
                    )}

                    {formData.calcular_fgts && (
                      <div className="form-group">
                        <label htmlFor="valor_fgts">FGTS (R$) - Calculado automaticamente</label>
                        <input
                          type="number"
                          id="valor_fgts"
                          value={formData.valor_fgts}
                          onChange={(e) => setFormData({...formData, valor_fgts: e.target.value})}
                          placeholder="0,00"
                          step="0.01"
                          min="0"
                          readOnly
                          style={{ backgroundColor: '#f8f9fa', color: '#333' }}
                        />
                        <small className="form-text text-muted">
                          8% do salário bruto (CLT padrão)
                        </small>
                      </div>
                    )}

                    {formData.calcular_ir && (
                      <div className="form-group">
                        <label htmlFor="valor_ir">IR (R$) - Calculado automaticamente</label>
                        <input
                          type="number"
                          id="valor_ir"
                          value={formData.valor_ir}
                          onChange={(e) => setFormData({...formData, valor_ir: e.target.value})}
                          placeholder="0,00"
                          step="0.01"
                          min="0"
                          readOnly
                          style={{ backgroundColor: '#f8f9fa', color: '#333' }}
                        />
                        <small className="form-text text-muted">
                          Base: {formData.valor ? (parseFloat(formData.valor) - parseFloat(formData.valor_inss || 0)).toFixed(2) : '0,00'} (Salário - INSS)
                        </small>
                      </div>
                    )}

                    {formData.calcular_outros && (
                      <div className="form-group">
                        <label htmlFor="outros_descontos">Outros Descontos</label>
                        <div className="form-row">
                          <div className="col-md-4">
                            <input
                              type="number"
                              id="outros_descontos"
                              value={formData.outros_descontos}
                              onChange={(e) => setFormData({...formData, outros_descontos: e.target.value})}
                              placeholder="0,00"
                              step="0.01"
                              min="0"
                              style={{ color: '#333' }}
                            />
                          </div>
                          <div className="col-md-4">
                            <select
                              value={formData.outros_tipo}
                              onChange={(e) => setFormData({...formData, outros_tipo: e.target.value})}
                              style={{ color: '#333' }}
                            >
                              <option value="valor">Valor (R$)</option>
                              <option value="percentual">Percentual (%)</option>
                            </select>
                          </div>
                          <div className="col-md-4">
                            <select
                              value={formData.outros_acao}
                              onChange={(e) => setFormData({...formData, outros_acao: e.target.value})}
                              style={{ color: '#333' }}
                            >
                              <option value="desconta">Desconta</option>
                              <option value="adiciona">Adiciona</option>
                            </select>
                          </div>
                        </div>
                        <small className="form-text text-muted">
                          {formData.outros_tipo === 'percentual' ? 'Percentual do salário bruto' : 'Valor fixo'} 
                          {formData.outros_acao === 'desconta' ? ' (desconta do salário)' : ' (adiciona ao salário)'}
                        </small>
                      </div>
                    )}
                  </div>

                  {/* Resumo do cálculo */}
                  {formData.valor && (
                    <div className="resumo-calculo" style={{ 
                      background: '#f8f9fa', 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      marginTop: '1rem' 
                    }}>
                      <h5>Resumo do Cálculo</h5>
                      <div className="row">
                        <div className="col-md-3">
                          <strong>Salário Bruto:</strong><br />
                          {formatCurrency(formData.valor)}
                        </div>
                        <div className="col-md-3">
                          <strong>INSS:</strong><br />
                          {formatCurrency(formData.valor_inss || 0)}
                        </div>
                        <div className="col-md-3">
                          <strong>IR:</strong><br />
                          {formatCurrency(formData.valor_ir || 0)}
                        </div>
                        <div className="col-md-3">
                          <strong>Salário Líquido:</strong><br />
                          <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>
                            {formatCurrency(
                              parseFloat(formData.valor || 0) - 
                              (formData.calcular_inss ? parseFloat(formData.valor_inss || 0) : 0) - 
                              (formData.calcular_ir ? parseFloat(formData.valor_ir || 0) : 0) - 
                              (formData.calcular_outros ? parseFloat(formData.outros_descontos || 0) : 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="observacoes">Observações</label>
                <textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows="3"
                  style={{ color: '#333' }}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Atualizar' : 'Salvar'} Receita
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
    </>
  );
};

export default Receitas; 