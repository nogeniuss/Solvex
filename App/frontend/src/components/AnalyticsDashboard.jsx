import React, { useState, useEffect } from 'react';
import ChartViewer from './ChartViewer';
import DateRangeFilter from './DateRangeFilter';

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [filtros, setFiltros] = useState({
    periodo: '30d',
    data_inicio: '',
    data_fim: ''
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    fetchAnalyticsData();
  }, [filtros]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        periodo: filtros.periodo,
        data_inicio: filtros.data_inicio,
        data_fim: filtros.data_fim
      });

      const [dashboardRes, usersRes] = await Promise.all([
        fetch(`/api/analytics/dashboard?${params}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/analytics/users?${params}`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!dashboardRes.ok) {
        const err = await dashboardRes.json();
        throw new Error(err.error || 'Erro ao carregar analytics');
      }

      const dashboard = await dashboardRes.json();
      let users = {};
      if (usersRes.ok) {
        users = await usersRes.json();
      }

      // Derivar métricas de usuários
      const dauLast = Array.isArray(users.dau) && users.dau.length ? users.dau[users.dau.length - 1].users : 0;
      const mauLast = Array.isArray(users.mau) && users.mau.length ? users.mau[users.mau.length - 1].users : 0;
      const mauPrev = Array.isArray(users.mau) && users.mau.length > 1 ? users.mau[users.mau.length - 2].users : 0;

      const merged = {
        ...dashboard,
        users: {
          ...users,
          total_users: mauLast || dashboard?.overview?.active_users || 0,
          new_users: Math.max(0, mauLast - mauPrev),
          dau: users.dau || [],
          wau: users.wau || [],
          mau: users.mau || [],
          stickiness: mauLast > 0 ? (dauLast / mauLast) * 100 : 0
        }
      };

      setAnalyticsData(merged);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      setError(error.message || 'Erro ao carregar analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR').format(value || 0);
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

  const getMetricStatus = (value, threshold, type = 'higher') => {
    if (type === 'higher') {
      return value >= threshold ? 'good' : 'warning';
    } else {
      return value <= threshold ? 'good' : 'warning';
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando Analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="analytics-container">
          <div className="analytics-header">
            <h1>📊 Analytics Dashboard</h1>
            <p>Métricas agregadas para decisões estratégicas</p>
          </div>

          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          {/* Filtros */}
          <div className="filters-section">
            <DateRangeFilter
              filtros={filtros}
              setFiltros={setFiltros}
            />
          </div>

          {/* KPIs Principais */}
          <div className="kpis-section">
            <h2>📈 KPIs Principais</h2>
            <div className="kpis-grid">
              <div className="kpi-card">
                <div className="kpi-icon" style={{backgroundColor: 'var(--primary-light)'}}>
                  <i className="fas fa-users" style={{color: 'var(--primary-color)'}}></i>
                </div>
                <div className="kpi-content">
                  <h3>Usuários Ativos</h3>
                  <p className="kpi-value">{formatNumber(analyticsData?.overview?.active_users || 0)}</p>
                  <span className="kpi-variation" style={{color: getVariationColor(analyticsData?.overview?.active_users_variation)}}>
                    {getVariationIcon(analyticsData?.overview?.active_users_variation)} {formatPercentage(analyticsData?.overview?.active_users_variation)}
                  </span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon" style={{backgroundColor: 'var(--success-light)'}}>
                  <i className="fas fa-chart-line" style={{color: 'var(--success-color)'}}></i>
                </div>
                <div className="kpi-content">
                  <h3>MRR</h3>
                  <p className="kpi-value">{formatCurrency(analyticsData?.financial?.mrr || 0)}</p>
                  <span className="kpi-variation" style={{color: getVariationColor(analyticsData?.financial?.mrr_growth)}}>
                    {getVariationIcon(analyticsData?.financial?.mrr_growth)} {formatPercentage(analyticsData?.financial?.mrr_growth)}
                  </span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon" style={{backgroundColor: 'var(--warning-light)'}}>
                  <i className="fas fa-percentage" style={{color: 'var(--warning-color)'}}></i>
                </div>
                <div className="kpi-content">
                  <h3>Churn Rate</h3>
                  <p className="kpi-value">{formatPercentage(analyticsData?.financial?.churn_rate || 0)}</p>
                  <span className="kpi-status" style={{color: getMetricStatus(analyticsData?.financial?.churn_rate, 5, 'lower') === 'good' ? 'var(--success-color)' : 'var(--danger-color)'}}>
                    {getMetricStatus(analyticsData?.financial?.churn_rate, 5, 'lower') === 'good' ? '✅ Saudável' : '⚠️ Alto'}
                  </span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon" style={{backgroundColor: 'var(--info-light)'}}>
                  <i className="fas fa-bullseye" style={{color: 'var(--info-color)'}}></i>
                </div>
                <div className="kpi-content">
                  <h3>Activation Rate</h3>
                  <p className="kpi-value">{formatPercentage(analyticsData?.conversion?.activation_rate || 0)}</p>
                  <span className="kpi-status" style={{color: getMetricStatus(analyticsData?.conversion?.activation_rate, 40, 'higher') === 'good' ? 'var(--success-color)' : 'var(--warning-color)'}}>
                    {getMetricStatus(analyticsData?.conversion?.activation_rate, 40, 'higher') === 'good' ? '✅ Bom' : '⚠️ Baixo'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="analytics-tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`analytics-tab ${activeTab === 'overview' ? 'active' : ''}`}
            >
              📊 Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`analytics-tab ${activeTab === 'users' ? 'active' : ''}`}
            >
              👥 Usuários
            </button>
            <button
              onClick={() => setActiveTab('conversion')}
              className={`analytics-tab ${activeTab === 'conversion' ? 'active' : ''}`}
            >
              🎯 Conversão
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`analytics-tab ${activeTab === 'financial' ? 'active' : ''}`}
            >
              💰 Financeiro
            </button>
            <button
              onClick={() => setActiveTab('product')}
              className={`analytics-tab ${activeTab === 'product' ? 'active' : ''}`}
            >
              🚀 Produto
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`analytics-tab ${activeTab === 'support' ? 'active' : ''}`}
            >
              🛠️ Suporte
            </button>
          </div>

          {/* Conteúdo das Tabs */}
          <div className="analytics-content">
            {/* Visão Geral */}
            {activeTab === 'overview' && (
              <div className="analytics-section">
                <div className="overview-metrics">
                  <div className="metric-group">
                    <h3>👥 Métricas de Usuários</h3>
                    <div className="metric-grid">
                      <div className="metric-item">
                        <span className="metric-label">Total de Usuários</span>
                        <span className="metric-value">{formatNumber(analyticsData?.users?.total_users || 0)}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Novos Usuários</span>
                        <span className="metric-value">{formatNumber(analyticsData?.users?.new_users || 0)}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">DAU</span>
                        <span className="metric-value">{formatNumber(Array.isArray(analyticsData?.users?.dau) && analyticsData.users.dau.length ? analyticsData.users.dau[analyticsData.users.dau.length - 1].users : 0)}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">WAU</span>
                        <span className="metric-value">{formatNumber(Array.isArray(analyticsData?.users?.wau) && analyticsData.users.wau.length ? analyticsData.users.wau[analyticsData.users.wau.length - 1].users : 0)}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">MAU</span>
                        <span className="metric-value">{formatNumber(Array.isArray(analyticsData?.users?.mau) && analyticsData.users.mau.length ? analyticsData.users.mau[analyticsData.users.mau.length - 1].users : 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="metric-group">
                    <h3>💰 Métricas Financeiras</h3>
                    <div className="metric-grid">
                      <div className="metric-item">
                        <span className="metric-label">MRR</span>
                        <span className="metric-value">{formatCurrency(analyticsData?.financial?.mrr || 0)}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">ARR</span>
                        <span className="metric-value">{formatCurrency(analyticsData?.financial?.arr || 0)}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">LTV</span>
                        <span className="metric-value">{formatCurrency(analyticsData?.financial?.ltv || 0)}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">CAC</span>
                        <span className="metric-value">{formatCurrency(analyticsData?.financial?.cac || 0)}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">LTV/CAC</span>
                        <span className="metric-value">{analyticsData?.financial?.ltv_cac_ratio?.slice?.(-1)?.[0]?.ratio || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="metric-group">
                    <h3>🎯 Métricas de Conversão</h3>
                    <div className="metric-grid">
                      <div className="metric-item">
                        <span className="metric-label">Signup → Activation</span>
                        <span className="metric-value">{formatPercentage(analyticsData?.conversion?.activation_rate || 0)}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Tempo até Valor</span>
                        <span className="metric-value">{formatNumber(analyticsData?.conversion?.time_to_value || 0)} dias</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Upgrade Rate</span>
                        <span className="metric-value">{formatPercentage(analyticsData?.conversion?.upgrade_rate || 0)}</span>
                      </div>
                      <div className="metric-item">
                        <span className="metric-label">Downgrade Rate</span>
                        <span className="metric-value">{formatPercentage(analyticsData?.conversion?.downgrade_rate || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="charts-grid">
                  <div className="chart-card">
                    <ChartViewer
                      data={analyticsData?.overview?.user_growth || []}
                      title="Crescimento de Usuários"
                      subtitle="Evolução da base de usuários"
                      chartTypes={['line', 'area']}
                      defaultType="line"
                      formatValue={formatNumber}
                      colors={COLORS}
                    />
                  </div>

                  <div className="chart-card">
                    <ChartViewer
                      data={analyticsData?.overview?.revenue_growth || []}
                      title="Crescimento de Receita"
                      subtitle="Evolução do MRR"
                      chartTypes={['line', 'area']}
                      defaultType="line"
                      formatValue={formatCurrency}
                      colors={COLORS}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Usuários */}
            {activeTab === 'users' && (
              <div className="analytics-section">
                <h2>Análise de Usuários</h2>
                
                <div className="user-metrics">
                  <div className="metric-card">
                    <h3>📊 Atividade por Período</h3>
                    <div className="metric-stats">
                      <div className="metric-stat">
                        <span className="stat-label">Usuários Ativos Diários</span>
                        <span className="stat-value">{formatNumber(Array.isArray(analyticsData?.users?.dau) && analyticsData.users.dau.length ? analyticsData.users.dau[analyticsData.users.dau.length - 1].users : 0)}</span>
                      </div>
                      <div className="metric-stat">
                        <span className="stat-label">Usuários Ativos Semanais</span>
                        <span className="stat-value">{formatNumber(Array.isArray(analyticsData?.users?.wau) && analyticsData.users.wau.length ? analyticsData.users.wau[analyticsData.users.wau.length - 1].users : 0)}</span>
                      </div>
                      <div className="metric-stat">
                        <span className="stat-label">Usuários Ativos Mensais</span>
                        <span className="stat-value">{formatNumber(Array.isArray(analyticsData?.users?.mau) && analyticsData.users.mau.length ? analyticsData.users.mau[analyticsData.users.mau.length - 1].users : 0)}</span>
                      </div>
                      <div className="metric-stat">
                        <span className="stat-label">Stickiness (DAU/MAU)</span>
                        <span className="stat-value">{formatPercentage(analyticsData?.users?.stickiness || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {Array.isArray(analyticsData?.users?.retention) && analyticsData.users.retention.length > 0 && (
                    <div className="metric-card">
                      <h3>🔄 Retenção</h3>
                      <div className="metric-stats">
                        {/* Placeholder para futuras métricas detalhadas de retenção */}
                        <div className="metric-stat">
                          <span className="stat-label">Pontos de retenção</span>
                          <span className="stat-value">{analyticsData.users.retention.length}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="charts-grid">
                  <div className="chart-card">
                    <ChartViewer
                      data={analyticsData?.users?.dau || []}
                      title="Ativos Diários"
                      subtitle="DAU ao longo do tempo"
                      chartTypes={['line', 'area']}
                      defaultType="line"
                      formatValue={formatNumber}
                      xAxisKey="date"
                      yAxisKey="users"
                      colors={COLORS}
                    />
                  </div>

                  <div className="chart-card">
                    <ChartViewer
                      data={analyticsData?.users?.mau || []}
                      title="Ativos Mensais"
                      subtitle="MAU ao longo do tempo"
                      chartTypes={['line', 'area']}
                      defaultType="line"
                      formatValue={formatNumber}
                      xAxisKey="month"
                      yAxisKey="users"
                      colors={COLORS}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Conversão */}
            {activeTab === 'conversion' && (
              <div className="analytics-section">
                <h2>Funnel de Conversão</h2>
                
                <div className="funnel-metrics">
                  <div className="funnel-step">
                    <div className="step-header">
                      <h3>👥 Visitantes</h3>
                      <span className="step-count">{formatNumber(analyticsData?.conversion?.funnel?.[0]?.users || 0)}</span>
                    </div>
                    <div className="step-conversion">
                      <span className="conversion-rate">100%</span>
                    </div>
                  </div>

                  {/* Outras etapas exibidas conforme dados existirem */}
                </div>

                <div className="charts-grid">
                  <div className="chart-card">
                    <ChartViewer
                      data={analyticsData?.conversion?.funnel || []}
                      title="Funnel de Conversão"
                      subtitle="Taxa de conversão por etapa"
                      chartTypes={['bar', 'line']}
                      defaultType="bar"
                      formatValue={formatPercentage}
                      xAxisKey="step_name"
                      yAxisKey="conversion_rate"
                      colors={COLORS}
                    />
                  </div>

                  <div className="chart-card">
                    <ChartViewer
                      data={analyticsData?.conversion?.funnel || []}
                      title="Tendência do Funnel"
                      subtitle="Usuários por etapa"
                      chartTypes={['line', 'area']}
                      defaultType="line"
                      formatValue={formatNumber}
                      xAxisKey="step_name"
                      yAxisKey="users"
                      colors={COLORS}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Financeiro */}
            {activeTab === 'financial' && (
              <div className="analytics-section">
                <h2>Métricas Financeiras</h2>
                
                <div className="financial-metrics">
                  <div className="metric-card">
                    <h3>💰 Receita</h3>
                    <div className="metric-stats">
                      <div className="metric-stat">
                        <span className="stat-label">MRR</span>
                        <span className="stat-value">{formatCurrency(analyticsData?.financial?.mrr || 0)}</span>
                      </div>
                      <div className="metric-stat">
                        <span className="stat-label">ARR</span>
                        <span className="stat-value">{formatCurrency(analyticsData?.financial?.arr || 0)}</span>
                      </div>
                      <div className="metric-stat">
                        <span className="stat-label">Crescimento MRR</span>
                        <span className="stat-value">{formatPercentage(analyticsData?.financial?.mrr_growth || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <h3>📊 Custos</h3>
                    <div className="metric-stats">
                      <div className="metric-stat">
                        <span className="stat-label">CAC</span>
                        <span className="stat-value">{formatCurrency(analyticsData?.financial?.cac || 0)}</span>
                      </div>
                      <div className="metric-stat">
                        <span className="stat-label">LTV</span>
                        <span className="stat-value">{formatCurrency(analyticsData?.financial?.ltv || 0)}</span>
                      </div>
                      <div className="metric-stat">
                        <span className="stat-label">LTV/CAC</span>
                        <span className="stat-value">{analyticsData?.financial?.ltv_cac_ratio?.slice?.(-1)?.[0]?.ratio || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <h3>🔄 Churn</h3>
                    <div className="metric-stats">
                      <div className="metric-stat">
                        <span className="stat-label">Churn Rate</span>
                        <span className="stat-value">{formatPercentage(analyticsData?.financial?.churn_rate || 0)}</span>
                      </div>
                      <div className="metric-stat">
                        <span className="stat-label">Expansion Revenue</span>
                        <span className="stat-value">{formatCurrency(analyticsData?.financial?.expansion_revenue || 0)}</span>
                      </div>
                      <div className="metric-stat">
                        <span className="stat-label">Payback Time</span>
                        <span className="stat-value">{analyticsData?.financial?.payback_time || 0} meses</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="charts-grid">
                  <div className="chart-card">
                    <ChartViewer
                      data={analyticsData?.financial?.revenue_trend || []}
                      title="Evolução da Receita"
                      subtitle="MRR e ARR ao longo do tempo"
                      chartTypes={['line', 'area']}
                      defaultType="line"
                      formatValue={formatCurrency}
                      colors={COLORS}
                    />
                  </div>

                  <div className="chart-card">
                    <ChartViewer
                      data={analyticsData?.financial?.churn_analysis || []}
                      title="Análise de Churn"
                      subtitle="Taxa de churn por período"
                      chartTypes={['line', 'bar']}
                      defaultType="line"
                      formatValue={formatPercentage}
                      colors={COLORS}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Produto */}
            {activeTab === 'product' && (
              <div className="analytics-section">
                <h2>Métricas de Produto</h2>
                
                <div className="product-metrics">
                  <div className="metric-card">
                    <h3>🚀 Feature Adoption</h3>
                    <div className="metric-stats">
                      {(analyticsData?.product?.feature_usage || []).map((feature, index) => (
                        <div key={index} className="metric-stat">
                          <span className="stat-label">{feature.feature_name || feature.name}</span>
                          <span className="stat-value">{formatNumber(feature.users || feature.users_using || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="metric-card">
                    <h3>⏱️ Engajamento</h3>
                    <div className="metric-stats">
                      <div className="metric-stat">
                        <span className="stat-label">Tempo Médio de Sessão</span>
                        <span className="stat-value">{Math.round(analyticsData?.product?.avg_session_duration || 0)}min</span>
                      </div>
                      <div className="metric-stat">
                        <span className="stat-label">Eventos por Sessão</span>
                        <span className="stat-value">{Math.round(analyticsData?.product?.events_per_session || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="charts-grid">
                  <div className="chart-card">
                    <ChartViewer
                      data={analyticsData?.product?.feature_usage || []}
                      title="Uso de Funcionalidades"
                      subtitle="Adoção por feature"
                      chartTypes={['bar', 'pie']}
                      defaultType="bar"
                      formatValue={formatNumber}
                      xAxisKey="feature_name"
                      yAxisKey="users"
                      colors={COLORS}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Suporte */}
            {activeTab === 'support' && (
              <div className="analytics-section">
                <h2>Métricas de Suporte</h2>
                
                <div className="support-metrics">
                  <div className="metric-card">
                    <h3>🎫 Tickets</h3>
                    <div className="metric-stats">
                      <div className="metric-stat">
                        <span className="stat-label">Total de Tickets</span>
                        <span className="stat-value">{formatNumber(analyticsData?.support?.tickets_count || 0)}</span>
                      </div>
                      <div className="metric-stat">
                        <span className="stat-label">Tempo Médio de Resposta</span>
                        <span className="stat-value">{analyticsData?.support?.avg_response_time || 0}h</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="charts-grid">
                  <div className="chart-card">
                    <ChartViewer
                      data={analyticsData?.support?.ticket_trend || []}
                      title="Tendência de Tickets"
                      subtitle="Volume de tickets ao longo do tempo"
                      chartTypes={['line', 'area']}
                      defaultType="line"
                      formatValue={formatNumber}
                      colors={COLORS}
                    />
                  </div>

                  <div className="chart-card">
                    <ChartViewer
                      data={analyticsData?.support?.ticket_categories || []}
                      title="Categorias de Tickets"
                      subtitle="Distribuição por tipo de problema"
                      chartTypes={['pie', 'bar']}
                      defaultType="pie"
                      formatValue={formatNumber}
                      xAxisKey="category"
                      yAxisKey="count"
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
        .analytics-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 0;
        }

        .analytics-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .analytics-header h1 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          font-size: 2.5rem;
        }

        .analytics-header p {
          color: var(--text-secondary);
          font-size: 1.1rem;
        }

        .filters-section {
          margin-bottom: 2rem;
        }

        .kpis-section {
          margin-bottom: 2rem;
        }

        .kpis-section h2 {
          color: var(--text-primary);
          margin-bottom: 1.5rem;
        }

        .kpis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .kpi-card {
          background: var(--bg-secondary);
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

        .kpi-variation, .kpi-status {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .analytics-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1rem;
          overflow-x: auto;
        }

        .analytics-tab {
          padding: 0.75rem 1.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition);
          font-size: 0.875rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .analytics-tab:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .analytics-tab.active {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .analytics-section {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .analytics-section h2 {
          color: var(--text-primary);
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }

        .overview-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .metric-group h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
          font-size: 1.25rem;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .metric-item {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .metric-label {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .metric-value {
          color: var(--text-primary);
          font-weight: 600;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 2rem;
        }

        .chart-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }

        .user-metrics, .financial-metrics, .product-metrics, .support-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }

        .metric-card h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .metric-stats {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .metric-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-label {
          color: var(--text-secondary);
        }

        .stat-value {
          color: var(--text-primary);
          font-weight: 600;
        }

        .funnel-metrics {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .funnel-step {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .step-header h3 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .step-count {
          color: var(--text-primary);
          font-size: 1.5rem;
          font-weight: 700;
        }

        .step-conversion {
          text-align: right;
        }

        .conversion-rate {
          color: var(--primary-color);
          font-size: 1.25rem;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .analytics-tabs {
            flex-direction: column;
          }
          
          .kpis-grid {
            grid-template-columns: 1fr;
          }
          
          .overview-metrics {
            grid-template-columns: 1fr;
          }
          
          .charts-grid {
            grid-template-columns: 1fr;
          }
          
          .funnel-step {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsDashboard; 