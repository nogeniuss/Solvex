import React, { useState } from 'react';

const DateRangeFilter = ({ 
  onDateRangeChange, 
  initialStartDate = '', 
  initialEndDate = '',
  // Fallback para uso com filtros/setFiltros 
  filtros,
  setFiltros,
  title,
  subtitle
}) => {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isCustom, setIsCustom] = useState(false);

  // Função que funciona para ambos os tipos de uso
  const notifyDateChange = (dates) => {
    if (onDateRangeChange) {
      onDateRangeChange(dates);
    } else if (setFiltros && filtros) {
      setFiltros({
        ...filtros,
        data_inicio: dates.startDate,
        data_fim: dates.endDate
      });
    }
  };

  const handleQuickPeriod = (period) => {
    const today = new Date();
    let start, end;

    switch (period) {
      case 'today':
        start = end = today.toISOString().split('T')[0];
        break;
      case 'week':
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'custom':
        setIsCustom(true);
        return;
      default:
        return;
    }

    setStartDate(start);
    setEndDate(end);
    setIsCustom(false);
    notifyDateChange({ startDate: start, endDate: end });
  };

  const handleCustomDateChange = () => {
    if (startDate && endDate) {
      notifyDateChange({ startDate, endDate });
    }
  };

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    if (newStartDate && endDate) {
      notifyDateChange({ startDate: newStartDate, endDate });
    }
  };

  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);
    if (startDate && newEndDate) {
      notifyDateChange({ startDate, endDate: newEndDate });
    }
  };

  return (
    <div className="date-range-filter">
      {title && (
        <div className="filter-header">
          <h4>{title}</h4>
          {subtitle && <p>{subtitle}</p>}
        </div>
      )}
      
      <div className="quick-periods">
        <button
          onClick={() => handleQuickPeriod('today')}
          className="btn btn-sm btn-secondary"
        >
          Hoje
        </button>
        <button
          onClick={() => handleQuickPeriod('week')}
          className="btn btn-sm btn-secondary"
        >
          Última Semana
        </button>
        <button
          onClick={() => handleQuickPeriod('month')}
          className="btn btn-sm btn-secondary"
        >
          Este Mês
        </button>
        <button
          onClick={() => handleQuickPeriod('quarter')}
          className="btn btn-sm btn-secondary"
        >
          Este Trimestre
        </button>
        <button
          onClick={() => handleQuickPeriod('year')}
          className="btn btn-sm btn-secondary"
        >
          Este Ano
        </button>
        <button
          onClick={() => handleQuickPeriod('custom')}
          className={`btn btn-sm ${isCustom ? 'btn-primary' : 'btn-secondary'}`}
        >
          Personalizado
        </button>
      </div>

      {isCustom && (
        <div className="custom-date-inputs">
          <div className="form-row">
            <div className="form-group">
              <label>Data Inicial:</label>
              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className="form-control"
                max={endDate || undefined}
              />
            </div>
            <div className="form-group">
              <label>Data Final:</label>
              <input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                className="form-control"
                min={startDate || undefined}
              />
            </div>
          </div>
          <button
            onClick={handleCustomDateChange}
            className="btn btn-primary btn-sm"
            disabled={!startDate || !endDate}
          >
            Aplicar Filtro
          </button>
        </div>
      )}

      {(startDate || endDate) && (
        <div className="active-filter">
          <span className="filter-label">
            Filtro ativo: {startDate} até {endDate}
          </span>
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setIsCustom(false);
              notifyDateChange({ startDate: '', endDate: '' });
            }}
            className="btn btn-text btn-sm"
          >
            Limpar
          </button>
        </div>
      )}

      <style jsx>{`
        .date-range-filter {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .filter-header {
          margin-bottom: 15px;
        }

        .filter-header h4 {
          margin: 0 0 5px 0;
          color: #333;
        }

        .filter-header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .quick-periods {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 15px;
        }

        .quick-periods button {
          white-space: nowrap;
        }

        .custom-date-inputs {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin-top: 10px;
        }

        .form-row {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }

        .form-group {
          flex: 1;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #333;
        }

        .form-control {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .active-filter {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #e7f3ff;
          padding: 10px 15px;
          border-radius: 6px;
          margin-top: 15px;
          border-left: 4px solid #007bff;
        }

        .filter-label {
          color: #0056b3;
          font-weight: 500;
        }

        .btn-text {
          background: none;
          border: none;
          color: #007bff;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
        }

        .btn-text:hover {
          color: #0056b3;
        }

        @media (max-width: 768px) {
          .form-row {
            flex-direction: column;
          }
          
          .active-filter {
            flex-direction: column;
            gap: 10px;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
};

export default DateRangeFilter; 