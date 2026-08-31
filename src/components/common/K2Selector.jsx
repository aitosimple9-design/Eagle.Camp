import React, { useEffect, useMemo } from 'react';
import { useCalculatorState, useCalculatorDispatch } from '../../context/CalculatorContext.jsx';
import { K2_OPTIONS, K2_DEFAULT_BRACKET, getK2Coefficient } from '../../logic/calculator.js';
import { getGroup } from '../../logic/role-groups.js';

export default function K2Selector() {
  const state = useCalculatorState();
  const dispatch = useCalculatorDispatch();
  const role = state.role;
  const group = getGroup(role);
  
  const options = K2_OPTIONS[group];
  const curVal = state.k2Bracket;
  const hasVal = options.some(o => o.value === curVal);

  useEffect(() => {
    if (!hasVal) {
      dispatch({ 
        type: 'UPDATE_STATE', 
        payload: { key: 'k2Bracket', value: K2_DEFAULT_BRACKET[group] } 
      });
    }
  }, [hasVal, group, dispatch]);

  const subtitle = useMemo(() => {
    if (group === 'FC') return 'K2 cá nhân — ảnh hưởng đến Thưởng năng suất (FC)';
    if (group === 'SL') return 'K2 Toàn Nhóm — ảnh hưởng đến Phí đào tạo & Khai thác (SL+)';
    return 'K2 Toàn Nhóm — ảnh hưởng đến Phí đào tạo & Chăm sóc KH (SM+)';
  }, [group]);

  const coef = getK2Coefficient(state);
  let badgeColor = 'text-red-400';
  if (coef >= 1.0) badgeColor = 'text-teal-500';
  else if (coef >= 0.65) badgeColor = 'text-yellow-500';

  return (
    <div>
      <label className="block text-slate-400 text-sm font-medium mb-1">Hệ số K2</label>
      <select 
        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5 transition-colors"
        value={curVal}
        onChange={(e) => dispatch({ type: 'UPDATE_STATE', payload: { key: 'k2Bracket', value: e.target.value } })}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{subtitle}</p>
      <div className={`mt-2 text-right text-xs font-semibold ${badgeColor}`}>
        Hệ số K2 áp dụng: ×{coef.toFixed(2)}
      </div>
    </div>
  );
}
