import React, { useEffect } from 'react';
import { useCalculatorState, useCalculatorDispatch } from '../../context/CalculatorContext.jsx';
import VndInput from '../common/VndInput.jsx';
import { formatVND } from '../../utils/format.js';

const SM_MONTHS = [
  { label:'M1', value:'1' },{ label:'M2', value:'2' },{ label:'M3', value:'3' },
  { label:'M4-M12', value:'4-12' },{ label:'M13+', value:'13+' }
];

const SM_BASE_TARGETS = { SM: 3200000000, EM: 8000000000, ERM: 16000000000, IRM: 28000000000 };
const SM_MONTH_COEFS  = { '1': 0.04, '2': 0.05, '3': 0.06, '4-12': 0.0945 };

function calcSmTarget(role, monthMode) {
  const base  = SM_BASE_TARGETS[role] || 3200000000;
  const coef  = SM_MONTH_COEFS[monthMode] ?? 0.0833;
  return base * coef;
}

export default function SmLayout() {
  const state    = useCalculatorState();
  const dispatch = useCalculatorDispatch();
  const role     = state.role;

  const dispatch1 = (key, value) => dispatch({ type: 'UPDATE_STATE', payload: { key, value } });
  const dispatchBatch = patch => dispatch({ type: 'UPDATE_STATE_BATCH', payload: patch });

  // Auto-calc smTargetRevenue when role or monthMode changes (mirrors syncSmTarget() vanilla)
  useEffect(() => {
    const newTarget = calcSmTarget(role, state.monthMode);
    if (!state.smTargetModeUnlocked) {
      dispatchBatch({
        smTargetRevenue: newTarget,
        smActualRevenue: newTarget * (state.smTargetRatio / 100),
      });
    } else {
      dispatch1('smTargetRevenue', newTarget);
    }
  }, [role, state.monthMode]);

  // Sync monthMode on role change to SM+
  useEffect(() => {
    const validMonths = SM_MONTHS.map(m => m.value);
    if (!validMonths.includes(state.monthMode)) {
      dispatch1('monthMode', '1');
    }
  }, [role]);

  const showL1 = role !== 'SM';
  const showL2 = !['SM', 'EM'].includes(role);
  const showL3 = role === 'IRM';
  const showQIndirect = role !== 'SM';

  const targetFmt = formatVND(Math.round(state.smTargetRevenue));
  const actualFmt = formatVND(Math.round(state.smActualRevenue));

  return (
    <>
      {/* Card 2: Tháng Hoạt Động */}
      <div className="card-base">
        <h2 className="card-title">
          <i className="fa-regular fa-calendar-check text-teal-600 dark:text-teal-400"></i> Tháng Hoạt Động
        </h2>
        <div id="sm-month-btn-group" className="flex flex-wrap bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
          {SM_MONTHS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => dispatch1('monthMode', value)}
              className={`month-btn flex-1 py-3 px-3 min-h-[44px] rounded-md text-sm font-medium dark:text-slate-300 ${state.monthMode === value ? 'active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Card 4: Chỉ Số Nhóm SM+ */}
      <div className="card-base fade-in" id="team-section">
        <h2 className="card-title">
          <i className="fa-solid fa-crown text-teal-600 dark:text-teal-400"></i> Chỉ Số Nhóm ({role})
        </h2>

        {/* Chỉ Tiêu Doanh Số */}
        <div className="mb-4 p-4 bg-gradient-to-r from-teal-500/10 to-teal-600/5 rounded-xl border border-teal-300/40 dark:border-teal-600/30">
          <label className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 flex items-center gap-2 mb-3">
            <i className="fa-solid fa-bullseye"></i>
            Chỉ Tiêu Doanh Số Tháng
            <span className="text-[10px] bg-teal-500 text-white px-2 py-0.5 rounded-full font-bold">Tự động</span>
          </label>
          <div className="relative">
            <input
              type="text" id="sm-target-number" readOnly
              value={targetFmt}
              className="w-full pl-5 pr-14 py-4 text-2xl font-extrabold tracking-wide min-h-[64px] rounded-xl
                text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-800
                border-2 border-teal-400/50 dark:border-teal-500/40 focus:outline-none cursor-default"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-teal-500 dark:text-teal-400 font-bold text-lg">₫</span>
          </div>
        </div>

        {/* 3-col: Tỷ lệ | DS thực tế | Số lượt */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Tỷ lệ HT */}
          <div>
            <label className="input-label">Tỷ lệ HT (%)</label>
            <div className="relative">
              <input
                type="number" id="sm-target-ratio"
                value={state.smTargetRatio}
                readOnly={state.smTargetModeUnlocked}
                className={`input-base pr-8 font-bold text-teal-700 dark:text-teal-400
                  ${state.smTargetModeUnlocked ? '!bg-slate-200 dark:!bg-slate-900/40 cursor-not-allowed' : ''}`}
                onChange={e => {
                  if (state.smTargetModeUnlocked) return;
                  const ratio     = Number(e.target.value) || 0;
                  const newActual = state.smTargetRevenue * (ratio / 100);
                  dispatchBatch({ smTargetRatio: ratio, smActualRevenue: newActual });
                }}
              />
              <span className="absolute right-3 top-3.5 text-slate-400 text-xs">%</span>
            </div>
          </div>

          {/* DS Thực tế */}
          <div>
            <label className="input-label flex items-center justify-between">
              DS Thực tế
              <button
                id="sm-unlock-btn"
                className="text-slate-400 hover:text-teal-500 transition-colors"
                title="Mở/Khóa sửa tay"
                onClick={() => dispatch1('smTargetModeUnlocked', !state.smTargetModeUnlocked)}
              >
                <i id="sm-lock-icon" className={`fa-solid fa-${state.smTargetModeUnlocked ? 'unlock text-xs text-teal-500' : 'lock text-xs'}`}></i>
              </button>
            </label>
            <div className="relative">
              {state.smTargetModeUnlocked ? (
                <VndInput
                  id="sm-actual-number"
                  value={state.smActualRevenue}
                  onChange={num => {
                    const ratio = state.smTargetRevenue > 0
                      ? Math.round((num / state.smTargetRevenue) * 10000) / 100
                      : 0;
                    dispatchBatch({ smActualRevenue: num, smTargetRatio: ratio });
                  }}
                  className="vnd-input-base font-bold text-teal-700 dark:text-teal-400 text-xs pl-2 pr-6 w-full"
                />
              ) : (
                <input
                  type="text" id="sm-actual-number" readOnly
                  value={actualFmt}
                  className="vnd-input-base !bg-slate-200 dark:!bg-slate-900/40 cursor-not-allowed font-bold text-teal-700 dark:text-teal-400 text-xs pl-2 pr-6 w-full"
                />
              )}
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₫</span>
            </div>
          </div>

          {/* Số lượt HĐ */}
          <div>
            <label className="input-label">Số lượt HĐ</label>
            <div className="relative">
              <input
                type="number" id="active-headcount-sm" value={state.activeHeadcountSm} min="1" max="999"
                onChange={e => dispatch1('activeHeadcountSm', parseInt(e.target.value) || 1)}
                className="input-base pr-10 font-bold text-teal-700 dark:text-teal-400"
              />
              <span className="absolute right-3 top-3.5 text-slate-400 text-xs">lượt</span>
            </div>
          </div>
        </div>

        {/* FYC Rate SM+ */}
        <div className="mb-4">
          <label className="input-label">Tỷ lệ Hoa hồng FYC (%)</label>
          <div className="relative">
            <input
              type="number" id="fyc-rate-sm" value={state.fycRateSm}
              onChange={e => dispatch1('fycRateSm', Number(e.target.value) || 30)}
              className="input-base pr-8"
            />
            <span className="absolute right-4 top-3.5 text-slate-400">%</span>
          </div>
        </div>

        {/* FYP Nhóm TT */}
        <div className="mb-3">
          <label className="input-label">FYP Nhóm Trực Tiếp (VNĐ)</label>
          <div className="relative">
            <VndInput
              id="fyp-team-direct-sm"
              value={state.fypTeamDirectSm}
              onChange={v => dispatch1('fypTeamDirectSm', v)}
              placeholder="Ví dụ: 5.000.000.000"
              className="vnd-input-large w-full pl-4 pr-14 py-4 text-lg font-bold"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-medium">₫</span>
          </div>
        </div>

        {/* FYP GT layers (EM, ERM, IRM) */}
        {showL1 && (
          <div id="sm-indirect-fields" className="space-y-3 p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-800/30 mt-4">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Nhóm Gián Tiếp</p>
            <div className={`grid grid-cols-1 gap-3 ${showL2 ? 'sm:grid-cols-2' : ''}`}>
              {/* L1 */}
              <div id="sm-indirect-l1-col" className={!showL2 ? 'sm:col-span-2' : ''}>
                <label className="input-label">FYP GT Lớp 1 (VNĐ)</label>
                <div className="relative">
                  <VndInput
                    id="fyp-indirect-sm-l1"
                    value={state.fypIndirectSmL1}
                    onChange={v => dispatch1('fypIndirectSmL1', v)}
                    placeholder="Ví dụ: 2.000.000.000"
                    className="vnd-input-base w-full pl-3 pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₫</span>
                </div>
              </div>
              {/* L2 */}
              {showL2 && (
                <div id="sm-indirect-l2-col">
                  <label className="input-label">FYP GT Lớp 2 (VNĐ)</label>
                  <div className="relative">
                    <VndInput
                      id="fyp-indirect-sm-l2"
                      value={state.fypIndirectSmL2}
                      onChange={v => dispatch1('fypIndirectSmL2', v)}
                      placeholder="Ví dụ: 1.000.000.000"
                      className="vnd-input-base w-full pl-3 pr-10"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₫</span>
                  </div>
                </div>
              )}
              {/* L3 */}
              {showL3 && (
                <div id="sm-indirect-l3-col" className="sm:col-span-2">
                  <label className="input-label">FYP GT Lớp 3 (VNĐ)</label>
                  <div className="relative">
                    <VndInput
                      id="fyp-indirect-sm-l3"
                      value={state.fypIndirectSmL3}
                      onChange={v => dispatch1('fypIndirectSmL3', v)}
                      placeholder="Ví dụ: 500.000.000"
                      className="vnd-input-base w-full pl-3 pr-10"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₫</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SM+ Quarterly Bonus */}
        <div id="sm-quarter-section" className="mb-2 mt-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/[0.05]">
          <label className="personal-sales-toggle-base !mb-0 !bg-transparent !border-0 !p-0 cursor-pointer flex items-center justify-between">
            <div>
              <div className="font-medium text-sm text-slate-800 dark:text-slate-200">Tính Phí Khai Thác Quý (SM+)</div>
              <div className="text-xs text-slate-500 mt-0.5">Thưởng quý dựa trên FYP nhóm (Nhập để ước tính)</div>
            </div>
            <div className="relative flex items-center ml-4 shrink-0">
              <input
                type="checkbox" id="has-sm-quarter-bonus" className="peer sr-only"
                checked={state.hasSmQuarterBonus}
                onChange={e => dispatch1('hasSmQuarterBonus', e.target.checked)}
              />
              <div className="toggle-track peer-checked:bg-teal-600 w-11 h-6 bg-slate-200 rounded-full relative"></div>
            </div>
          </label>

          {state.hasSmQuarterBonus && (
            <div id="sm-quarter-fields" className="mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.05] space-y-3 slide-in">
              {/* FYP TT Quý */}
              <div>
                <label className="input-label">FYP Nhóm TT Quý (VNĐ)</label>
                <div className="relative">
                  <VndInput
                    id="fyp-team-quarter-sm-number"
                    value={state.fypTeamQuarterSm}
                    onChange={v => dispatch1('fypTeamQuarterSm', v)}
                    placeholder="Ví dụ: 1.000.000.000"
                    className="vnd-input-base w-full pl-3 pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₫</span>
                </div>
              </div>

              {/* GT Quý (EM, ERM, IRM) */}
              {showQIndirect && (
                <div id="sm-quarter-indirect-fields" className="slide-in">
                  <div className={`grid grid-cols-1 gap-3 ${showL2 ? 'sm:grid-cols-2' : ''}`}>
                    {/* QL1 */}
                    <div id="sm-quarter-l1-col" className={!showL2 ? 'sm:col-span-2' : ''}>
                      <label className="input-label">FYP Nhóm GT L1 Quý (VNĐ)</label>
                      <div className="relative">
                        <VndInput
                          id="fyp-quarter-indirect-sm-l1"
                          value={state.fypQuarterIndirectSmL1}
                          onChange={v => dispatch1('fypQuarterIndirectSmL1', v)}
                          placeholder="Ví dụ: 500.000.000"
                          className="vnd-input-base w-full pl-3 pr-10"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₫</span>
                      </div>
                    </div>
                    {/* QL2 */}
                    {showL2 && (
                      <div id="sm-quarter-l2-col">
                        <label className="input-label">FYP Nhóm GT L2 Quý (VNĐ)</label>
                        <div className="relative">
                          <VndInput
                            id="fyp-quarter-indirect-sm-l2"
                            value={state.fypQuarterIndirectSmL2}
                            onChange={v => dispatch1('fypQuarterIndirectSmL2', v)}
                            placeholder="Ví dụ: 300.000.000"
                            className="vnd-input-base w-full pl-3 pr-10"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₫</span>
                        </div>
                      </div>
                    )}
                    {/* QL3 */}
                    {showL3 && (
                      <div id="sm-quarter-l3-col" className="sm:col-span-2">
                        <label className="input-label">FYP Nhóm GT L3 Quý (VNĐ)</label>
                        <div className="relative">
                          <VndInput
                            id="fyp-quarter-indirect-sm-l3"
                            value={state.fypQuarterIndirectSmL3}
                            onChange={v => dispatch1('fypQuarterIndirectSmL3', v)}
                            placeholder="Ví dụ: 200.000.000"
                            className="vnd-input-base w-full pl-3 pr-10"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₫</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SM has personal sales → personal section */}
      {state.hasPersonalSales && (
        <SmPersonalSection state={state} dispatch1={dispatch1} />
      )}
    </>
  );
}

function SmPersonalSection({ state, dispatch1 }) {
  return (
    <div className="card-base" id="personal-section">
      <h2 className="card-title">
        <i className="fa-solid fa-chart-line text-teal-600 dark:text-teal-400"></i> Chỉ Số Cá Nhân
      </h2>
      <div>
        <label className="input-label">FYP Cá Nhân (VNĐ)</label>
        <div className="relative">
          <VndInput
            id="fyp-number-input-sm"
            value={state.fyp}
            onChange={v => dispatch1('fyp', v)}
            placeholder="Ví dụ: 30.000.000"
            className="vnd-input-large w-full pl-4 pr-16 py-4 text-lg font-bold"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-medium">₫</span>
        </div>
      </div>
    </div>
  );
}
