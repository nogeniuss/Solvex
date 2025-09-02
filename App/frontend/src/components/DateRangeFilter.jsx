import React from 'react';
import './DateRangeFilter.css';

const DateRangeFilter = ({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}) => {
  return (
    <div className="date-range-filter">
      <div className="input-group">
        <label>De:</label>
        <input
          type="date"
          value={startDate || ''}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
      </div>
      <div className="input-group">
        <label>Até:</label>
        <input
          type="date"
          value={endDate || ''}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </div>
    </div>
  );
};

export default DateRangeFilter; 