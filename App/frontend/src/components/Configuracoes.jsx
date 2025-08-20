import React, { useState, useEffect } from 'react';

const Configuracoes = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha_atual: '',
    nova_senha: '',
    confirmar_senha: ''
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    despesas_vencidas: true,
    metas_vencendo: true,
    conquistas: true,
    relatorio_mensal: true
  });
  const [exportSettings, setExportSettings] = useState({
    periodo: 'mes_atual'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setFormData({
          nome: data.user.nome || '',
          email: data.user.email || '',
          senha_atual: '',
          nova_senha: '',
          confirmar_senha: ''
        });
      }
    } catch (error) {
      setError('Erro ao carregar dados do usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.nova_senha && formData.nova_senha !== formData.confirmar_senha) {
      setError('As senhas não coincidem');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Perfil atualizado com sucesso!');
        setFormData({
          ...formData,
          senha_atual: '',
          nova_senha: '',
          confirmar_senha: ''
        });
      } else {
        setError(data.error || 'Erro ao atualizar perfil');
      }
    } catch (error) {
      setError('Erro ao atualizar perfil');
    }
  };

  const handleNotificationUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notifications)
      });

      if (response.ok) {
        setSuccess('Configurações de notificação atualizadas!');
      } else {
        setError('Erro ao atualizar notificações');
      }
    } catch (error) {
      setError('Erro ao atualizar notificações');
    }
  };

  const downloadCsv = async (tipo) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/export/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tipo, periodo: exportSettings.periodo })
      });

      if (!response.ok) {
        setError('Erro ao exportar CSV');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipo}-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess('Exportação realizada com sucesso!');
    } catch (error) {
      setError('Erro ao exportar CSV');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: '👤' },
    { id: 'notifications', label: 'Notificações', icon: '🔔' },
    { id: 'export', label: 'Exportação', icon: '📊' },
    { id: 'alerts', label: 'Alertas', icon: '⚠️' }
  ];

  if (loading) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando configurações...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="configuracoes-container">
          <div className="configuracoes-header">
            <h1>⚙️ Configurações</h1>
            <p>Gerencie suas preferências e configurações do sistema</p>
          </div>

          {error && (
            <div className="alert alert-danger">
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

          {/* Tabs */}
          <div className="config-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`config-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="config-content">
            {/* Perfil */}
            {activeTab === 'profile' && (
              <div className="config-section">
                <h2>Dados do Perfil</h2>
                <form onSubmit={handleProfileUpdate} className="config-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nome Completo</label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        className="form-control"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="form-control"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <h3>Alterar Senha</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Senha Atual</label>
                        <input
                          type="password"
                          value={formData.senha_atual}
                          onChange={(e) => setFormData({...formData, senha_atual: e.target.value})}
                          className="form-control"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Nova Senha</label>
                        <input
                          type="password"
                          value={formData.nova_senha}
                          onChange={(e) => setFormData({...formData, nova_senha: e.target.value})}
                          className="form-control"
                        />
                      </div>
                      <div className="form-group">
                        <label>Confirmar Nova Senha</label>
                        <input
                          type="password"
                          value={formData.confirmar_senha}
                          onChange={(e) => setFormData({...formData, confirmar_senha: e.target.value})}
                          className="form-control"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save"></i>
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Notificações */}
            {activeTab === 'notifications' && (
              <div className="config-section">
                <h2>Configurações de Notificação</h2>
                
                <div className="notification-channels">
                  <h3>Canais de Notificação</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={notifications.email}
                          onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                        />
                        <span>Email</span>
                      </label>
                    </div>
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={notifications.sms}
                          onChange={(e) => setNotifications({...notifications, sms: e.target.checked})}
                        />
                        <span>SMS</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="notification-types">
                  <h3>Tipos de Notificação</h3>
                  <div className="notification-grid">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.despesas_vencidas}
                        onChange={(e) => setNotifications({...notifications, despesas_vencidas: e.target.checked})}
                      />
                      <span>Despesas Vencidas</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.metas_vencendo}
                        onChange={(e) => setNotifications({...notifications, metas_vencendo: e.target.checked})}
                      />
                      <span>Metas Vencendo</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.conquistas}
                        onChange={(e) => setNotifications({...notifications, conquistas: e.target.checked})}
                      />
                      <span>Conquistas</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={notifications.relatorio_mensal}
                        onChange={(e) => setNotifications({...notifications, relatorio_mensal: e.target.checked})}
                      />
                      <span>Relatório Mensal</span>
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button onClick={handleNotificationUpdate} className="btn btn-primary">
                    <i className="fas fa-save"></i>
                    Salvar Notificações
                  </button>
                </div>
              </div>
            )}

            {/* Exportação */}
            {activeTab === 'export' && (
              <div className="config-section">
                <h2>Exportação de Dados (CSV)</h2>
                
                <div className="export-settings">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Período</label>
                      <select
                        value={exportSettings.periodo}
                        onChange={(e) => setExportSettings({...exportSettings, periodo: e.target.value})}
                        className="form-control"
                      >
                        <option value="mes_atual">Mês Atual</option>
                        <option value="trimestre_atual">Trimestre Atual</option>
                        <option value="ano_atual">Ano Atual</option>
                        <option value="todos">Todos os Dados</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="export-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <button onClick={() => downloadCsv('despesas')} className="btn btn-secondary">
                    <i className="fas fa-file-csv"></i>
                    Exportar Despesas (CSV)
                  </button>
                  <button onClick={() => downloadCsv('receitas')} className="btn btn-secondary">
                    <i className="fas fa-file-csv"></i>
                    Exportar Receitas (CSV)
                  </button>
                  <button onClick={() => downloadCsv('categorias')} className="btn btn-secondary">
                    <i className="fas fa-file-csv"></i>
                    Exportar Categorias (CSV)
                  </button>
                  <button onClick={() => downloadCsv('metas')} className="btn btn-secondary">
                    <i className="fas fa-file-csv"></i>
                    Exportar Metas (CSV)
                  </button>
                </div>
              </div>
            )}

            {/* Alertas */}
            {activeTab === 'alerts' && (
              <div className="config-section">
                <h2>Alertas e Notificações Personalizadas</h2>
                
                <div className="alerts-settings">
                  <div className="alert-item">
                    <h3>Limite de Despesas</h3>
                    <p>Receber alerta quando as despesas ultrapassarem um valor específico</p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Valor Limite (R$)</label>
                        <input
                          type="number"
                          placeholder="0,00"
                          className="form-control"
                        />
                      </div>
                      <div className="form-group">
                        <label>Período</label>
                        <select className="form-control">
                          <option value="diario">Diário</option>
                          <option value="semanal">Semanal</option>
                          <option value="mensal">Mensal</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="alert-item">
                    <h3>Metas em Risco</h3>
                    <p>Alertar quando uma meta estiver em risco de não ser atingida</p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Dias de Antecedência</label>
                        <input
                          type="number"
                          placeholder="7"
                          className="form-control"
                        />
                      </div>
                      <div className="form-group">
                        <label>Percentual de Progresso</label>
                        <input
                          type="number"
                          placeholder="80"
                          className="form-control"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="alert-item">
                    <h3>Saldo Baixo</h3>
                    <p>Alertar quando o saldo estiver abaixo de um valor mínimo</p>
                    <div className="form-group">
                      <label>Saldo Mínimo (R$)</label>
                      <input
                        type="number"
                        placeholder="0,00"
                        className="form-control"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn btn-primary">
                    <i className="fas fa-save"></i>
                    Salvar Alertas
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .configuracoes-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 0;
        }

        .configuracoes-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .configuracoes-header h1 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .configuracoes-header p {
          color: var(--text-secondary);
        }

        .config-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1rem;
        }

        .config-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
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

        .config-tab:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .config-tab.active {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .config-section {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .config-section h2 {
          color: var(--text-primary);
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }

        .config-form {
          max-width: 600px;
        }

        .form-section {
          margin: 2rem 0;
          padding: 1.5rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .form-section h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .notification-channels,
        .notification-types {
          margin-bottom: 2rem;
        }

        .notification-channels h3,
        .notification-types h3 {
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .notification-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          color: var(--text-primary);
        }

        .checkbox-label input[type="checkbox"] {
          width: 1.25rem;
          height: 1.25rem;
        }

        .export-settings {
          margin-bottom: 2rem;
        }

        .checkbox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .alerts-settings {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .alert-item {
          padding: 1.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }

        .alert-item h3 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .alert-item p {
          color: var(--text-secondary);
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
          .config-tabs {
            flex-direction: column;
          }
          
          .config-section {
            padding: 1.5rem;
          }
          
          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default Configuracoes; 