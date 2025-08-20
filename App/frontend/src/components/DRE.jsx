import React, { useState, useEffect } from 'react';
import ChartViewer from './ChartViewer';
import FiltersToggle from './FiltersToggle';
import DateRangeFilter from './DateRangeFilter';

const DRE = () => {
  const [loading, setLoading] = useState(true);
  const [dreData, setDreData] = useState(null);
  const [comparativo, setComparativo] = useState(null);
  const [filtros, setFiltros] = useState({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    periodo_comparativo: 'mes_anterior'
  });
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('atual');

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    fetchDREData();
  }, [filtros]);

  const fetchDREData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        ano: filtros.ano,
        mes: filtros.mes,
        periodo_comparativo: filtros.periodo_comparativo
      });

      const [dreResponse, comparativoResponse] = await Promise.all([
        fetch(`/api/dre?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/dre/comparativo?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (dreResponse.ok) {
        const data = await dreResponse.json();
        setDreData(data.dre);
      } else {
        const errorData = await dreResponse.json();
        setError(errorData.error || 'Erro ao carregar DRE');
      }

      if (comparativoResponse.ok) {
        const data = await comparativoResponse.json();
        setComparativo(data.comparativo);
      }
    } catch (error) {
      console.error('Erro ao carregar DRE:', error);
      setError('Erro de conexão ao carregar DRE');
    } finally {
      setLoading(false);
    }
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

  const calculateVariation = (atual, anterior) => {
    if (!anterior || anterior === 0) return 0;
    return ((atual - anterior) / anterior) * 100;
  };

  const getVariationColor = (variation) => {
    if (variation > 0) return 'var(--success-color)';
    if (variation < 0) return 'var(--danger-color)';
    return 'var(--text-secondary)';
  };

  const getVariationIcon = (variation) => {
    if (variation > 0) return '↗️';
    if (variation < 0) return '↘️';
    return '→';
  };

  const prepareChartData = () => {
    if (!dreData) return {};

    // Dados para gráfico de receitas vs despesas
    const receitasVsDespesas = [
      { name: 'Receitas', value: dreData.receitas_liquidas, color: '#10b981' },
      { name: 'Despesas', value: Math.abs(dreData.despesas_totais), color: '#ef4444' }
    ];

    // Dados para gráfico de evolução mensal
    const evolucaoMensal = comparativo?.evolucao_mensal || [];

    // Dados para gráfico de margem de lucro
    const margemLucro = [
      { name: 'Margem de Lucro', value: dreData.margem_lucro, color: '#3b82f6' }
    ];

    return {
      receitasVsDespesas,
      evolucaoMensal,
      margemLucro
    };
  };

  const { receitasVsDespesas, evolucaoMensal, margemLucro } = prepareChartData();

  if (loading) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando DRE...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dre-container">
          <div className="dre-header">
            <h1>📊 DRE - Demonstração do Resultado do Exercício</h1>
            <p>Análise completa da performance financeira</p>
          </div>

          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          {/* Filtros */}
          <FiltersToggle title="Filtros do DRE">
            <div className="filters-container">
              <div className="filters-header">
                <div>
                  <h3 className="filters-title">
                    Filtros do DRE
                    <span className="filters-count">
                      {Object.values(filtros).filter(v => v !== '').length}
                    </span>
                  </h3>
                  <p className="filters-subtitle">Configure o período para análise do DRE</p>
                </div>
              </div>
              
              <div className="filters-row">
                <div className="filter-group">
                  <label>Ano</label>
                  <select
                    className="form-control"
                    value={filtros.ano}
                    onChange={(e) => setFiltros({...filtros, ano: parseInt(e.target.value)})}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(ano => (
                      <option key={ano} value={ano}>{ano}</option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Mês</label>
                  <select
                    className="form-control"
                    value={filtros.mes}
                    onChange={(e) => setFiltros({...filtros, mes: parseInt(e.target.value)})}
                  >
                    <option value="">Todos os meses</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                      <option key={mes} value={mes}>
                        {new Date(2024, mes - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Comparativo</label>
                  <select
                    className="form-control"
                    value={filtros.periodo_comparativo}
                    onChange={(e) => setFiltros({...filtros, periodo_comparativo: e.target.value})}
                  >
                    <option value="mes_anterior">Mês Anterior</option>
                    <option value="mes_ano_anterior">Mesmo Mês Ano Anterior</option>
                    <option value="trimestre_anterior">Trimestre Anterior</option>
                  </select>
                </div>
              </div>
            </div>
          </FiltersToggle>

          {/* KPIs Principais */}
          <div className="dre-kpis">
            <div className="kpi-card">
              <div className="kpi-icon" style={{backgroundColor: 'var(--success-light)'}}>
                <i className="fas fa-arrow-up" style={{color: 'var(--success-color)'}}></i>
              </div>
              <div className="kpi-content">
                <h3>Receitas Líquidas</h3>
                <p className="kpi-value">{formatCurrency(dreData?.receitas_liquidas || 0)}</p>
                {comparativo && (
                  <small style={{color: getVariationColor(calculateVariation(dreData?.receitas_liquidas, comparativo?.receitas_liquidas_anterior))}}>
                    {getVariationIcon(calculateVariation(dreData?.receitas_liquidas, comparativo?.receitas_liquidas_anterior))}
                    {formatPercentage(calculateVariation(dreData?.receitas_liquidas, comparativo?.receitas_liquidas_anterior))}
                  </small>
                )}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{backgroundColor: 'var(--danger-light)'}}>
                <i className="fas fa-arrow-down" style={{color: 'var(--danger-color)'}}></i>
              </div>
              <div className="kpi-content">
                <h3>Despesas Totais</h3>
                <p className="kpi-value">{formatCurrency(dreData?.despesas_totais || 0)}</p>
                {comparativo && (
                  <small style={{color: getVariationColor(calculateVariation(dreData?.despesas_totais, comparativo?.despesas_totais_anterior))}}>
                    {getVariationIcon(calculateVariation(dreData?.despesas_totais, comparativo?.despesas_totais_anterior))}
                    {formatPercentage(calculateVariation(dreData?.despesas_totais, comparativo?.despesas_totais_anterior))}
                  </small>
                )}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{backgroundColor: 'var(--primary-light)'}}>
                <i className="fas fa-chart-line" style={{color: 'var(--primary-color)'}}></i>
              </div>
              <div className="kpi-content">
                <h3>Resultado Líquido</h3>
                <p className="kpi-value" style={{color: (dreData?.resultado_liquido || 0) >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}}>
                  {formatCurrency(dreData?.resultado_liquido || 0)}
                </p>
                {comparativo && (
                  <small style={{color: getVariationColor(calculateVariation(dreData?.resultado_liquido, comparativo?.resultado_liquido_anterior))}}>
                    {getVariationIcon(calculateVariation(dreData?.resultado_liquido, comparativo?.resultado_liquido_anterior))}
                    {formatPercentage(calculateVariation(dreData?.resultado_liquido, comparativo?.resultado_liquido_anterior))}
                  </small>
                )}
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{backgroundColor: 'var(--warning-light)'}}>
                <i className="fas fa-percentage" style={{color: 'var(--warning-color)'}}></i>
              </div>
              <div className="kpi-content">
                <h3>Margem de Lucro</h3>
                <p className="kpi-value">{formatPercentage(dreData?.margem_lucro || 0)}</p>
                {comparativo && (
                  <small style={{color: getVariationColor(calculateVariation(dreData?.margem_lucro, comparativo?.margem_lucro_anterior))}}>
                    {getVariationIcon(calculateVariation(dreData?.margem_lucro, comparativo?.margem_lucro_anterior))}
                    {formatPercentage(calculateVariation(dreData?.margem_lucro, comparativo?.margem_lucro_anterior))}
                  </small>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="dre-tabs">
            <button
              onClick={() => setActiveTab('atual')}
              className={`dre-tab ${activeTab === 'atual' ? 'active' : ''}`}
            >
              📋 DRE Atual
            </button>
            <button
              onClick={() => setActiveTab('comparativo')}
              className={`dre-tab ${activeTab === 'comparativo' ? 'active' : ''}`}
            >
              📊 Comparativo
            </button>
            <button
              onClick={() => setActiveTab('graficos')}
              className={`dre-tab ${activeTab === 'graficos' ? 'active' : ''}`}
            >
              📈 Gráficos
            </button>
          </div>

          {/* Conteúdo das Tabs */}
          <div className="dre-content">
            {/* DRE Atual */}
            {activeTab === 'atual' && (
              <div className="dre-section">
                <h2>Demonstração do Resultado do Exercício</h2>
                
                <div className="dre-table">
                  <div className="dre-row header">
                    <div className="dre-item">Descrição</div>
                    <div className="dre-item">Valor</div>
                    <div className="dre-item">%</div>
                  </div>

                  <div className="dre-row receita">
                    <div className="dre-item">RECEITAS BRUTAS</div>
                    <div className="dre-item">{formatCurrency(dreData?.receitas_brutas || 0)}</div>
                    <div className="dre-item">100%</div>
                  </div>

                  <div className="dre-row deducao">
                    <div className="dre-item">(-) Deduções</div>
                    <div className="dre-item">({formatCurrency(dreData?.deducoes || 0)})</div>
                    <div className="dre-item">{formatPercentage(dreData?.deducoes_percentual || 0)}</div>
                  </div>

                  <div className="dre-row receita-liquida">
                    <div className="dre-item">= RECEITAS LÍQUIDAS</div>
                    <div className="dre-item">{formatCurrency(dreData?.receitas_liquidas || 0)}</div>
                    <div className="dre-item">{formatPercentage(dreData?.receitas_liquidas_percentual || 0)}</div>
                  </div>

                  <div className="dre-row despesa">
                    <div className="dre-item">(-) DESPESAS OPERACIONAIS</div>
                    <div className="dre-item">({formatCurrency(dreData?.despesas_operacionais || 0)})</div>
                    <div className="dre-item">{formatPercentage(dreData?.despesas_operacionais_percentual || 0)}</div>
                  </div>

                  <div className="dre-row resultado-operacional">
                    <div className="dre-item">= RESULTADO OPERACIONAL</div>
                    <div className="dre-item">{formatCurrency(dreData?.resultado_operacional || 0)}</div>
                    <div className="dre-item">{formatPercentage(dreData?.resultado_operacional_percentual || 0)}</div>
                  </div>

                  <div className="dre-row receita-financeira">
                    <div className="dre-item">(+) Receitas Financeiras</div>
                    <div className="dre-item">{formatCurrency(dreData?.receitas_financeiras || 0)}</div>
                    <div className="dre-item">{formatPercentage(dreData?.receitas_financeiras_percentual || 0)}</div>
                  </div>

                  <div className="dre-row despesa-financeira">
                    <div className="dre-item">(-) Despesas Financeiras</div>
                    <div className="dre-item">({formatCurrency(dreData?.despesas_financeiras || 0)})</div>
                    <div className="dre-item">{formatPercentage(dreData?.despesas_financeiras_percentual || 0)}</div>
                  </div>

                  <div className="dre-row resultado-liquido">
                    <div className="dre-item">= RESULTADO LÍQUIDO</div>
                    <div className="dre-item">{formatCurrency(dreData?.resultado_liquido || 0)}</div>
                    <div className="dre-item">{formatPercentage(dreData?.resultado_liquido_percentual || 0)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Comparativo */}
            {activeTab === 'comparativo' && comparativo && (
              <div className="dre-section">
                <h2>Análise Comparativa</h2>
                
                <div className="comparativo-grid">
                  <div className="comparativo-card">
                    <h3>Receitas Líquidas</h3>
                    <div className="comparativo-values">
                      <div className="valor-atual">{formatCurrency(dreData?.receitas_liquidas || 0)}</div>
                      <div className="valor-anterior">{formatCurrency(comparativo?.receitas_liquidas_anterior || 0)}</div>
                      <div className="variacao" style={{color: getVariationColor(calculateVariation(dreData?.receitas_liquidas, comparativo?.receitas_liquidas_anterior))}}>
                        {getVariationIcon(calculateVariation(dreData?.receitas_liquidas, comparativo?.receitas_liquidas_anterior))}
                        {formatPercentage(calculateVariation(dreData?.receitas_liquidas, comparativo?.receitas_liquidas_anterior))}
                      </div>
                    </div>
                  </div>

                  <div className="comparativo-card">
                    <h3>Despesas Totais</h3>
                    <div className="comparativo-values">
                      <div className="valor-atual">{formatCurrency(dreData?.despesas_totais || 0)}</div>
                      <div className="valor-anterior">{formatCurrency(comparativo?.despesas_totais_anterior || 0)}</div>
                      <div className="variacao" style={{color: getVariationColor(calculateVariation(dreData?.despesas_totais, comparativo?.despesas_totais_anterior))}}>
                        {getVariationIcon(calculateVariation(dreData?.despesas_totais, comparativo?.despesas_totais_anterior))}
                        {formatPercentage(calculateVariation(dreData?.despesas_totais, comparativo?.despesas_totais_anterior))}
                      </div>
                    </div>
                  </div>

                  <div className="comparativo-card">
                    <h3>Resultado Líquido</h3>
                    <div className="comparativo-values">
                      <div className="valor-atual">{formatCurrency(dreData?.resultado_liquido || 0)}</div>
                      <div className="valor-anterior">{formatCurrency(comparativo?.resultado_liquido_anterior || 0)}</div>
                      <div className="variacao" style={{color: getVariationColor(calculateVariation(dreData?.resultado_liquido, comparativo?.resultado_liquido_anterior))}}>
                        {getVariationIcon(calculateVariation(dreData?.resultado_liquido, comparativo?.resultado_liquido_anterior))}
                        {formatPercentage(calculateVariation(dreData?.resultado_liquido, comparativo?.resultado_liquido_anterior))}
                      </div>
                    </div>
                  </div>

                  <div className="comparativo-card">
                    <h3>Margem de Lucro</h3>
                    <div className="comparativo-values">
                      <div className="valor-atual">{formatPercentage(dreData?.margem_lucro || 0)}</div>
                      <div className="valor-anterior">{formatPercentage(comparativo?.margem_lucro_anterior || 0)}</div>
                      <div className="variacao" style={{color: getVariationColor(calculateVariation(dreData?.margem_lucro, comparativo?.margem_lucro_anterior))}}>
                        {getVariationIcon(calculateVariation(dreData?.margem_lucro, comparativo?.margem_lucro_anterior))}
                        {formatPercentage(calculateVariation(dreData?.margem_lucro, comparativo?.margem_lucro_anterior))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gráficos */}
            {activeTab === 'graficos' && (
              <div className="dre-section">
                <h2>Análise Gráfica</h2>
                
                <div className="charts-grid">
                  <div className="chart-card">
                    <ChartViewer
                      data={receitasVsDespesas}
                      title="Receitas vs Despesas"
                      subtitle="Distribuição entre receitas e despesas"
                      chartTypes={['pie', 'doughnut']}
                      defaultType="pie"
                      formatValue={formatCurrency}
                      colors={COLORS}
                    />
                  </div>

                  <div className="chart-card">
                    <ChartViewer
                      data={evolucaoMensal}
                      title="Evolução Mensal"
                      subtitle="Tendência de receitas e despesas"
                      chartTypes={['line', 'area', 'bar']}
                      defaultType="line"
                      formatValue={formatCurrency}
                      xAxisKey="mes"
                      yAxisKey="valor"
                      colors={COLORS}
                    />
                  </div>

                  <div className="chart-card">
                    <ChartViewer
                      data={margemLucro}
                      title="Margem de Lucro"
                      subtitle="Evolução da margem de lucro"
                      chartTypes={['bar', 'line']}
                      defaultType="bar"
                      formatValue={formatPercentage}
                      colors={COLORS}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .dre-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 0;
        }

        .dre-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .dre-header h1 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .dre-header p {
          color: var(--text-secondary);
        }

        .dre-kpis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .kpi-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: var(--transition);
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .kpi-icon {
          width: 60px;
          height: 60px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .kpi-content h3 {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .kpi-value {
          color: var(--text-primary);
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .dre-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1rem;
        }

        .dre-tab {
          padding: 0.75rem 1.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .dre-tab:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .dre-tab.active {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .dre-section {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .dre-section h2 {
          color: var(--text-primary);
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }

        .dre-table {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .dre-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          border-bottom: 1px solid var(--border-color);
        }

        .dre-row:last-child {
          border-bottom: none;
        }

        .dre-row.header {
          background: var(--bg-secondary);
          font-weight: 600;
          color: var(--text-primary);
        }

        .dre-item {
          padding: 1rem;
          display: flex;
          align-items: center;
          font-size: 0.875rem;
        }

        .dre-row.receita .dre-item {
          color: var(--success-color);
          font-weight: 600;
        }

        .dre-row.deducao .dre-item {
          color: var(--text-secondary);
          font-style: italic;
        }

        .dre-row.receita-liquida .dre-item {
          color: var(--success-color);
          font-weight: 700;
          background: var(--success-light);
        }

        .dre-row.despesa .dre-item {
          color: var(--danger-color);
          font-weight: 600;
        }

        .dre-row.resultado-operacional .dre-item {
          color: var(--primary-color);
          font-weight: 700;
          background: var(--primary-light);
        }

        .dre-row.receita-financeira .dre-item {
          color: var(--success-color);
        }

        .dre-row.despesa-financeira .dre-item {
          color: var(--danger-color);
        }

        .dre-row.resultado-liquido .dre-item {
          color: var(--text-primary);
          font-weight: 700;
          background: var(--bg-secondary);
          font-size: 1rem;
        }

        .comparativo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .comparativo-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }

        .comparativo-card h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .comparativo-values {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .valor-atual {
          color: var(--text-primary);
          font-size: 1.25rem;
          font-weight: 600;
        }

        .valor-anterior {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .variacao {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
        }

        .chart-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }

        @media (max-width: 768px) {
          .dre-kpis {
            grid-template-columns: 1fr;
          }
          
          .dre-tabs {
            flex-direction: column;
          }
          
          .dre-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
          
          .comparativo-grid {
            grid-template-columns: 1fr;
          }
          
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default DRE; 