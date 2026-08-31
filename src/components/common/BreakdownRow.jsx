import React, { useCallback } from 'react';
import { useCalculatorState, useCalculatorDispatch } from '../../context/CalculatorContext.jsx';
import { formatCurrencyPhone } from '../../utils/format.js';

// BreakdownRow: 1 dòng trong bảng breakdown phone.
// Nhận key, label, val (triệu). Hiển thị eye icon, ẩn/hiện qua hiddenKeys.
export default function BreakdownRow({ rowKey, label, val, className = '' }) {
  const state = useCalculatorState();
  const dispatch = useCalculatorDispatch();

  const isHidden = state.hiddenKeys.includes(rowKey);

  const toggle = useCallback((e) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_HIDDEN_KEY', payload: rowKey });
  }, [rowKey, dispatch]);

  if (val <= 0.0001 && !isHidden) return null;

  return (
    <div
      className={`breakdown-row flex items-center gap-3 py-2.5 border-b border-white/[0.06] last:border-0 ${className}`}
      data-key={rowKey}
    >
      <button
        className="eye-btn shrink-0"
        onClick={toggle}
        title="Ẩn/hiện khoản này"
      >
        <i className={`fa-regular ${isHidden ? 'fa-eye-slash text-slate-500' : 'fa-eye text-teal-400/60 hover:text-teal-300'} transition-colors`}></i>
      </button>
      <span className="text-slate-300 flex-1 truncate text-sm">{label}</span>
      <span className={`breakdown-val text-yellow-400 font-semibold text-sm shrink-0 ${isHidden ? 'val-hidden' : ''}`}>
        {formatCurrencyPhone(val)}
      </span>
    </div>
  );
}
