import React, { useEffect } from 'react';
import { useCalculatorState, useCalculatorDispatch } from '../../context/CalculatorContext.jsx';
import VndInput from '../common/VndInput.jsx';
import Slider from '../common/Slider.jsx';
import { formatVND, formatMillionsToVND } from '../../utils/format.js';

// ── Helper: Month button group ────────────────────────────────────────────────
function MonthBtnGroup({ groupId, months, state, dispatch }) {
  return (
    <div id={groupId} className="flex flex-wrap bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
      {months.map(({ label, value }) => (
        <button
          key={value}
          data-month={value}
          onClick={() => dispatch({ type: 'UPDATE_STATE', payload: { key: 'monthMode', value } })}
          className={`month-btn flex-1 py-3 px-3 min-h-[44px] rounded-md text-sm font-medium dark:text-slate-300
            ${state.monthMode === value ? 'active' : ''}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── FC MONTH MODES ─────────────────────────────────────────────────────────────
const FC_MONTHS   = [{ label:'M1', value:'1' },{ label:'M2', value:'2' },{ label:'M3', value:'3' },{ label:'M4', value:'4' },{ label:'M5-M12', value:'5-12' },{ label:'M13+', value:'13+' }];
const STARFC_MONTHS = [{ label:'M1', value:'1' },{ label:'M2-M7', value:'2-7' },{ label:'M8-M13', value:'8-13' },{ label:'M14-M19', value:'14-19' },{ label:'M20+', value:'20+' }];

const STARFC_HINTS = {
  '1':     'M1: Bảng 1 (Số HĐ + FYP)',
  '2-7':   'M2-M7: Bảng 3 (FYP ngưỡng 10/20tr)',
  '8-13':  'M8-M13: Bảng 4 (FYP ngưỡng 20tr)',
  '14-19': 'M14-M19: Bảng 5 (FYP cá nhân + FYP ĐLBH giới thiệu)',
};

const AITOM_GRADES = ['S','A','B','C','D'];

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function FcLayout() {
  const state    = useCalculatorState();
  const dispatch = useCalculatorDispatch();
  const role     = state.role;
  const isStarFC = role === 'StarFC';

  // Sync monthMode khi switch giữa FC ↔ StarFC
  useEffect(() => {
    const validFC     = FC_MONTHS.map(m => m.value);
    const validStarFC = STARFC_MONTHS.map(m => m.value);
    if (isStarFC && !validStarFC.includes(state.monthMode)) {
      dispatch({ type: 'UPDATE_STATE', payload: { key: 'monthMode', value: '1' } });
    } else if (!isStarFC && !validFC.includes(state.monthMode)) {
      dispatch({ type: 'UPDATE_STATE', payload: { key: 'monthMode', value: '13+' } });
    }
  }, [role]);

  const dispatch1 = (key, value) => dispatch({ type: 'UPDATE_STATE', payload: { key, value } });

  return (
    <>
      {/* Card 2: Tháng Hoạt Động */}
      <div className="card-base">
        <h2 className="card-title">
          <i className="fa-regular fa-calendar-check text-teal-600 dark:text-teal-400"></i> Tháng Hoạt Động
        </h2>

        {/* FC month buttons */}
        {!isStarFC && (
          <MonthBtnGroup
            groupId="month-btn-group"
            months={FC_MONTHS}
            state={state}
            dispatch={dispatch}
          />
        )}

        {/* StarFC month buttons */}
        {isStarFC && (
          <>
            <MonthBtnGroup
              groupId="starfc-month-btn-group"
              months={STARFC_MONTHS}
              state={state}
              dispatch={dispatch}
            />
            {STARFC_HINTS[state.monthMode] && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                {STARFC_HINTS[state.monthMode]}
              </p>
            )}
          </>
        )}
      </div>

      {/* Card 3: Chỉ Số Cá Nhân */}
      <div className="card-base" id="personal-section">
        <h2 className="card-title">
          <i className="fa-solid fa-chart-line text-teal-600 dark:text-teal-400"></i> Chỉ Số Cá Nhân
        </h2>

        {/* FYP */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">FYP Cá Nhân</label>
            <div className="flex items-center gap-2">
              <span className="text-teal-700 dark:text-teal-400 font-bold text-sm mr-1">
                {formatMillionsToVND(state.fyp / 1_000_000)}
              </span>
              <button
                id="fyp-mode-toggle"
                className="mode-toggle-btn"
                onClick={() => dispatch1('fypInputMode', state.fypInputMode === 'slider' ? 'number' : 'slider')}
              >
                <i className={`fa-solid ${state.fypInputMode === 'slider' ? 'fa-sliders' : 'fa-keyboard'}`}></i>
                <span>{state.fypInputMode === 'slider' ? 'Thanh trượt' : 'Nhập số'}</span>
              </button>
            </div>
          </div>

          {/* Slider Mode */}
          {state.fypInputMode === 'slider' && (
            <div id="fyp-slider-block">
              <Slider
                id="fyp-slider"
                min={0} max={200000000} step={1000000}
                value={state.fyp}
                onChange={v => dispatch1('fyp', v)}
              />
              <div className="flex justify-between mt-3 gap-2">
                {[10,25,50,100].map(m => (
                  <button
                    key={m}
                    className="fyp-quick-btn quick-btn-base flex-1 py-2.5 rounded text-xs font-medium border min-h-[44px]"
                    onClick={() => dispatch1('fyp', m * 1_000_000)}
                  >
                    {m} tr
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Number Mode */}
          {state.fypInputMode === 'number' && (
            <div id="fyp-number-block">
              <div className="relative">
                <VndInput
                  id="fyp-number-input"
                  value={state.fyp}
                  onChange={v => dispatch1('fyp', v)}
                  placeholder="Ví dụ: 30.000.000"
                  className="vnd-input-large w-full pl-4 pr-16 py-4 text-lg font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-medium">₫</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">Nhập số nguyên, hệ thống tự định dạng.</p>
            </div>
          )}
        </div>

        {/* StarFC M1: Số Hợp Đồng */}
        {isStarFC && state.monthMode === '1' && (
          <div id="star-fc-contracts-container" className="mb-6 p-3 bg-teal-50 dark:bg-teal-950/20 rounded-xl border border-teal-200 dark:border-teal-800/30 slide-in">
            <label className="input-label">Số Hợp Đồng Tháng (M1)</label>
            <p className="text-xs text-teal-600 dark:text-teal-400 mb-2">Dùng xác định mức hỗ trợ tháng 1 chương trình Ngôi Sao.</p>
            <input
              type="number" id="star-fc-contracts" min="0" max="20"
              value={state.starFcContracts}
              onChange={e => dispatch1('starFcContracts', parseInt(e.target.value) || 0)}
              className="input-base"
            />
          </div>
        )}

        {/* StarFC M14-M19: FYP từ ĐLBH giới thiệu */}
        {isStarFC && state.monthMode === '14-19' && (
          <div id="star-fc-referral-fyp-container" className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-xl border border-yellow-200 dark:border-yellow-800/30 slide-in">
            <label className="input-label text-yellow-800 dark:text-yellow-300">FYP Từ ĐLBH Được Giới Thiệu (VNĐ)</label>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-2">Dùng xác định mức hỗ trợ giai đoạn M14–M19 (Bảng 5).</p>
            <div className="relative">
              <VndInput
                id="star-fc-referral-fyp"
                value={state.starFcReferralFyp}
                onChange={v => dispatch1('starFcReferralFyp', v)}
                placeholder="Ví dụ: 60.000.000"
                className="vnd-input-base w-full pl-4 pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₫</span>
            </div>
          </div>
        )}

        {/* Thưởng Quý (FC/StarFC) */}
        <div id="fc-quarter-section" className="mt-6 border-t border-slate-200 dark:border-white/10 pt-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-medium text-sm text-slate-800 dark:text-slate-200">Tính Thưởng Quý</div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox" id="has-quarter-bonus" className="sr-only peer"
                checked={state.hasQuarterBonus}
                onChange={e => dispatch1('hasQuarterBonus', e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer
                peer-checked:after:translate-x-full peer-checked:after:border-white
                after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300
                after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500">
              </div>
            </label>
          </div>

          {state.hasQuarterBonus && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-white/5 slide-in">
              <div>
                <label className="block text-xs text-slate-500 mb-1">FYP Quý Cá nhân (VNĐ)</label>
                <div className="relative">
                  <VndInput
                    id="fyp-quarter-number"
                    value={state.fypQuarter}
                    onChange={v => dispatch1('fypQuarter', v)}
                    placeholder="0"
                    className="vnd-input-base text-sm py-2 w-full pl-3 pr-6"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Số tháng HĐ</label>
                <select
                  id="quarter-active-months"
                  className="input-base text-sm py-2"
                  value={state.quarterActiveMonths}
                  onChange={e => dispatch1('quarterActiveMonths', parseInt(e.target.value))}
                >
                  <option value="3">3 tháng (120%)</option>
                  <option value="2">2 tháng (100%)</option>
                  <option value="1">1 tháng (80%)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* FYC Rate + AiTOM */}
        <div className="flex flex-col gap-4 mt-5">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tỷ lệ Hoa hồng (%)</label>
            <input
              type="number" id="fyc-rate" className="input-base" value={state.fycRate}
              onChange={e => dispatch1('fycRate', Number(e.target.value) || 0)}
            />
          </div>
          {/* AiTOM Grade */}
          <div id="aitom-container">
            <label className="input-label">AiTOM Grade</label>
            <div className="bg-slate-950/40 p-1.5 rounded-xl border border-white/[0.04] grid grid-cols-5 gap-1.5" id="aitom-btn-group">
              {AITOM_GRADES.map(g => (
                <button
                  key={g}
                  data-grade={g}
                  onClick={() => dispatch1('aitom', g)}
                  className={`aitom-btn py-2.5 min-h-[44px] rounded-lg text-sm font-bold transition-all duration-200 hover:scale-[1.05] active:scale-95 ${state.aitom === g ? 'active' : ''}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
