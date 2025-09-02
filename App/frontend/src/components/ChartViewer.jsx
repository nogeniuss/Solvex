import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import './ChartViewer.css';

const ChartViewer = ({
  data,
  chartTypes = ['line', 'bar', 'area', 'pie'],
  defaultType = 'line',
  title,
  subtitle,
  height = 350,
  formatValue = (value) => value,
  xAxisKey = 'name',
  yAxisKey = 'value',
  multiSeries = false,
  seriesKeys = [],
  colors = ['#4a90e2', '#50c878', '#f44336', '#ffa726', '#9c27b0', '#ff9800']
}) => {
  const [chartType, setChartType] = useState(defaultType);
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showTooltip, setShowTooltip] = useState(true);

  const getChartTypeLabel = (type) => {
    const labels = {
      line: 'Linha',
      bar: 'Barra',
      area: 'Área',
      pie: 'Pizza'
    };
    return labels[type] || type;
  };

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />}
            <XAxis dataKey={xAxisKey} stroke="#808080" />
            <YAxis tickFormatter={formatValue} stroke="#808080" />
            {showTooltip && <Tooltip formatter={formatValue} contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }} />}
            {showLegend && <Legend />}
            {multiSeries ? (
              seriesKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey={yAxisKey}
                stroke={colors[0]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />}
            <XAxis dataKey={xAxisKey} stroke="#808080" />
            <YAxis tickFormatter={formatValue} stroke="#808080" />
            {showTooltip && <Tooltip formatter={formatValue} contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }} />}
            {showLegend && <Legend />}
            {multiSeries ? (
              seriesKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))
            ) : (
              <Bar
                dataKey={yAxisKey}
                fill={colors[0]}
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />}
            <XAxis dataKey={xAxisKey} stroke="#808080" />
            <YAxis tickFormatter={formatValue} stroke="#808080" />
            {showTooltip && <Tooltip formatter={formatValue} contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }} />}
            {showLegend && <Legend />}
            {multiSeries ? (
              seriesKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  stroke={colors[index % colors.length]}
                  fillOpacity={0.2}
                />
              ))
            ) : (
              <Area
                type="monotone"
                dataKey={yAxisKey}
                fill={colors[0]}
                stroke={colors[0]}
                fillOpacity={0.2}
              />
            )}
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={yAxisKey}
              nameKey={xAxisKey}
              cx="50%"
              cy="50%"
              outerRadius={height * 0.35}
              fill={colors[0]}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            {showTooltip && <Tooltip formatter={formatValue} contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }} />}
            {showLegend && <Legend />}
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="chart-viewer">
      <div className="chart-header">
        <div className="chart-title">
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="chart-controls">
          <div className="chart-type-buttons">
            {chartTypes.map((type) => (
              <button
                key={type}
                className={`chart-type-button ${chartType === type ? 'active' : ''}`}
                onClick={() => setChartType(type)}
              >
                {getChartTypeLabel(type)}
              </button>
            ))}
          </div>
          <div className="chart-options">
            <label>
              <input
                type="checkbox"
                checked={showLegend}
                onChange={(e) => setShowLegend(e.target.checked)}
              />
              Legenda
            </label>
            <label>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              Grade
            </label>
            <label>
              <input
                type="checkbox"
                checked={showTooltip}
                onChange={(e) => setShowTooltip(e.target.checked)}
              />
              Tooltip
            </label>
          </div>
        </div>
      </div>
      <div className="chart-container" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartViewer; 