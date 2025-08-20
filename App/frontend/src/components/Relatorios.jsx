import React, { useState, useEffect } from 'react';
import ChartViewer from './ChartViewer';
import FiltersToggle from './FiltersToggle';
import DateRangeFilter from './DateRangeFilter';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Relatorios = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Estados para dados
  const [dashboardData, setDashboardData] = useState(null);
  const [categoriasData, setCategoriasData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [tendenciasData, setTendenciasData] = useState(null);
  const [investimentosData, setInvestimentosData] = useState(null);
  const [fluxoCaixaData, setFluxoCaixaData] = useState(null);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    periodo: '12m',
    tipo: 'todos',
    data_inicio: '',
    data_fim: ''
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  useEffect(() => {
    carregarDados();
  }, [filtros, activeTab]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      switch (activeTab) {
        case 'dashboard':
          await carregarDashboard(token);
          break;
        case 'categorias':
          await carregarCategorias(token);
          break;
        case 'heatmap':
          await carregarHeatmap(token);
          break;
        case 'tendencias':
          await carregarTendencias(token);
          break;
        case 'investimentos':
          await carregarInvestimentos(token);
          break;
        case 'fluxo-caixa':
          await carregarFluxoCaixa(token);
          break;
      }
    } catch (error) {
      setError('Erro ao carregar dados');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarDashboard = async (token) => {
    try {
      const params = new URLSearchParams({
        ano: filtros.ano,
        mes: filtros.mes
      });
      
      const response = await fetch(`/api/relatorios/dashboard?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Dados do dashboard carregados:', data);
        setDashboardData(data);
      } else if (response.status === 403) {
        setError('Acesso negado - Verifique suas permissões');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao carregar dashboard');
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setError('Erro de conexão ao carregar dashboard');
    }
  };

  const carregarCategorias = async (token) => {
    try {
      const params = new URLSearchParams({
        ano: filtros.ano,
        mes: filtros.mes,
        tipo: filtros.tipo
      });
      
      const response = await fetch(`/api/relatorios/categorias?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategoriasData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao carregar categorias');
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setError('Erro de conexão ao carregar categorias');
    }
  };

  const carregarHeatmap = async (token) => {
    try {
      const params = new URLSearchParams({
        ano: filtros.ano,
        mes: filtros.mes
      });
      
      const response = await fetch(`/api/relatorios/heatmap?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHeatmapData(data);
      }
    } catch (error) {
      console.error('Erro ao carregar heatmap:', error);
    }
  };

  const carregarTendencias = async (token) => {
    try {
      const params = new URLSearchParams({
        periodo: filtros.periodo,
        tipo: filtros.tipo
      });
      
      const response = await fetch(`/api/relatorios/tendencias?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTendenciasData(data);
      }
    } catch (error) {
      console.error('Erro ao carregar tendências:', error);
    }
  };

  const carregarInvestimentos = async (token) => {
    try {
      const params = new URLSearchParams({
        ano: filtros.ano,
        mes: filtros.mes
      });
      const response = await fetch(`/api/relatorios/investimentos?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInvestimentosData(data);
      }
    } catch (error) {
      console.error('Erro ao carregar investimentos:', error);
    }
  };

  const carregarFluxoCaixa = async (token) => {
    try {
      const params = new URLSearchParams({
        ano: filtros.ano,
        mes: filtros.mes
      });
      
      const response = await fetch(`/api/relatorios/fluxo-caixa?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFluxoCaixaData(data);
      }
    } catch (error) {
      console.error('Erro ao carregar fluxo de caixa:', error);
    }
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

  const formatPercentage = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00%';
    }
    return `${parseFloat(value || 0).toFixed(2)}%`;
  };

  const safeValue = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '' || isNaN(value)) {
      return defaultValue;
    }
    const numValue = parseFloat(value);
    return isNaN(numValue) ? defaultValue : numValue;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success-color)';
    if (score >= 60) return 'var(--warning-color)';
    return 'var(--danger-color)';
  };

  const getScoreLevel = (score) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Ruim';
  };

  const HeatmapComponent = ({ data }) => {
    const generateCalendarData = () => {
      if (!data || !data.heatmap) return [];

      const calendarData = [];
      const currentDate = new Date();
      const startDate = new Date(currentDate.getFullYear(), 0, 1);
      const endDate = new Date(currentDate.getFullYear(), 11, 31);

      // Gerar dados para cada dia do ano
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        const dayData = data.heatmap.find(item => item.data === dateStr);
        
        calendarData.push({
          date: dateStr,
          value: dayData ? dayData.valor : 0,
          count: dayData ? dayData.quantidade : 0
        });
      }

      return calendarData;
    };

    const calendarData = generateCalendarData();
    const maxValue = Math.max(...calendarData.map(d => d.value));

    return (
      <div className="welcome-card">
        <h3>Mapa de Calor - Atividade Financeira</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(53, 1fr)', 
          gap: '2px',
          padding: '1rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)'
        }}>
          {calendarData.map((day, index) => {
            const intensity = day.value > 0 ? Math.min(day.value / maxValue, 1) : 0;
            const color = intensity > 0 
              ? `rgba(59, 130, 246, ${0.3 + intensity * 0.7})`
              : 'var(--border-color)';

            return (
              <div
                key={index}
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: color,
                  borderRadius: '2px',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                title={`${format(new Date(day.date), 'dd/MM/yyyy')} - ${formatCurrency(day.value)} (${day.count} transações)`}
              />
            );
          })}
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '1rem',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)'
        }}>
          <span>Menos atividade</span>
          <span>Mais atividade</span>
        </div>
      </div>
    );
  };

  const ScoreComponent = ({ score }) => {
    return (
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: `conic-gradient(${getScoreColor(score)} ${score * 3.6}deg, var(--border-color) 0deg)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        position: 'relative'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getScoreColor(score) }}>
            {score}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {getScoreLevel(score)}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando relatórios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="container">
        <div className="welcome-card">
          <h2>Relatórios Avançados</h2>
          <p>Análises detalhadas, mapas de calor, scores financeiros e insights profundos sobre seus dados.</p>
        </div>

        <FiltersToggle title="Filtros de Relatórios">
          <div className="filters-container">
            <div className="filters-header">
              <div>
                <h3 className="filters-title">
                  Filtros de Relatórios
                  <span className="filters-count">
                    {Object.values(filtros).filter(v => v !== '' && v !== 'todos' && v !== '12m').length}
                  </span>
                </h3>
                <p className="filters-subtitle">Configure os parâmetros para análise avançada</p>
              </div>
            </div>
          
          <div className="filters-row">
            <div className={`filter-group ${filtros.periodo !== '12m' ? 'has-value' : ''}`} data-tooltip="Período de análise">
              <label>Período de Análise</label>
              <select
                className="form-control"
                value={filtros.periodo || '12'}
                onChange={(e) => setFiltros({...filtros, periodo: e.target.value || '12'})}
              >
                <option value="6m">Últimos 6 meses</option>
                <option value="12m">Últimos 12 meses</option>
                <option value="24m">Últimos 24 meses</option>
              </select>
            </div>
            
            <div className={`filter-group ${filtros.tipo !== 'todos' ? 'has-value' : ''}`} data-tooltip="Tipo de transação para análise">
              <label>Tipo de Transação</label>
              <select
                className="form-control"
                value={filtros.tipo}
                onChange={(e) => setFiltros({...filtros, tipo: e.target.value})}
              >
                <option value="todos">Todas</option>
                <option value="receitas">Apenas Receitas</option>
                <option value="despesas">Apenas Despesas</option>
              </select>
            </div>
          </div>
          
          {/* Filtros de Data */}
          <DateRangeFilter
            filtros={filtros}
            setFiltros={setFiltros}
            title="Período"
            subtitle="Configure o período para análise dos relatórios"
            showQuickActions={true}
          />
          
          <div className="filter-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setFiltros({
                ano: new Date().getFullYear(),
                mes: '',
                periodo: '12m',
                tipo: 'todos',
                data_inicio: '',
                data_fim: ''
              })}
            >
              Limpar Filtros
            </button>
          </div>
        </div>
        </FiltersToggle>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <div className="welcome-card">
          <div className="tabs-responsive" style={{ 
            display: 'flex', 
            gap: '1rem', 
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '2rem'
          }}>
            {[
              { id: 'dashboard', label: 'Dashboard Geral' },
              { id: 'categorias', label: 'Análise por Categorias' },
              { id: 'heatmap', label: 'Mapa de Calor' },
              { id: 'tendencias', label: 'Tendências' },
              { id: 'investimentos', label: 'Investimentos' },
              { id: 'fluxo-caixa', label: 'Fluxo de Caixa' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--primary-color)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: activeTab === tab.id ? '600' : '400'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'dashboard' && dashboardData && (
            <div>
              <div className="row mb-4">
                <div className="col-md-3">
                  <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <h3 style={{ color: 'var(--success-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>
                      {formatCurrency(dashboardData.totalReceitas || 0)}
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Receitas</p>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <h3 style={{ color: 'var(--danger-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>
                      {formatCurrency(dashboardData.totalDespesas || 0)}
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Despesas</p>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <h3 style={{ 
                      color: (dashboardData.saldo || 0) >= 0 ? 'var(--success-color)' : 'var(--danger-color)', 
                      fontSize: '2rem', 
                      marginBottom: '0.5rem' 
                    }}>
                      {formatCurrency(dashboardData.saldo || 0)}
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Saldo</p>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <ScoreComponent score={dashboardData.scoreSaudeFinanceira || 0} />
                    <p style={{ margin: '1rem 0 0 0', color: 'var(--text-secondary)' }}>Score de Saúde</p>
                  </div>
                </div>
              </div>

              <div className="charts-section">
                <ChartViewer
                  data={(dashboardData.evolucao || []).map(item => ({
                    name: item.mes || 'Mês',
                    value: safeValue(item.receitas),
                    receitas: safeValue(item.receitas),
                    despesas: safeValue(item.despesas),
                    investimentos: safeValue(item.investimentos)
                  }))}
                  title="Evolução dos Últimos 12 Meses"
                  subtitle="Comparação entre receitas, despesas e investimentos"
                  chartTypes={['line', 'area', 'bar']}
                  defaultType="line"
                  formatValue={(value) => {
                    if (value === null || value === undefined || isNaN(value)) {
                      return 'R$ 0,00';
                    }
                    return formatCurrency(value);
                  }}
                  xAxisKey="name"
                  yAxisKey="receitas"
                  multiSeries={true}
                  seriesKeys={['receitas', 'despesas', 'investimentos']}
                  colors={['#10b981', '#ef4444', '#3b82f6']}
                />
              </div>
            </div>
          )}

          {activeTab === 'categorias' && categoriasData && (
            <div className="charts-section">
              <ChartViewer
                data={(categoriasData.categorias || []).map(c => ({ name: c.categoria || 'Sem categoria', value: c.total }))}
                title="Distribuição por Categorias"
                subtitle="Proporção de gastos por categoria"
                chartTypes={['pie', 'bar', 'area']}
                defaultType="pie"
                formatValue={formatCurrency}
                colors={COLORS}
                xAxisKey="name"
                yAxisKey="value"
              />
              
              <ChartViewer
                data={(categoriasData.categorias || []).slice(0, 10)}
                title="Top Categorias por Valor"
                subtitle="As 10 categorias com maior gasto"
                chartTypes={['bar', 'line', 'area']}
                defaultType="bar"
                formatValue={formatCurrency}
                xAxisKey="categoria"
                yAxisKey="total"
                colors={COLORS}
              />

              <div className="welcome-card">
                <h3>Análise Detalhada por Categoria</h3>
                <div className="table-container">
                  <div className="table-header table-header--5">
                    <div>Categoria</div>
                    <div>Total</div>
                    <div>Média</div>
                    <div>Quantidade</div>
                    <div>Percentual</div>
                  </div>
                  
                  {(categoriasData.categorias || []).map((categoria, index) => (
                    <div key={index} className="table-row table-row--5">
                      <div data-label="Categoria">
                        <span className="badge" style={{ 
                          backgroundColor: categoria.cor || COLORS[index % COLORS.length],
                          color: 'white'
                        }}>
                          {categoria.categoria || 'Sem categoria'}
                        </span>
                      </div>
                      <div data-label="Total" style={{ fontWeight: '600' }}>
                        {formatCurrency(categoria.total || 0)}
                      </div>
                      <div data-label="Média">{formatCurrency(categoria.media || 0)}</div>
                      <div data-label="Quantidade">{categoria.quantidade || 0}</div>
                      <div data-label="Percentual">{formatPercentage(categoria.percentual || 0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'heatmap' && heatmapData && (
            <HeatmapComponent data={heatmapData} />
          )}

          {activeTab === 'tendencias' && tendenciasData && (
            <div className="charts-section">
              <ChartViewer
                data={tendenciasData.tendencias || []}
                title={`Análise de Tendências - Últimos ${filtros.periodo || '12 meses'}`}
                subtitle="Evolução de receitas, despesas e saldo ao longo do tempo"
                chartTypes={['line', 'area', 'bar']}
                defaultType="line"
                formatValue={formatCurrency}
                xAxisKey="mes"
                yAxisKey="receitas"
                colors={COLORS}
              />
              
              <ChartViewer
                data={(tendenciasData.tendencias || []).map(item => ({
                  name: item.mes || 'Mês',
                  value: safeValue(item.crescimentoReceitas)
                }))}
                title="Crescimento de Receitas"
                subtitle="Percentual de crescimento mensal das receitas"
                chartTypes={['bar', 'line', 'area']}
                defaultType="bar"
                formatValue={(value) => {
                  if (value === null || value === undefined || isNaN(value)) {
                    return '0.00%';
                  }
                  return formatPercentage(value);
                }}
                xAxisKey="name"
                yAxisKey="value"
                colors={COLORS}
              />
              
              <ChartViewer
                data={(tendenciasData.tendencias || []).map(item => ({
                  name: item.mes || 'Mês',
                  value: safeValue(item.crescimentoDespesas)
                }))}
                title="Crescimento de Despesas"
                subtitle="Percentual de crescimento mensal das despesas"
                chartTypes={['bar', 'line', 'area']}
                defaultType="bar"
                formatValue={(value) => {
                  if (value === null || value === undefined || isNaN(value)) {
                    return '0.00%';
                  }
                  return formatPercentage(value);
                }}
                xAxisKey="name"
                yAxisKey="value"
                colors={COLORS}
              />
            </div>
          )}

          {activeTab === 'investimentos' && investimentosData && (
            <div className="charts-section">
              {(() => {
                const rentData = (investimentosData.porTipo || []).map(i => ({
                  name: i.tipo_investimento || 'Tipo',
                  value: safeValue(i.rendimento_medio)
                }));
                const maxVal = rentData.length ? Math.max(...rentData.map(d => d.value)) : 0;
                const yDomainDynamic = [0, Math.max(5, Math.ceil(maxVal * 1.2))];

                return (
                  <>
                    <ChartViewer
                      data={(investimentosData.porTipo || []).map(i => ({
                        name: i.tipo_investimento || 'Tipo',
                        value: safeValue(i.total_investido)
                      }))}
                      title="Performance por Tipo de Investimento"
                      subtitle="Comparação entre total investido e lucro por tipo"
                      chartTypes={['bar', 'line', 'area']}
                      defaultType="bar"
                      formatValue={(value) => {
                        if (value === null || value === undefined || isNaN(value)) {
                          return 'R$ 0,00';
                        }
                        return formatCurrency(value);
                      }}
                      xAxisKey="name"
                      yAxisKey="value"
                      colors={COLORS}
                    />

                    <ChartViewer
                      data={rentData}
                      title="Rentabilidade Média por Tipo"
                      subtitle="Rendimento médio por tipo de investimento"
                      chartTypes={['bar', 'line', 'area', 'radar']}
                      defaultType="bar"
                      formatValue={(value) => {
                        if (value === null || value === undefined || isNaN(value)) {
                          return '0.00%';
                        }
                        return formatPercentage(value);
                      }}
                      xAxisKey="name"
                      yAxisKey="value"
                      colors={COLORS}
                      yDomain={yDomainDynamic}
                    />
                  </>
                );
              })()}
 
              <div className="welcome-card">
                <h3>Performance Detalhada dos Investimentos</h3>
                <div className="table-container">
                  <div className="table-header table-header--6">
                    <div>Investimento</div>
                    <div>Valor Inicial</div>
                    <div>Valor Atual</div>
                    <div>Lucro</div>
                    <div>Rentabilidade</div>
                    <div>Tipo</div>
                  </div>
                  
                  {(investimentosData.performance || []).map((inv, index) => (
                    <div key={index} className="table-row table-row--6">
                      <div data-label="Investimento" style={{ fontWeight: '600' }}>{inv.titulo || 'Sem título'}</div>
                      <div data-label="Valor Inicial">{formatCurrency(inv.valor_inicial || 0)}</div>
                      <div data-label="Valor Atual">{formatCurrency(inv.valor_atual || 0)}</div>
                      <div data-label="Lucro" style={{ 
                        color: inv.lucro >= 0 ? 'var(--success-color)' : 'var(--danger-color)',
                        fontWeight: '600'
                      }}>
                        {inv.lucro >= 0 ? '+' : ''}{formatCurrency(inv.lucro)}
                      </div>
                      <div data-label="Rentabilidade" style={{ 
                        color: inv.lucro >= 0 ? 'var(--success-color)' : 'var(--danger-color)'
                      }}>
                        {formatPercentage(safeValue(inv.valor_inicial) > 0 ? (safeValue(inv.lucro) / safeValue(inv.valor_inicial)) * 100 : 0)}
                      </div>
                      <div data-label="Tipo">
                        <span className="badge" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                        {inv.tipo_investimento || 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fluxo-caixa' && fluxoCaixaData && (
            <div>
              <div className="row mb-4">
                <div className="col-md-4">
                  <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <h3 style={{ color: 'var(--success-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>
                      {formatCurrency((fluxoCaixaData.fluxo || []).reduce((sum, item) => sum + safeValue(item.entradas), 0))}
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Entradas</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <h3 style={{ color: 'var(--danger-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>
                      {formatCurrency((fluxoCaixaData.fluxo || []).reduce((sum, item) => sum + safeValue(item.saidas), 0))}
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Saídas</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="welcome-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <h3 style={{ 
                      color: (fluxoCaixaData.fluxo || [])[(fluxoCaixaData.fluxo || []).length - 1]?.saldo_acumulado >= 0 ? 'var(--success-color)' : 'var(--danger-color)', 
                      fontSize: '2rem', 
                      marginBottom: '0.5rem' 
                    }}>
                      {formatCurrency(safeValue((fluxoCaixaData.fluxo || [])[(fluxoCaixaData.fluxo || []).length - 1]?.saldo_acumulado))}
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Saldo Final</p>
                  </div>
                </div>
              </div>

              <div className="charts-section">
                <ChartViewer
                  data={(fluxoCaixaData.fluxo || []).map(item => ({
                    name: item.data || item.mes || 'Data',
                    value: safeValue(item.entradas),
                    entradas: safeValue(item.entradas),
                    saidas: safeValue(item.saidas),
                    saldo_acumulado: safeValue(item.saldo_acumulado)
                  }))}
                  title={`Fluxo de Caixa - ${format(new Date(filtros.ano || new Date().getFullYear(), (filtros.mes || 1) - 1), 'MMMM yyyy', { locale: ptBR }) || 'Janeiro 2024'}`}
                  subtitle="Entradas, saídas e saldo acumulado ao longo do período"
                  chartTypes={['line', 'area', 'bar']}
                  defaultType="line"
                  formatValue={(value) => {
                    if (value === null || value === undefined || isNaN(value)) {
                      return 'R$ 0,00';
                    }
                    return formatCurrency(value);
                  }}
                  xAxisKey="name"
                  yAxisKey="entradas"
                  multiSeries={true}
                  seriesKeys={['entradas', 'saidas', 'saldo_acumulado']}
                  colors={['#10b981', '#ef4444', '#3b82f6']}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Relatorios; 