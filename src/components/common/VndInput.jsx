import React, { useState, useEffect } from 'react';
import { formatVND } from '../../utils/format.js';

export default function VndInput({ value, onChange, placeholder = '', className = '', id }) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    setDisplayValue(value > 0 ? formatVND(value) : '');
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = parseInt(raw) || 0;
    setDisplayValue(num > 0 ? formatVND(num) : '');
    if (onChange) onChange(num);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      className={`outline-none bg-transparent ${className}`}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
    />
  );
}
