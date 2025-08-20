import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Conquistas = () => {
  const [loading, setLoading] = useState(true);
  const [conquistas, setConquistas] = useState([]);
  const [progresso, setProgresso] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConquistas();
  }, []);

  const fetchConquistas = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      
      const [conquistasResponse, progressoResponse] = await Promise.all([
        fetch('/api/conquistas', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/conquistas/progresso', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (conquistasResponse.ok) {
        const data = await conquistasResponse.json();
        setConquistas(data.conquistas || []);
      } else {
        const errorData = await conquistasResponse.json();
        setError(errorData.error || 'Erro ao carregar conquistas');
      }

      if (progressoResponse.ok) {
        const data = await progressoResponse.json();
        setProgresso(data.progresso || {});
      } else {
        const errorData = await progressoResponse.json();
        console.error('Erro ao carregar progresso:', errorData.error);
      }
    } catch (error) {
      console.error('Erro ao buscar conquistas:', error);
      setError('Erro de conexão ao carregar conquistas');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getNivelColor = (nivel) => {
    const cores = {
      'Iniciante': 'var(--info-color)',
      'Iniciante Avançado': 'var(--primary-color)',
      'Intermediário': 'var(--warning-color)',
      'Especialista': 'var(--success-color)',
      'Mestre Financeiro': 'var(--danger-color)'
    };
    return cores[nivel] || 'var(--text-secondary)';
  };

  const getNivelIcon = (nivel) => {
    const icones = {
      'Iniciante': '🌱',
      'Iniciante Avançado': '📚',
      'Intermediário': '🎯',
      'Especialista': '🏆',
      'Mestre Financeiro': '👑'
    };
    return icones[nivel] || '⭐';
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando conquistas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="container">
        <div className="welcome-card">
          <h2>Conquistas e Progresso</h2>
          <p>Celebre suas conquistas financeiras e acompanhe seu desenvolvimento!</p>
        </div>

        {/* Alertas */}
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {/* Progresso Geral */}
        {progresso && (
          <div className="welcome-card">
            <div className="row">
              <div className="col-md-4">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                    {getNivelIcon(progresso.nivel)}
                  </div>
                  <h3 style={{ 
                    color: getNivelColor(progresso.nivel),
                    marginBottom: '0.5rem'
                  }}>
                    {progresso.nivel}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    {progresso.pontos_totais} pontos
                  </p>
                </div>
              </div>
              
              <div className="col-md-4">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ 
                    fontSize: '3rem', 
                    fontWeight: 'bold',
                    color: 'var(--primary-color)',
                    marginBottom: '0.5rem'
                  }}>
                    {progresso.conquistas_obtidas}/{progresso.total_conquistas}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    Conquistas Desbloqueadas
                  </p>
                </div>
              </div>
              
              <div className="col-md-4">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ 
                    fontSize: '3rem', 
                    fontWeight: 'bold',
                    color: 'var(--success-color)',
                    marginBottom: '0.5rem'
                  }}>
                    {progresso.percentual}%
                  </div>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                    Progresso Geral
                  </p>
                </div>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Progresso Geral</span>
                <span>{progresso.percentual}%</span>
              </div>
              <div style={{
                width: '100%',
                height: '20px',
                backgroundColor: 'var(--border-color)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progresso.percentual}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary-color), var(--success-color))',
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Gráfico de Conquistas */}
        {conquistas.length > 0 && (
          <div className="welcome-card">
            <h3>Distribuição de Pontos por Conquista</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conquistas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="titulo" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => `${value} pontos`} />
                <Bar dataKey="pontos" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Lista de Conquistas */}
        <div className="welcome-card">
          <h3>Suas Conquistas</h3>
          {conquistas.length > 0 ? (
            <div className="conquistas-grid">
              {conquistas.map((conquista) => (
                <div key={conquista.id} className="conquista-card">
                  <div className="conquista-header">
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                      {conquista.icone}
                    </div>
                    <h4>{conquista.titulo}</h4>
                  </div>
                  
                  <div className="conquista-content">
                    <p className="conquista-descricao">{conquista.descricao}</p>
                    
                    <div className="conquista-info">
                      <div className="conquista-pontos">
                        <span className="badge" style={{ 
                          backgroundColor: 'var(--primary-color)', 
                          color: 'white',
                          fontSize: '0.875rem'
                        }}>
                          {conquista.pontos} pontos
                        </span>
                      </div>
                      
                      <div className="conquista-data">
                        <small style={{ color: 'var(--text-secondary)' }}>
                          Conquistada em {formatDate(conquista.data_conquista)}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
              <h4>Nenhuma conquista ainda</h4>
              <p>Continue usando o sistema para desbloquear suas primeiras conquistas!</p>
            </div>
          )}
        </div>

        {/* Próximas Conquistas */}
        <div className="col-md-12">
          <div className="welcome-card">
          <h3>Próximas Conquistas</h3>
          <div className="row">
            <div className="col-md-4">
              <div className="proxima-conquista-card">
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📅</div>
                <h5>Usuário Consistente</h5>
                <p>Use o sistema 4 semanas seguidas</p>
                <div className="conquista-progresso">
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--border-color)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '60%',
                      height: '100%',
                      backgroundColor: 'var(--primary-color)'
                    }} />
                  </div>
                  <small style={{ color: 'var(--text-secondary)' }}>60% completo</small>
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="proxima-conquista-card">
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎯</div>
                <h5>Conquistador de Metas</h5>
                <p>Bata 3 metas de gastos seguidas</p>
                <div className="conquista-progresso">
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--border-color)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '33%',
                      height: '100%',
                      backgroundColor: 'var(--warning-color)'
                    }} />
                  </div>
                  <small style={{ color: 'var(--text-secondary)' }}>1 de 3 metas</small>
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="proxima-conquista-card">
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💰</div>
                <h5>Economista</h5>
                <p>Economize R$500 este mês</p>
                <div className="conquista-progresso">
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--border-color)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: '25%',
                      height: '100%',
                      backgroundColor: 'var(--danger-color)'
                    }} />
                  </div>
                  <small style={{ color: 'var(--text-secondary)' }}>R$125 de R$500</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dicas para Conquistas */}
        <div className="col-md-12">
          <div className="welcome-card">
          <h3>Dicas para Desbloquear Conquistas</h3>
          <div className="row">
            <div className="col-md-6">
              <div className="dica-card">
                <h5>📈 Use o Sistema Regularmente</h5>
                <p>Registre suas transações diariamente para manter consistência e desbloquear a conquista de uso regular.</p>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="dica-card">
                <h5>🎯 Defina Metas Realistas</h5>
                <p>Crie metas alcançáveis e acompanhe seu progresso para conquistar o título de "Conquistador de Metas".</p>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="dica-card">
                <h5>🏷️ Categorize Suas Transações</h5>
                <p>Organize suas receitas e despesas por categoria para desbloquear a conquista "Organizado".</p>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="dica-card">
                <h5>📊 Monitore sua Saúde Financeira</h5>
                <p>Mantenha um score financeiro alto para conquistar o título de "Saúde Financeira".</p>
              </div>
            </div>
          </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Conquistas; 