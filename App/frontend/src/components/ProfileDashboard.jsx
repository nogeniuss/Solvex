import React, { useState, useEffect } from 'react';
import ChartViewer from './ChartViewer';

const ProfileDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [userMetrics, setUserMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    fetchUserProfile();
    fetchUserAlerts();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/analytics/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.profile);
        setUserMetrics(data.metrics);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao carregar perfil');
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      setError('Erro de conexão ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/analytics/alerts/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
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

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'var(--danger-color)';
      case 'medium': return 'var(--warning-color)';
      case 'low': return 'var(--info-color)';
      default: return 'var(--text-secondary)';
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'var(--success-color)';
    if (score >= 60) return 'var(--warning-color)';
    return 'var(--danger-color)';
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando Perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="profile-dashboard-container">
          <div className="profile-header">
            <div className="profile-info">
              <div className="profile-avatar">
                <span>{userProfile?.name?.charAt(0) || 'U'}</span>
              </div>
              <div className="profile-details">
                <h1>{userProfile?.name || 'Usuário'}</h1>
                <p>{userProfile?.email || 'email@exemplo.com'}</p>
                <span className="profile-plan">{userProfile?.plan || 'Free'}</span>
              </div>
            </div>
            
            <div className="profile-stats">
              <div className="stat-card">
                <div className="stat-icon" style={{backgroundColor: 'var(--primary-light)'}}>
                  <i className="fas fa-calendar" style={{color: 'var(--primary-color)'}}></i>
                </div>
                <div className="stat-content">
                  <h3>Membro desde</h3>
                  <p>{new Date(userProfile?.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{backgroundColor: 'var(--success-light)'}}>
                  <i className="fas fa-clock" style={{color: 'var(--success-color)'}}></i>
                </div>
                <div className="stat-content">
                  <h3>Último login</h3>
                  <p>{userProfile?.last_login ? new Date(userProfile.last_login).toLocaleDateString('pt-BR') : 'Nunca'}</p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          {/* Alertas do usuário */}
          {alerts.length > 0 && (
            <div className="alerts-section">
              <h2>🚨 Alertas Ativos</h2>
              <div className="alerts-grid">
                {alerts.map((alert, index) => (
                  <div key={index} className="alert-card" style={{borderLeftColor: getSeverityColor(alert.severity)}}>
                    <div className="alert-header">
                      <h3>{alert.title}</h3>
                      <span className="alert-severity" style={{color: getSeverityColor(alert.severity)}}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p>{alert.message}</p>
                    <small>{new Date(alert.created_at).toLocaleString('pt-BR')}</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="profile-tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
            >
              📊 Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`profile-tab ${activeTab === 'usage' ? 'active' : ''}`}
            >
              📈 Uso do Produto
            </button>
            <button
              onClick={() => setActiveTab('health')}
              className={`profile-tab ${activeTab === 'health' ? 'active' : ''}`}
            >
              ❤️ Saúde do Cliente
            </button>
            <button
              onClick={() => setActiveTab('behavior')}
              className={`profile-tab ${activeTab === 'behavior' ? 'active' : ''}`}
            >
              🎯 Comportamento
            </button>
          </div>

          {/* Conteúdo das Tabs */}
          <div className="profile-content">
            {/* Visão Geral */}
            {activeTab === 'overview' && (
              <div className="profile-section">
                <h2>Métricas Principais</h2>
                
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-icon" style={{backgroundColor: 'var(--success-light)'}}>
                      <i className="fas fa-heart" style={{color: 'var(--success-color)'}}></i>
                    </div>
                    <div className="metric-content">
                      <h3>Health Score</h3>
                      <p className="metric-value" style={{color: getHealthScoreColor(userMetrics?.health_score)}}>
                        {userMetrics?.health_score || 0}/100
                      </p>
                      <small>Score de saúde do cliente</small>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon" style={{backgroundColor: 'var(--primary-light)'}}>
                      <i className="fas fa-clock" style={{color: 'var(--primary-color)'}}></i>
                    </div>
                    <div className="metric-content">
                      <h3>Tempo Médio de Sessão</h3>
                      <p className="metric-value">{Math.round(userMetrics?.avg_session_duration || 0)}min</p>
                      <small>Últimos 7 dias</small>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon" style={{backgroundColor: 'var(--warning-light)'}}>
                      <i className="fas fa-puzzle-piece" style={{color: 'var(--warning-color)'}}></i>
                    </div>
                    <div className="metric-content">
                      <h3>Features Utilizadas</h3>
                      <p className="metric-value">{userMetrics?.features_used_count || 0}</p>
                      <small>Total de funcionalidades</small>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon" style={{backgroundColor: 'var(--info-light)'}}>
                      <i className="fas fa-calendar-check" style={{color: 'var(--info-color)'}}></i>
                    </div>
                    <div className="metric-content">
                      <h3>Sessões Totais</h3>
                      <p className="metric-value">{formatNumber(userMetrics?.total_sessions || 0)}</p>
                      <small>Desde o início</small>
                    </div>
                  </div>
                </div>

                <div className="charts-grid">
                  <div className="chart-card">
                    <ChartViewer
                      data={userMetrics?.session_history || []}
                      title="Histórico de Sessões"
                      subtitle="Últimos 30 dias"
                      chartTypes={['line', 'area']}
                      defaultType="line"
                      formatValue={formatNumber}
                      colors={COLORS}
                    />
                  </div>

                  <div className="chart-card">
                    <ChartViewer
                      data={userMetrics?.feature_usage || []}
                      title="Uso de Funcionalidades"
                      subtitle="Top features utilizadas"
                      chartTypes={['bar', 'pie']}
                      defaultType="bar"
                      formatValue={formatNumber}
                      colors={COLORS}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Uso do Produto */}
            {activeTab === 'usage' && (
              <div className="profile-section">
                <h2>Análise de Uso</h2>
                
                <div className="usage-metrics">
                  <div className="usage-card">
                    <h3>📱 Dispositivos Utilizados</h3>
                    <div className="usage-stats">
                      <div className="usage-stat">
                        <span className="stat-label">Desktop</span>
                        <span className="stat-value">{userMetrics?.device_usage?.desktop || 0}%</span>
                      </div>
                      <div className="usage-stat">
                        <span className="stat-label">Mobile</span>
                        <span className="stat-value">{userMetrics?.device_usage?.mobile || 0}%</span>
                      </div>
                      <div className="usage-stat">
                        <span className="stat-label">Tablet</span>
                        <span className="stat-value">{userMetrics?.device_usage?.tablet || 0}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="usage-card">
                    <h3>🌐 Navegadores</h3>
                    <div className="usage-stats">
                      {userMetrics?.browser_usage?.map((browser, index) => (
                        <div key={index} className="usage-stat">
                          <span className="stat-label">{browser.name}</span>
                          <span className="stat-value">{browser.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="usage-card">
                    <h3>⏰ Horários de Uso</h3>
                    <div className="usage-stats">
                      <div className="usage-stat">
                        <span className="stat-label">Manhã (6h-12h)</span>
                        <span className="stat-value">{userMetrics?.time_usage?.morning || 0}%</span>
                      </div>
                      <div className="usage-stat">
                        <span className="stat-label">Tarde (12h-18h)</span>
                        <span className="stat-value">{userMetrics?.time_usage?.afternoon || 0}%</span>
                      </div>
                      <div className="usage-stat">
                        <span className="stat-label">Noite (18h-24h)</span>
                        <span className="stat-value">{userMetrics?.time_usage?.evening || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="charts-grid">
                  <div className="chart-card">
                    <ChartViewer
                      data={userMetrics?.daily_activity || []}
                      title="Atividade Diária"
                      subtitle="Padrão de uso por dia da semana"
                      chartTypes={['bar', 'line']}
                      defaultType="bar"
                      formatValue={formatNumber}
                      colors={COLORS}
                    />
                  </div>

                  <div className="chart-card">
                    <ChartViewer
                      data={userMetrics?.hourly_activity || []}
                      title="Atividade por Hora"
                      subtitle="Padrão de uso por hora do dia"
                      chartTypes={['line', 'area']}
                      defaultType="line"
                      formatValue={formatNumber}
                      colors={COLORS}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Saúde do Cliente */}
            {activeTab === 'health' && (
              <div className="profile-section">
                <h2>Saúde do Cliente</h2>
                
                <div className="health-metrics">
                  <div className="health-card">
                    <div className="health-score">
                      <div className="score-circle" style={{borderColor: getHealthScoreColor(userMetrics?.health_score)}}>
                        <span className="score-value">{userMetrics?.health_score || 0}</span>
                        <span className="score-label">/100</span>
                      </div>
                      <h3>Health Score</h3>
                      <p>Score geral de saúde do cliente</p>
                    </div>
                  </div>

                  <div className="health-factors">
                    <h3>Fatores de Saúde</h3>
                    <div className="factor-list">
                      <div className="factor-item">
                        <span className="factor-name">Engajamento</span>
                        <div className="factor-bar">
                          <div 
                            className="factor-progress" 
                            style={{
                              width: `${userMetrics?.health_factors?.engagement || 0}%`,
                              backgroundColor: userMetrics?.health_factors?.engagement > 70 ? 'var(--success-color)' : 'var(--warning-color)'
                            }}
                          ></div>
                        </div>
                        <span className="factor-value">{userMetrics?.health_factors?.engagement || 0}%</span>
                      </div>

                      <div className="factor-item">
                        <span className="factor-name">Adoção de Features</span>
                        <div className="factor-bar">
                          <div 
                            className="factor-progress" 
                            style={{
                              width: `${userMetrics?.health_factors?.feature_adoption || 0}%`,
                              backgroundColor: userMetrics?.health_factors?.feature_adoption > 70 ? 'var(--success-color)' : 'var(--warning-color)'
                            }}
                          ></div>
                        </div>
                        <span className="factor-value">{userMetrics?.health_factors?.feature_adoption || 0}%</span>
                      </div>

                      <div className="factor-item">
                        <span className="factor-name">Frequência de Uso</span>
                        <div className="factor-bar">
                          <div 
                            className="factor-progress" 
                            style={{
                              width: `${userMetrics?.health_factors?.usage_frequency || 0}%`,
                              backgroundColor: userMetrics?.health_factors?.usage_frequency > 70 ? 'var(--success-color)' : 'var(--warning-color)'
                            }}
                          ></div>
                        </div>
                        <span className="factor-value">{userMetrics?.health_factors?.usage_frequency || 0}%</span>
                      </div>

                      <div className="factor-item">
                        <span className="factor-name">Satisfação</span>
                        <div className="factor-bar">
                          <div 
                            className="factor-progress" 
                            style={{
                              width: `${userMetrics?.health_factors?.satisfaction || 0}%`,
                              backgroundColor: userMetrics?.health_factors?.satisfaction > 70 ? 'var(--success-color)' : 'var(--warning-color)'
                            }}
                          ></div>
                        </div>
                        <span className="factor-value">{userMetrics?.health_factors?.satisfaction || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="health-recommendations">
                  <h3>💡 Recomendações</h3>
                  <div className="recommendations-list">
                    {userMetrics?.recommendations?.map((rec, index) => (
                      <div key={index} className="recommendation-item">
                        <i className="fas fa-lightbulb"></i>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Comportamento */}
            {activeTab === 'behavior' && (
              <div className="profile-section">
                <h2>Análise de Comportamento</h2>
                
                <div className="behavior-metrics">
                  <div className="behavior-card">
                    <h3>🎯 Padrões de Uso</h3>
                    <div className="behavior-stats">
                      <div className="behavior-stat">
                        <span className="stat-label">Dias ativos por semana</span>
                        <span className="stat-value">{userMetrics?.behavior?.active_days_per_week || 0}</span>
                      </div>
                      <div className="behavior-stat">
                        <span className="stat-label">Sessões por dia</span>
                        <span className="stat-value">{userMetrics?.behavior?.sessions_per_day || 0}</span>
                      </div>
                      <div className="behavior-stat">
                        <span className="stat-label">Tempo total por semana</span>
                        <span className="stat-value">{Math.round(userMetrics?.behavior?.total_time_per_week || 0)}min</span>
                      </div>
                    </div>
                  </div>

                  <div className="behavior-card">
                    <h3>🔄 Retenção</h3>
                    <div className="behavior-stats">
                      <div className="behavior-stat">
                        <span className="stat-label">Retorno após 1 dia</span>
                        <span className="stat-value">{userMetrics?.retention?.day_1 || 0}%</span>
                      </div>
                      <div className="behavior-stat">
                        <span className="stat-label">Retorno após 7 dias</span>
                        <span className="stat-value">{userMetrics?.retention?.day_7 || 0}%</span>
                      </div>
                      <div className="behavior-stat">
                        <span className="stat-label">Retorno após 30 dias</span>
                        <span className="stat-value">{userMetrics?.retention?.day_30 || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="charts-grid">
                  <div className="chart-card">
                    <ChartViewer
                      data={userMetrics?.behavior_trend || []}
                      title="Tendência de Comportamento"
                      subtitle="Evolução do uso ao longo do tempo"
                      chartTypes={['line', 'area']}
                      defaultType="line"
                      formatValue={formatNumber}
                      colors={COLORS}
                    />
                  </div>

                  <div className="chart-card">
                    <ChartViewer
                      data={userMetrics?.retention_curve || []}
                      title="Curva de Retenção"
                      subtitle="Taxa de retenção por período"
                      chartTypes={['line', 'bar']}
                      defaultType="line"
                      formatValue={(value) => `${value}%`}
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
        .profile-dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 0;
        }

        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 2rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
        }

        .profile-info {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--primary-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 700;
          color: white;
        }

        .profile-details h1 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .profile-details p {
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .profile-plan {
          background: var(--primary-color);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .profile-stats {
          display: flex;
          gap: 1rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .stat-content h3 {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .stat-content p {
          color: var(--text-primary);
          font-weight: 600;
        }

        .alerts-section {
          margin-bottom: 2rem;
        }

        .alerts-section h2 {
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .alerts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .alert-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-left: 4px solid;
          border-radius: var(--radius-md);
          padding: 1rem;
        }

        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .alert-header h3 {
          color: var(--text-primary);
          font-size: 1rem;
        }

        .alert-severity {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .alert-card p {
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .alert-card small {
          color: var(--text-secondary);
          font-size: 0.75rem;
        }

        .profile-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1rem;
        }

        .profile-tab {
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

        .profile-tab:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .profile-tab.active {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .profile-section {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .profile-section h2 {
          color: var(--text-primary);
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: var(--transition);
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .metric-icon {
          width: 60px;
          height: 60px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .metric-content h3 {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .metric-value {
          color: var(--text-primary);
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .metric-content small {
          color: var(--text-secondary);
          font-size: 0.75rem;
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

        .usage-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .usage-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }

        .usage-card h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .usage-stats {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .usage-stat {
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

        .health-metrics {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .health-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 2rem;
          text-align: center;
        }

        .health-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .score-circle {
          width: 120px;
          height: 120px;
          border: 8px solid;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .score-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .score-label {
          font-size: 1rem;
          color: var(--text-secondary);
        }

        .health-factors h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .factor-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .factor-item {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .factor-name {
          color: var(--text-secondary);
          min-width: 120px;
        }

        .factor-bar {
          flex: 1;
          height: 8px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .factor-progress {
          height: 100%;
          transition: width 0.3s ease;
        }

        .factor-value {
          color: var(--text-primary);
          font-weight: 600;
          min-width: 40px;
          text-align: right;
        }

        .health-recommendations {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }

        .health-recommendations h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .recommendations-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .recommendation-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--text-secondary);
        }

        .recommendation-item i {
          color: var(--warning-color);
        }

        .behavior-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .behavior-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.5rem;
        }

        .behavior-card h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .behavior-stats {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .behavior-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        @media (max-width: 768px) {
          .profile-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .profile-stats {
            flex-direction: column;
          }
          
          .health-metrics {
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

export default ProfileDashboard; 