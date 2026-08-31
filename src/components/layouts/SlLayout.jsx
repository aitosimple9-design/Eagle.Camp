import React, { useEffect } from 'react';
import { useCalculatorState, useCalculatorDispatch } from '../../context/CalculatorContext.jsx';
import VndInput from '../common/VndInput.jsx';
import Slider from '../common/Slider.jsx';
import { formatVND } from '../../utils/format.js';

const GSL_MONTHS = [{ label:'M1 - M9', value:'1-9' },{ label:'M10 - M11', value:'10-11' },{ label:'M12+', value:'12+' }];
const SSL_MONTHS = [{ label:'M1 - M11', value:'1-11' },{ label:'M12', value:'12' },{ label:'M13+', value:'13+' }];
const ESL_MONTHS = [{ label:'M1 - M11', value:'1-11' },{ label:'M12 - M15', value:'12-15' },{ label:'M16+', value:'16+' }];

const ROLE_MONTHS = { GSL: GSL_MONTHS, SSL: SSL_MONTHS, ESL: ESL_MONTHS };
const ROLE_MONTH_DEFAULTS = { GSL: '1-9', SSL: '1-11', ESL: '1-11' };

function MonthBtnGroup({ months, monthMode, onSelect }) {
  return (
    <div className="flex flex-wrap bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
      {months.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className={`month-btn flex-1 py-3 px-3 min-h-[44px] rounded-md text-sm font-medium dark:text-slate-300 ${monthMode === value ? 'active' : ''}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function SlLayout() {
  const state    = useCalculatorState();
  const dispatch = useCalculatorDispatch();
  const role     = state.role;

  const dispatch1 = (key, value) => dispatch({ type: 'UPDATE_STATE', payload: { key, value } });

  const months = ROLE_MONTHS[role] || GSL_MONTHS;

  // Sync monthMode khi switch role trong SL
  useEffect(() => {
    const validMonths = (ROLE_MONTHS[role] || []).map(m => m.value);
    if (!validMonths.includes(state.monthMode)) {
      dispatch1('monthMode', ROLE_MONTH_DEFAULTS[role] || '1-9');
    }
  }, [role]);

  const showHeadcount = state.slAppointmentType !== 'promotion';
  const showL1 = role === 'SSL' || role === 'ESL';
  const showL2 = role === 'ESL';

  return (
    <>
      {/* Card 2: Tháng Hoạt Động */}
      <div className="card-base">
        <h2 className="card-title">
          <i className="fa-regular fa-calendar-check text-teal-600 dark:text-teal-400"></i> Tháng Hoạt Động
        </h2>
        <MonthBtnGroup months={months} monthMode={state.monthMode} onSelect={v => dispatch1('monthMode', v)} />
      </div>

      {/* Card 4: Chỉ Số Nhóm / Ban */}
      <div className="card-base fade-in" id="team-section">
        <h2 className="card-title">
          <i className="fa-solid fa-users text-teal-600 dark:text-teal-400"></i> Chỉ Số Nhóm / Ban
        </h2>

        {/* SL Appointment type */}
        <div id="sl-appointment-row" className="mb-4 flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/[0.05]">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Loại Bổ Nhiệm</label>
            <div className="text-xs text-slate-500">Chỉ áp dụng Phí Đào tạo cho Tuyển ngang</div>
          </div>
          <div className="flex bg-slate-200 dark:bg-slate-900 p-1 rounded-lg shrink-0">
            {[{label:'Tuyển ngang', value:'lateral'},{label:'Thăng cấp', value:'promotion'}].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => dispatch1('slAppointmentType', value)}
                className={`appointment-btn px-3 py-1.5 rounded-md text-xs font-semibold transition-colors
                  ${state.slAppointmentType === value
                    ? 'active bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* FYP Nhóm TT + Số lượt */}
        <div id="sl-team-direct-section" className="mb-5">
          <div className={`grid gap-3 mb-3 ${showHeadcount ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* FYP TT */}
            <div className={showHeadcount ? 'col-span-2 sm:col-span-1' : 'col-span-full'}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">FYP Nhóm Trực Tiếp</label>
                <div className="flex items-center gap-2">
                  <span className="text-teal-700 dark:text-teal-400 font-bold text-xs">
                    {Number(state.fycTeamDirect).toFixed(1)} tr
                  </span>
                  <button
                    id="team-direct-mode-toggle"
                    className="mode-toggle-btn"
                    onClick={() => dispatch1('teamDirectInputMode', state.teamDirectInputMode === 'slider' ? 'number' : 'slider')}
                  >
                    <i className={`fa-solid ${state.teamDirectInputMode === 'slider' ? 'fa-sliders' : 'fa-keyboard'}`}></i>
                    <span>{state.teamDirectInputMode === 'slider' ? 'Thanh trượt' : 'Nhập số'}</span>
                  </button>
                </div>
              </div>
              {state.teamDirectInputMode === 'slider' ? (
                <div id="team-direct-slider-block">
                  <input
                    type="range" id="fyc-team-direct" min="0" max="500" step="5"
                    value={state.fycTeamDirect}
                    onChange={e => dispatch1('fycTeamDirect', Number(e.target.value))}
                    className="range-input w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between mt-1 text-xs text-slate-400 dark:text-slate-500">
                    <span>0 tr</span><span>500 tr</span>
                  </div>
                </div>
              ) : (
                <div id="team-direct-number-block" className="relative">
                  <VndInput
                    id="fyc-team-direct-number"
                    value={state.fycTeamDirect * 1_000_000}
                    onChange={num => dispatch1('fycTeamDirect', num / 1_000_000)}
                    placeholder="Ví dụ: 100.000.000"
                    className="vnd-input-large w-full pl-4 pr-14 py-4 text-lg font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-medium">₫</span>
                </div>
              )}
            </div>

            {/* Số lượt */}
            {showHeadcount && (
              <div id="active-headcount-row" className="col-span-2 sm:col-span-1 flex flex-col justify-end">
                <label className="input-label">Số lượt Hoạt Động</label>
                <div className="relative">
                  <input
                    type="number" id="active-headcount" value={state.activeHeadcount} min="1" max="99"
                    onChange={e => dispatch1('activeHeadcount', parseInt(e.target.value) || 1)}
                    className="input-base pr-10 font-bold text-teal-700 dark:text-teal-400"
                  />
                  <span className="absolute right-3 top-3.5 text-slate-400 text-xs">lượt</span>
                </div>
              </div>
            )}
          </div>

          {/* FYC Rate SL */}
          <div className="mb-3">
            <label className="input-label">Tỷ lệ Hoa hồng FYC (%)</label>
            <div className="relative">
              <input
                type="number" id="fyc-rate-sl" value={state.fycRateSl}
                onChange={e => dispatch1('fycRateSl', Number(e.target.value) || 30)}
                className="input-base pr-8"
              />
              <span className="absolute right-4 top-3.5 text-slate-400">%</span>
            </div>
          </div>
        </div>

        {/* SL Indirect fields (SSL, ESL) */}
        {(showL1 || showL2) && (
          <div className="flex flex-col sm:flex-row gap-4 mb-5 bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/30">
            {showL1 && (
              <div id="indirect-l1-row" className="flex-1">
                <label className="input-label">FYP Gián Tiếp Lớp 1 (VNĐ)</label>
                <div className="relative">
                  <VndInput
                    id="fyc-team-indirect-l1"
                    value={state.fycTeamIndirectL1 * 1_000_000}
                    onChange={num => dispatch1('fycTeamIndirectL1', num / 1_000_000)}
                    placeholder="Ví dụ: 50.000.000"
                    className="vnd-input-large w-full pl-4 pr-14 py-4 text-lg font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-medium">₫</span>
                </div>
              </div>
            )}
            {showL2 && (
              <div id="indirect-l2-row" className="flex-1">
                <label className="input-label">FYP Gián Tiếp Lớp 2 (VNĐ)</label>
                <div className="relative">
                  <VndInput
                    id="fyc-team-indirect-l2"
                    value={state.fycTeamIndirectL2 * 1_000_000}
                    onChange={num => dispatch1('fycTeamIndirectL2', num / 1_000_000)}
                    placeholder="Ví dụ: 30.000.000"
                    className="vnd-input-large w-full pl-4 pr-14 py-4 text-lg font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-medium">₫</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SL Quarterly Bonus */}
        <div id="sl-quarter-section" className="mb-5 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/[0.05]">
          <label className="personal-sales-toggle-base !mb-0 !bg-transparent !border-0 !p-0 cursor-pointer flex items-center justify-between">
            <div>
              <div className="font-medium text-sm text-slate-800 dark:text-slate-200">Tính Phí Khai Thác Quý</div>
              <div className="text-xs text-slate-500 mt-0.5">Tính phí khai thác dựa trên FYP nhóm quý</div>
            </div>
            <div className="relative flex items-center ml-4 shrink-0">
              <input
                type="checkbox" id="has-sl-quarter-bonus" className="peer sr-only"
                checked={state.hasSlQuarterBonus}
                onChange={e => dispatch1('hasSlQuarterBonus', e.target.checked)}
              />
              <div className="toggle-track peer-checked:bg-teal-600 w-11 h-6 bg-slate-200 rounded-full relative"></div>
            </div>
          </label>

          {state.hasSlQuarterBonus && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.05] grid grid-cols-2 gap-4 slide-in">
              {/* FYP TT Quý — col-span logic: GSL col-span-2; SSL col-span-1; ESL col-span-2 (but ESL shows all) */}
              <div id="sl-quarter-direct-col" className={role === 'SSL' ? 'col-span-1' : 'col-span-2'}>
                <label className="input-label">FYP Nhóm TT Quý (VNĐ)</label>
                <div className="relative">
                  <VndInput
                    id="fyp-team-quarter-number"
                    value={state.fypTeamQuarter}
                    onChange={v => dispatch1('fypTeamQuarter', v)}
                    placeholder="Ví dụ: 300.000.000"
                    className="vnd-input-base w-full pl-3 pr-14"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₫</span>
                </div>
              </div>
              {showL1 && (
                <div id="fyc-team-indirect-l1-quarter-col">
                  <label className="input-label">FYP GT L1 Quý (VNĐ)</label>
                  <div className="relative">
                    <VndInput
                      id="fyc-team-indirect-l1-quarter"
                      value={state.fycTeamIndirectL1Quarter}
                      onChange={v => dispatch1('fycTeamIndirectL1Quarter', v)}
                      placeholder="Ví dụ: 50.000.000"
                      className="vnd-input-base w-full pl-3 pr-14"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₫</span>
                  </div>
                </div>
              )}
              {showL2 && (
                <div id="fyc-team-indirect-l2-quarter-col">
                  <label className="input-label">FYP GT L2 Quý (VNĐ)</label>
                  <div className="relative">
                    <VndInput
                      id="fyc-team-indirect-l2-quarter"
                      value={state.fycTeamIndirectL2Quarter}
                      onChange={v => dispatch1('fycTeamIndirectL2Quarter', v)}
                      placeholder="Ví dụ: 30.000.000"
                      className="vnd-input-base w-full pl-3 pr-14"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₫</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SL has personal sales → render FcLayout's personal section */}
      {state.hasPersonalSales && (
        <SlPersonalSection state={state} dispatch1={dispatch1} />
      )}
    </>
  );
}

// Personal section shared when SL has personal sales
function SlPersonalSection({ state, dispatch1 }) {
  return (
    <div className="card-base" id="personal-section">
      <h2 className="card-title">
        <i className="fa-solid fa-chart-line text-teal-600 dark:text-teal-400"></i> Chỉ Số Cá Nhân
      </h2>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">FYP Cá Nhân</label>
          <span className="text-teal-700 dark:text-teal-400 font-bold text-sm">
            {(state.fyp / 1_000_000).toFixed(1)} tr
          </span>
        </div>
        <div className="relative">
          <VndInput
            id="fyp-number-input-sl"
            value={state.fyp}
            onChange={v => dispatch1('fyp', v)}
            placeholder="Ví dụ: 30.000.000"
            className="vnd-input-large w-full pl-4 pr-16 py-4 text-lg font-bold"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-medium">₫</span>
        </div>
      </div>
      {/* Quarter bonus for SL personal */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-700 dark:text-slate-300">Tính Thưởng Quý cá nhân</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox" className="sr-only peer"
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
        <div className="mt-3 grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-white/5 slide-in">
          <div>
            <label className="block text-xs text-slate-500 mb-1">FYP Quý Cá nhân (VNĐ)</label>
            <div className="relative">
              <VndInput
                id="fyp-quarter-number-sl"
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
  );
}
