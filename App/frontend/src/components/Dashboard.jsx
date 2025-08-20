import React, { useState, useEffect } from 'react';
import ChartViewer from './ChartViewer';
import DateRangeFilter from './DateRangeFilter';
import PROFESSIONAL_COLORS from '../utils/colors';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [transacoes, setTransacoes] = useState([]);
  const [metas, setMetas] = useState([]);
  const [conquistas, setConquistas] = useState([]);
  const [filtros, setFiltros] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });

  useEffect(() => {
    fetchDashboardData();
  }, [filtros]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Buscar dados do dashboard
      const params = new URLSearchParams({
        mes: filtros.mes,
        ano: filtros.ano
      });

      const [statsResponse, transacoesResponse, metasResponse, conquistasResponse] = await Promise.all([
        fetch(`/api/dashboard/stats?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/dashboard/transacoes?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/metas?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/conquistas', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        // Verificar diferentes estruturas possíveis de resposta
        setStats(statsData.stats || statsData.data || statsData);
      }

      if (transacoesResponse.ok) {
        const transacoesData = await transacoesResponse.json();
        // Verificar diferentes estruturas possíveis de resposta
        setTransacoes(transacoesData.transacoes || transacoesData.data || transacoesData || []);
      }

      if (metasResponse.ok) {
        const metasData = await metasResponse.json();
        // Verificar diferentes estruturas possíveis de resposta
        setMetas(metasData.metas || metasData.data || metasData || []);
      }

      if (conquistasResponse.ok) {
        const conquistasData = await conquistasResponse.json();
        // Verificar diferentes estruturas possíveis de resposta
        setConquistas(conquistasData.conquistas || conquistasData.data || conquistasData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
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

  const getMonthName = (mes) => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes - 1];
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
    return 'Precisa Melhorar';
  };

  const getSaldoClass = (valor) => {
    const numValue = parseFloat(valor || 0);
    if (numValue > 0) return 'stat-success';
    if (numValue < 0) return 'stat-danger';
    return 'stat-warning';
  };

  const getSaldoIcon = (valor) => {
    const numValue = parseFloat(valor || 0);
    if (numValue > 0) return '📈';
    if (numValue < 0) return '📉';
    return '⚖️';
  };

  const safeValue = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '' || isNaN(value)) {
      return defaultValue;
    }
    const numValue = parseFloat(value);
    return isNaN(numValue) ? defaultValue : numValue;
  };

  const safeString = (value, defaultValue = 'N/A') => {
    if (!value || value === null || value === undefined) {
      return defaultValue;
    }
    return value;
  };

  // Preparar dados para gráfico de evolução financeira (linha)
  const prepareLineChartData = () => {
    if (!transacoes || transacoes.length === 0) {
      // Dados de exemplo para demonstração
      const hoje = new Date();
      const dadosExemplo = [];
      for (let i = 5; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mes = data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        dadosExemplo.push({
          name: mes,
          receitas: 0,
          despesas: 0,
          saldo: 0
        });
      }
      return dadosExemplo;
    }
    
    // Agrupar por mês
    const dadosPorMes = {};
    
    transacoes.forEach(transacao => {
      const valor = safeValue(parseFloat(transacao.valor) || 0);
      const tipo = safeString(transacao.tipo || transacao.type, 'despesa');
      const data = transacao.data || transacao.date || transacao.created_at;
      
      if (!data) return;
      
      const mesAno = new Date(data).toLocaleDateString('pt-BR', { 
        month: 'short', 
        year: 'numeric' 
      });
      
      if (!dadosPorMes[mesAno]) {
        dadosPorMes[mesAno] = { receitas: 0, despesas: 0 };
      }
      
      if (tipo === 'receita') {
        dadosPorMes[mesAno].receitas += Math.abs(valor);
      } else {
        dadosPorMes[mesAno].despesas += Math.abs(valor);
      }
    });
    
          const result = Object.entries(dadosPorMes).map(([mes, dados]) => {
        const receitas = safeValue(dados.receitas, 0);
        const despesas = safeValue(dados.despesas, 0);
        const saldo = receitas - despesas;
        return {
          name: mes,
          receitas: receitas,
          despesas: despesas,
          saldo: saldo
        };
      }).sort((a, b) => new Date('01 ' + a.name) - new Date('01 ' + b.name));
      
      console.log('Dados preparados para o gráfico:', result);
      return result;
  };

  // Preparar dados para gráfico de pizza (categorias de despesas)
  const preparePieChartData = () => {
    if (!transacoes || transacoes.length === 0) return [];
    
    const categorias = {};
    
    transacoes.forEach(transacao => {
      const valor = safeValue(Math.abs(parseFloat(transacao.valor) || 0));
      const tipo = safeString(transacao.tipo || transacao.type, 'despesa');
      const categoria = safeString(
        transacao.categoria || transacao.categoria_nome || transacao.category, 
        'Sem categoria'
      );
      
      // Incluir apenas despesas para análise de categorias
      if (tipo === 'despesa' && valor > 0) {
        categorias[categoria] = (categorias[categoria] || 0) + valor;
      }
    });
    
          const result = Object.entries(categorias)
        .map(([categoria, valor]) => ({
          name: categoria,
          value: safeValue(valor, 0)
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Limitar a 10 categorias principais
      
      console.log('Dados categorias preparados:', result);
      return result;
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="text-muted mt-md">Carregando dados financeiros...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="container">
        {/* Header Principal */}
        <div className="welcome-card fade-in">
          <div className="header-content">
            <div>
              <h1>💼 Dashboard Financeiro</h1>
              <p className="text-secondary">
                Acompanhe seus indicadores financeiros em tempo real. 
                Período: {getMonthName(filtros.mes)} de {filtros.ano}
              </p>
            </div>
            <div className="actions-content">
              <DateRangeFilter 
                filtros={filtros} 
                onFiltrosChange={setFiltros} 
              />
            </div>
          </div>
        </div>

        {/* Grid de Estatísticas Principais */}
        {stats && (
          <div className="dashboard-stats-grid fade-in">
            <div className={`dashboard-stat-card ${getSaldoClass(safeValue(stats.saldo_atual || stats.saldo || stats.totalSaldo))}`}>
              <div className="dashboard-stat-label">
                {getSaldoIcon(safeValue(stats.saldo_atual || stats.saldo || stats.totalSaldo))} Saldo Atual
              </div>
              <div className="dashboard-stat-value">
                {formatCurrency(safeValue(stats.saldo_atual || stats.saldo || stats.totalSaldo))}
              </div>
              <div className="dashboard-stat-subtitle">
                {safeValue(stats.saldo_atual || stats.saldo || stats.totalSaldo) > 0 ? 'Situação positiva' : 
                 safeValue(stats.saldo_atual || stats.saldo || stats.totalSaldo) < 0 ? 'Atenção: saldo negativo' : 'Saldo neutro'}
              </div>
            </div>

            <div className="dashboard-stat-card stat-success">
              <div className="dashboard-stat-label">
                💰 Total de Receitas
              </div>
              <div className="dashboard-stat-value text-success">
                {formatCurrency(safeValue(stats.total_receitas || stats.totalReceitas || stats.receitas))}
              </div>
              <div className="dashboard-stat-subtitle">
                {safeValue(stats.receitas_count || stats.receitasCount || stats.numReceitas)} transações no período
              </div>
            </div>

            <div className="dashboard-stat-card stat-danger">
              <div className="dashboard-stat-label">
                💸 Total de Despesas
              </div>
              <div className="dashboard-stat-value text-danger">
                {formatCurrency(safeValue(stats.total_despesas || stats.totalDespesas || stats.despesas))}
              </div>
              <div className="dashboard-stat-subtitle">
                {safeValue(stats.despesas_count || stats.despesasCount || stats.numDespesas)} transações no período
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="dashboard-stat-label">
                🎯 Score Financeiro
              </div>
              <div className="dashboard-stat-value" style={{ color: getScoreColor(safeValue(stats.score || stats.scoreSaudeFinanceira || stats.scoreFinanceiro)) }}>
                {safeValue(stats.score || stats.scoreSaudeFinanceira || stats.scoreFinanceiro)}
              </div>
              <div className="dashboard-stat-subtitle">
                {getScoreLevel(safeValue(stats.score || stats.scoreSaudeFinanceira || stats.scoreFinanceiro))}
              </div>
            </div>
          </div>
        )}

        {/* Seção de Gráficos */}
        <div className="charts-section fade-in">
          <div className="chart-container">
            <ChartViewer 
              data={prepareLineChartData()}
              chartTypes={['line', 'bar', 'area']}
              defaultType="line"
              title="📊 Análise Financeira"
              subtitle="Evolução das receitas e despesas"
              height={350}
              formatValue={(value) => {
                if (value === null || value === undefined || isNaN(value)) {
                  return 'R$ 0,00';
                }
                return formatCurrency(value);
              }}
              xAxisKey="name"
              yAxisKey="saldo"
              multiSeries={true}
              seriesKeys={['receitas', 'despesas', 'saldo']}
              colors={['#4CAF50', '#F44336', '#1F4E79']}
            />
          </div>

          <div className="chart-container">
            {preparePieChartData().length > 0 ? (
              <ChartViewer 
                data={preparePieChartData()}
                chartTypes={['pie', 'bar']}
                defaultType="pie"
                title="🥧 Distribuição por Categoria"
                subtitle="Principais categorias de despesas"
                height={350}
                formatValue={(value) => {
                  if (value === null || value === undefined || isNaN(value)) {
                    return 'R$ 0,00';
                  }
                  return formatCurrency(value);
                }}
                xAxisKey="name"
                yAxisKey="value"
              />
            ) : (
              <div className="chart-placeholder">
                <div className="chart-placeholder-icon">🥧</div>
                <h3>Distribuição por Categoria</h3>
                <p>Adicione despesas categorizadas para visualizar a distribuição</p>
              </div>
            )}
          </div>
        </div>

        {/* Seção de Metas e Conquistas */}
        <div className="row mt-xxl">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">🎯 Metas Financeiras</h3>
              </div>
              <div className="card-body">
                {metas && metas.length > 0 ? (
                  <div className="metas-preview">
                    {metas.slice(0, 3).map((meta, index) => {
                      const valorAtual = safeValue(meta.valor_atual || meta.valorAtual || meta.progresso);
                      const valorObjetivo = safeValue(meta.valor_objetivo || meta.valorObjetivo || meta.valor_meta || meta.valorMeta, 1);
                      const percentual = valorObjetivo > 0 ? (valorAtual / valorObjetivo) * 100 : 0;
                      
                      return (
                        <div key={meta.id || index} className="meta-item mb-md">
                          <div className="d-flex justify-content-between align-items-center mb-xs">
                            <span className="font-medium">{safeString(meta.nome || meta.titulo || meta.title)}</span>
                            <span className="text-primary font-bold">
                              {formatPercentage(percentual)}
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${Math.min(percentual, 100)}%` }}
                            ></div>
                          </div>
                          <div className="d-flex justify-content-between mt-xs">
                            <small className="text-muted">
                              {formatCurrency(valorAtual)}
                            </small>
                            <small className="text-muted">
                              {formatCurrency(valorObjetivo)}
                            </small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center p-xl">
                    <div className="text-muted">
                      <div className="mb-md" style={{ fontSize: '3rem' }}>🎯</div>
                      <p>Nenhuma meta criada ainda.</p>
                      <p className="text-sm">Defina objetivos para acompanhar seu progresso!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">🏆 Conquistas Recentes</h3>
              </div>
              <div className="card-body">
                {conquistas && conquistas.length > 0 ? (
                  <div className="conquistas-preview">
                    {conquistas.slice(0, 3).map((conquista, index) => (
                      <div key={conquista.id || index} className="conquista-item mb-md p-md" style={{
                        backgroundColor: 'var(--success-light)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--success-color)'
                      }}>
                        <div className="d-flex align-items-center gap-md">
                          <div style={{ fontSize: '2rem' }}>
                            {safeString(conquista.icone || conquista.icon, '🏆')}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-success mb-xs">
                              {safeString(conquista.titulo || conquista.title || conquista.nome)}
                            </h4>
                            <p className="text-sm text-muted">
                              {safeString(conquista.descricao || conquista.description)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-xl">
                    <div className="text-muted">
                      <div className="mb-md" style={{ fontSize: '3rem' }}>🏆</div>
                      <p>Nenhuma conquista ainda.</p>
                      <p className="text-sm">Continue usando o sistema para desbloquear conquistas!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transações Recentes */}
        {transacoes && transacoes.length > 0 && (
          <div className="card mt-xxl fade-in">
            <div className="card-header">
              <h3 className="card-title">📋 Últimas Transações</h3>
            </div>
            <div className="card-body p-0">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Data</th>
                      <th>Valor</th>
                      <th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transacoes.slice(0, 5).map((transacao, index) => {
                      const valor = safeValue(transacao.valor);
                      const tipo = safeString(transacao.tipo || transacao.type, 'despesa');
                      const data = transacao.data || transacao.date || transacao.created_at;
                      
                      return (
                        <tr key={transacao.id || index}>
                          <td>
                            <div className="font-medium">
                              {safeString(transacao.descricao || transacao.titulo || transacao.title || transacao.description)}
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-secondary">
                              {safeString(transacao.categoria || transacao.categoria_nome || transacao.category, 'Sem categoria')}
                            </span>
                          </td>
                          <td className="text-muted">
                            {data ? new Date(data).toLocaleDateString('pt-BR') : 'Data não informada'}
                          </td>
                          <td className={tipo === 'receita' ? 'text-success font-bold' : 'text-danger font-bold'}>
                            {formatCurrency(Math.abs(valor))}
                          </td>
                          <td>
                            <span className={`badge ${tipo === 'receita' ? 'badge-success' : 'badge-danger'}`}>
                              {tipo === 'receita' ? '📈 Receita' : '📉 Despesa'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 