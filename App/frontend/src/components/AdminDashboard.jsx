import React, { useState, useEffect } from 'react';

function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [subscriptions, setSubscriptions] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAdminData();
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(loadAdminData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAdminData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [metricsRes, healthRes, subscriptionsRes, notificationsRes] = await Promise.all([
        fetch('/api/admin/metrics', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/health', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/subscriptions', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (healthRes.ok) setHealthStatus(await healthRes.json());
      if (subscriptionsRes.ok) setSubscriptions(await subscriptionsRes.json());
      if (notificationsRes.ok) setNotifications(await notificationsRes.json());

    } catch (error) {
      console.error('Erro ao carregar dados admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualBackup = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        alert('Backup iniciado com sucesso');
        loadAdminData();
      }
    } catch (error) {
      console.error('Erro ao iniciar backup:', error);
    }
  };

  const toggleNotificationJob = async (jobName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/notifications/toggle/${jobName}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        loadAdminData();
      }
    } catch (error) {
      console.error('Erro ao alterar job:', error);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Carregando dashboard admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🔧 Dashboard Administrativo</h1>
        <div className="admin-actions">
          <button onClick={handleManualBackup} className="btn-action">
            💾 Backup Manual
          </button>
          <button onClick={loadAdminData} className="btn-action">
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Navegação por abas */}
      <div className="admin-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Visão Geral
        </button>
        <button 
          className={`tab ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          ❤️ Saúde do Sistema
        </button>
        <button 
          className={`tab ${activeTab === 'subscriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscriptions')}
        >
          💳 Assinaturas
        </button>
        <button 
          className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notificações
        </button>
      </div>

      {/* Conteúdo das abas */}
      <div className="admin-content">
        {activeTab === 'overview' && (
          <OverviewTab metrics={metrics} />
        )}
        
        {activeTab === 'health' && (
          <HealthTab healthStatus={healthStatus} />
        )}
        
        {activeTab === 'subscriptions' && (
          <SubscriptionsTab subscriptions={subscriptions} />
        )}
        
        {activeTab === 'notifications' && (
          <NotificationsTab 
            notifications={notifications} 
            onToggleJob={toggleNotificationJob}
          />
        )}
      </div>
    </div>
  );
}

// Componente da aba Visão Geral
function OverviewTab({ metrics }) {
  if (!metrics) return <div>Carregando métricas...</div>;

  return (
    <div className="overview-tab">
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-info">
            <h3>Usuários Totais</h3>
            <p className="metric-value">{metrics.users?.total || 0}</p>
            <span className="metric-change">
              +{metrics.users?.newThisMonth || 0} este mês
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-info">
            <h3>Receita Mensal</h3>
            <p className="metric-value">R$ {(metrics.revenue?.monthly || 0).toFixed(2)}</p>
            <span className="metric-change">
              {metrics.revenue?.growth > 0 ? '+' : ''}{(metrics.revenue?.growth || 0).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📱</div>
          <div className="metric-info">
            <h3>Assinaturas Ativas</h3>
            <p className="metric-value">{metrics.subscriptions?.active || 0}</p>
            <span className="metric-change">
              {metrics.subscriptions?.retention || 0}% retenção
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-info">
            <h3>Transações</h3>
            <p className="metric-value">{metrics.transactions?.total || 0}</p>
            <span className="metric-change">
              {metrics.transactions?.today || 0} hoje
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos de tendência */}
      <div className="charts-container">
        <div className="chart-card">
          <h3>Crescimento de Usuários (30 dias)</h3>
          <div className="chart-placeholder">
            {/* Aqui você pode integrar uma biblioteca de gráficos como Chart.js */}
            <p>Gráfico de linha mostrando crescimento diário</p>
          </div>
        </div>

        <div className="chart-card">
          <h3>Receita por Plano</h3>
          <div className="chart-placeholder">
            <p>Gráfico de pizza mostrando distribuição de receita</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente da aba Saúde do Sistema
function HealthTab({ healthStatus }) {
  if (!healthStatus) return <div>Carregando status...</div>;

  return (
    <div className="health-tab">
      <div className="health-overview">
        <div className={`health-indicator ${healthStatus.overall}`}>
          <div className="health-icon">
            {healthStatus.overall === 'healthy' ? '✅' : 
             healthStatus.overall === 'warning' ? '⚠️' : '❌'}
          </div>
          <h2>Sistema {healthStatus.overall === 'healthy' ? 'Saudável' : 
                      healthStatus.overall === 'warning' ? 'Com Avisos' : 'Com Problemas'}</h2>
        </div>
      </div>

      <div className="health-details">
        <div className="health-section">
          <h3>🗄️ Banco de Dados</h3>
          <div className={`status-indicator ${healthStatus.database?.status || 'unknown'}`}>
            {healthStatus.database?.status || 'Desconhecido'}
          </div>
          <div className="health-metrics">
            <p>Conexões ativas: {healthStatus.database?.connections || 0}</p>
            <p>Tempo de resposta: {healthStatus.database?.responseTime || 0}ms</p>
            <p>Último backup: {healthStatus.database?.lastBackup || 'N/A'}</p>
          </div>
        </div>

        <div className="health-section">
          <h3>📧 Serviços de Notificação</h3>
          <div className="services-grid">
            <div className="service-item">
              <span>Email:</span>
              <div className={`status-indicator ${healthStatus.notifications?.email || 'unknown'}`}>
                {healthStatus.notifications?.email || 'Desconhecido'}
              </div>
            </div>
            <div className="service-item">
              <span>SMS:</span>
              <div className={`status-indicator ${healthStatus.notifications?.sms || 'unknown'}`}>
                {healthStatus.notifications?.sms || 'Desconhecido'}
              </div>
            </div>
          </div>
        </div>

        <div className="health-section">
          <h3>💳 Stripe</h3>
          <div className={`status-indicator ${healthStatus.stripe?.status || 'unknown'}`}>
            {healthStatus.stripe?.status || 'Desconhecido'}
          </div>
          <div className="health-metrics">
            <p>Última sincronização: {healthStatus.stripe?.lastSync || 'N/A'}</p>
            <p>Webhooks funcionando: {healthStatus.stripe?.webhooksWorking ? 'Sim' : 'Não'}</p>
          </div>
        </div>

        <div className="health-section">
          <h3>🖥️ Servidor</h3>
          <div className="health-metrics">
            <p>CPU: {healthStatus.server?.cpu || 0}%</p>
            <p>Memória: {healthStatus.server?.memory || 0}%</p>
            <p>Disco: {healthStatus.server?.disk || 0}%</p>
            <p>Uptime: {healthStatus.server?.uptime || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente da aba Assinaturas
function SubscriptionsTab({ subscriptions }) {
  if (!subscriptions) return <div>Carregando assinaturas...</div>;

  return (
    <div className="subscriptions-tab">
      <div className="subscription-summary">
        <div className="summary-card">
          <h3>Assinaturas por Status</h3>
          <div className="status-breakdown">
            <div className="status-item">
              <span className="status-color active"></span>
              Ativas: {subscriptions.byStatus?.active || 0}
            </div>
            <div className="status-item">
              <span className="status-color trialing"></span>
              Trial: {subscriptions.byStatus?.trialing || 0}
            </div>
            <div className="status-item">
              <span className="status-color past_due"></span>
              Em Atraso: {subscriptions.byStatus?.past_due || 0}
            </div>
            <div className="status-item">
              <span className="status-color canceled"></span>
              Canceladas: {subscriptions.byStatus?.canceled || 0}
            </div>
          </div>
        </div>

        <div className="summary-card">
          <h3>Assinaturas por Plano</h3>
          <div className="plan-breakdown">
            {subscriptions.byPlan?.map(plan => (
              <div key={plan.name} className="plan-item">
                <span>{plan.name}:</span>
                <span>{plan.count} usuários</span>
                <span>R$ {plan.revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="recent-subscriptions">
        <h3>Assinaturas Recentes</h3>
        <div className="subscription-list">
          {subscriptions.recent?.map(sub => (
            <div key={sub.id} className="subscription-item">
              <div className="user-info">
                <strong>{sub.userName}</strong>
                <span>{sub.userEmail}</span>
              </div>
              <div className="plan-info">
                <span className="plan-name">{sub.planName}</span>
                <span className={`status ${sub.status}`}>{sub.status}</span>
              </div>
              <div className="subscription-dates">
                <div>Criado: {new Date(sub.created).toLocaleDateString()}</div>
                <div>Expira: {new Date(sub.expires).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Componente da aba Notificações
function NotificationsTab({ notifications, onToggleJob }) {
  if (!notifications) return <div>Carregando notificações...</div>;

  return (
    <div className="notifications-tab">
      <div className="notifications-summary">
        <h3>📊 Estatísticas de Notificações</h3>
        <div className="notification-stats">
          <div className="stat-item">
            <span>Emails enviados hoje:</span>
            <strong>{notifications.stats?.emailsToday || 0}</strong>
          </div>
          <div className="stat-item">
            <span>SMS enviados hoje:</span>
            <strong>{notifications.stats?.smsToday || 0}</strong>
          </div>
          <div className="stat-item">
            <span>Taxa de sucesso:</span>
            <strong>{(notifications.stats?.successRate || 0).toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      <div className="cron-jobs">
        <h3>🕐 Jobs Automáticos</h3>
        <div className="jobs-list">
          {Object.entries(notifications.jobs || {}).map(([jobName, jobInfo]) => (
            <div key={jobName} className="job-item">
              <div className="job-info">
                <h4>{jobName}</h4>
                <p>{getJobDescription(jobName)}</p>
              </div>
              <div className="job-status">
                <span className={`status-badge ${jobInfo.running ? 'running' : 'stopped'}`}>
                  {jobInfo.running ? 'Ativo' : 'Parado'}
                </span>
                <button 
                  onClick={() => onToggleJob(jobName)}
                  className={`btn-toggle ${jobInfo.running ? 'stop' : 'start'}`}
                >
                  {jobInfo.running ? 'Parar' : 'Iniciar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="recent-notifications">
        <h3>📬 Notificações Recentes</h3>
        <div className="notification-list">
          {notifications.recent?.map(notification => (
            <div key={notification.id} className="notification-item">
              <div className="notification-icon">
                {notification.type === 'email' ? '📧' :
                 notification.type === 'sms' ? '📱' : '🔔'}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-recipient">{notification.recipient}</div>
                <div className="notification-time">
                  {new Date(notification.timestamp).toLocaleString()}
                </div>
              </div>
              <div className={`notification-status ${notification.status}`}>
                {notification.status === 'sent' ? '✅' :
                 notification.status === 'failed' ? '❌' : '⏳'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Função auxiliar para descrições dos jobs
function getJobDescription(jobName) {
  const descriptions = {
    overdueExpenseCheck: 'Verifica despesas vencidas diariamente às 09:00',
    monthlyReports: 'Gera relatórios mensais no primeiro dia do mês',
    goalReminders: 'Envia lembretes de metas semanalmente',
    subscriptionChecks: 'Verifica assinaturas expirando diariamente',
    investmentReports: 'Gera relatórios de investimentos mensalmente',
    backupReminders: 'Executa backup automático diariamente às 02:00'
  };
  return descriptions[jobName] || 'Descrição não disponível';
}

export default AdminDashboard; 