import React, { useRef, useCallback } from 'react';
import { useCalculatorState, useCalculatorDispatch } from '../../context/CalculatorContext.jsx';
import { formatVND, formatCurrencyPhone } from '../../utils/format.js';

let bonusIdCounter = 0;

// ExtraBonusList: danh sách khoản thưởng tự do (left panel + phone rows)
export function ExtraBonusList() {
  const state = useCalculatorState();
  const dispatch = useCalculatorDispatch();

  const addBonus = () => {
    const newBonus = { id: ++bonusIdCounter, name: '', type: '', amountVND: 0 };
    dispatch({
      type: 'UPDATE_STATE',
      payload: { key: 'extraBonuses', value: [...state.extraBonuses, newBonus] }
    });
  };

  const updateBonus = (id, field, value) => {
    const updated = state.extraBonuses.map(b => b.id === id ? { ...b, [field]: value } : b);
    dispatch({ type: 'UPDATE_STATE', payload: { key: 'extraBonuses', value: updated } });
  };

  const deleteBonus = (id) => {
    const updated = state.extraBonuses.filter(b => b.id !== id);
    dispatch({ type: 'DELETE_HIDDEN_KEY', payload: 'extra_' + id });
    dispatch({ type: 'UPDATE_STATE', payload: { key: 'extraBonuses', value: updated } });
  };

  return (
    <div>
      <div id="extra-bonus-list" className="space-y-3">
        {state.extraBonuses.map(b => (
          <ExtraBonusRow
            key={b.id}
            bonus={b}
            onUpdate={(field, val) => updateBonus(b.id, field, val)}
            onDelete={() => deleteBonus(b.id)}
          />
        ))}
      </div>
      <button
        id="add-bonus-btn"
        onClick={addBonus}
        className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-teal-500/30 text-teal-400/70 hover:text-teal-400 hover:border-teal-500/60 hover:bg-teal-500/5 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
      >
        <i className="fa-solid fa-plus text-xs"></i>
        Thêm khoản thưởng
      </button>
    </div>
  );
}

function ExtraBonusRow({ bonus, onUpdate, onDelete }) {
  const amountInputRef = useRef(null);

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = parseInt(raw) || 0;
    e.target.value = num > 0 ? formatVND(num) : '';
    onUpdate('amountVND', num);
  };

  return (
    <div className="extra-bonus-row slide-in" data-id={bonus.id}>
      <input
        type="text"
        className="input-base text-sm py-2 px-3 min-h-[40px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-teal-500/30 w-full text-slate-900 dark:text-slate-100"
        placeholder="Tên khoản thưởng..."
        defaultValue={bonus.name}
        onChange={e => onUpdate('name', e.target.value)}
      />
      <input
        type="text"
        className="bonus-type-input input-base text-sm py-2 px-3 min-h-[40px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-teal-500/30 w-full text-slate-900 dark:text-slate-100"
        placeholder="Loại"
        defaultValue={bonus.type}
        onChange={e => onUpdate('type', e.target.value)}
      />
      <div className="relative">
        <input
          ref={amountInputRef}
          type="text"
          inputMode="numeric"
          className="bonus-amount-input vnd-input-base text-xs py-2 pl-3 pr-6 min-h-[40px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-teal-500/30 w-full text-slate-900 dark:text-slate-100"
          placeholder="Số tiền VNĐ"
          defaultValue={bonus.amountVND > 0 ? formatVND(bonus.amountVND) : ''}
          onChange={handleAmountChange}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₫</span>
      </div>
      <button
        className="bonus-delete-btn w-10 h-10 rounded-xl flex items-center justify-center text-red-400/50 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
        title="Xoá khoản thưởng này"
        onClick={onDelete}
      >
        <i className="fa-solid fa-trash text-sm"></i>
      </button>
    </div>
  );
}

// ExtraBonusPhoneRows: rows hiển thị trong màn phone
export function ExtraBonusPhoneRows() {
  const state = useCalculatorState();
  const dispatch = useCalculatorDispatch();

  return (
    <>
      {state.extraBonuses.map(b => {
        const monthly = b.amountVND / 1_000_000;
        if (monthly <= 0) return null;
        const key = 'extra_' + b.id;
        const isHidden = state.hiddenKeys.includes(key);
        if (isHidden) return null;

        const typeLabel = b.type ? ` - ${b.type}` : '';
        const nameText = b.name || 'Khoản thưởng';

        return (
          <div
            key={b.id}
            className="breakdown-row slide-in flex items-center gap-3 py-2.5 border-b border-white/[0.06] last:border-0"
            data-key={key}
          >
            <button
              className="eye-btn shrink-0"
              data-key={key}
              title="Ẩn/hiện khoản này"
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'TOGGLE_HIDDEN_KEY', payload: key });
              }}
            >
              <i className="fa-regular fa-eye text-teal-400/60 hover:text-teal-300 transition-colors"></i>
            </button>
            <span className="text-slate-300 flex-1 truncate text-sm">{nameText}{typeLabel}</span>
            <span className="breakdown-val text-yellow-400 font-semibold text-sm shrink-0">
              {formatCurrencyPhone(monthly)}
            </span>
          </div>
        );
      })}
    </>
  );
}
