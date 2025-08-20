import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, ScatterChart, Scatter
} from 'recharts';
import PROFESSIONAL_COLORS from '../utils/colors';

const ChartViewer = ({ 
  data, 
  title, 
  subtitle, 
  chartTypes = ['bar', 'line', 'pie', 'area'], 
  defaultType = 'bar',
  height = 300,
  colors = PROFESSIONAL_COLORS,
  formatValue = (value) => value,
  xAxisKey = 'name',
  yAxisKey = 'value',
  yDomain = undefined,
  multiSeries = false,
  seriesKeys = []
}) => {
  const [activeChartType, setActiveChartType] = useState(defaultType);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const formatSeriesName = (key) => {
    const nameMap = {
      'receitas': 'Receitas',
      'despesas': 'Despesas', 
      'saldo': 'Saldo',
      'value': 'Valor',
      'total': 'Total'
    };
    return nameMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  const chartTypeLabels = {
    bar: 'Barras',
    line: 'Linha',
    pie: 'Pizza',
    area: 'Área',
    radar: 'Radar',
    scatter: 'Dispersão'
  };

  const renderChart = (fullscreenHeight = height) => {
    if (!data || data.length === 0) {
      return (
        <div className="chart-placeholder">
          <div className="chart-placeholder-icon">📊</div>
          <p>Nenhum dado disponível para exibir</p>
        </div>
      );
    }

    const commonProps = {
      data,
      height: fullscreenHeight
    };

    switch (activeChartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={fullscreenHeight}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis domain={yDomain || ['auto', 'auto']} tickFormatter={formatValue} />
              <Tooltip 
                formatter={(value, name) => {
                  const safeVal = (value === null || value === undefined || isNaN(value)) ? 0 : value;
                  return [formatValue(safeVal), name];
                }}
              />
              <Legend />
              {multiSeries && seriesKeys.length > 0 ? (
                seriesKeys.map((key, index) => (
                  <Bar 
                    key={key} 
                    dataKey={key} 
                    fill={colors[index % colors.length]} 
                                         barSize={24}
                     name={formatSeriesName(key)}
                  />
                ))
              ) : (
                <Bar dataKey={yAxisKey} fill={colors[0]} barSize={32} />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={fullscreenHeight}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis domain={yDomain || ['auto', 'auto']} tickFormatter={formatValue} />
              <Tooltip 
                formatter={(value, name) => {
                  const safeVal = (value === null || value === undefined || isNaN(value)) ? 0 : value;
                  return [formatValue(safeVal), name];
                }}
              />
              <Legend />
              {multiSeries && seriesKeys.length > 0 ? (
                seriesKeys.map((key, index) => (
                  <Line 
                    key={key}
                    type="monotone" 
                    dataKey={key} 
                    stroke={colors[index % colors.length]} 
                                         strokeWidth={2}
                     name={formatSeriesName(key)}
                  />
                ))
              ) : (
                <Line type="monotone" dataKey={yAxisKey} stroke={colors[0]} strokeWidth={2} />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={fullscreenHeight}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={fullscreenHeight / 3}
                fill="#8884d8"
                dataKey={yAxisKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => {
                  const safeVal = (value === null || value === undefined || isNaN(value)) ? 0 : value;
                  return [formatValue(safeVal), name];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={fullscreenHeight}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis domain={yDomain || ['auto', 'auto']} tickFormatter={formatValue} />
              <Tooltip 
                formatter={(value, name) => {
                  const safeVal = (value === null || value === undefined || isNaN(value)) ? 0 : value;
                  return [formatValue(safeVal), name];
                }}
              />
              <Legend />
              {multiSeries && seriesKeys.length > 0 ? (
                seriesKeys.map((key, index) => (
                  <Area 
                    key={key}
                    type="monotone" 
                    dataKey={key} 
                    stroke={colors[index % colors.length]} 
                    fill={colors[index % colors.length]} 
                                         fillOpacity={0.3}
                     name={formatSeriesName(key)}
                  />
                ))
              ) : (
                <Area type="monotone" dataKey={yAxisKey} stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={fullscreenHeight}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey={xAxisKey} />
              <PolarRadiusAxis />
              <Radar name={title} dataKey={yAxisKey} stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} />
              <Tooltip 
                formatter={(value, name) => {
                  const safeVal = (value === null || value === undefined || isNaN(value)) ? 0 : value;
                  return [formatValue(safeVal), name];
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={fullscreenHeight}>
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis domain={yDomain || ['auto', 'auto']} tickFormatter={formatValue} />
              <Tooltip 
                formatter={(value, name) => {
                  const safeVal = (value === null || value === undefined || isNaN(value)) ? 0 : value;
                  return [formatValue(safeVal), name];
                }}
              />
              <Legend />
              <Scatter dataKey={yAxisKey} fill={colors[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="chart-placeholder">
            <div className="chart-placeholder-icon">❌</div>
            <p>Tipo de gráfico não suportado</p>
          </div>
        );
    }
  };

  const openFullscreen = () => {
    setIsFullscreen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    document.body.style.overflow = 'auto';
  };

  const selectId = `chart-type-${(title || 'grafico').toString().replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <>
      <div className="chart-container">
        <div className="chart-header">
          <div>
            <h3 className="chart-title">{title}</h3>
            {subtitle && <p className="chart-subtitle">{subtitle}</p>}
          </div>
          <div className="chart-controls chart-controls-right">
            <div className="chart-type-selector">
              <label htmlFor={selectId} className="sr-only">Tipo de gráfico</label>
              <select
                id={selectId}
                className="chart-type-select"
                value={activeChartType}
                onChange={(e) => setActiveChartType(e.target.value)}
              >
                {chartTypes.map((type) => (
                  <option key={type} value={type}>
                    {chartTypeLabels[type] || type}
                  </option>
                ))}
              </select>
            </div>
            {/* Botão de tela cheia */}
            <button
              className="chart-fullscreen-btn"
              onClick={openFullscreen}
              title="Abrir em tela cheia"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="chart-content">
          {renderChart()}
        </div>
      </div>

      {/* Modal de tela cheia */}
      {isFullscreen && (
        <div className={`fullscreen-overlay ${isFullscreen ? 'active' : ''}`} onClick={closeFullscreen}>
          <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <div className="fullscreen-header">
              <div>
                <h3 className="fullscreen-title">{title}</h3>
                {subtitle && <p className="fullscreen-subtitle">{subtitle}</p>}
              </div>
              <button className="fullscreen-close" onClick={closeFullscreen}>
                ✕
              </button>
            </div>
            <div className="fullscreen-body">
              <div className="chart-type-selector" style={{ marginBottom: '1rem' }}>
                <select
                  className="chart-type-select"
                  value={activeChartType}
                  onChange={(e) => setActiveChartType(e.target.value)}
                >
                  {chartTypes.map((type) => (
                    <option key={type} value={type}>
                      {chartTypeLabels[type] || type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fullscreen-chart">
                {renderChart(600)}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChartViewer; 