import React, { useEffect, useState, useCallback } from 'react';
import { CalculatorProvider, useCalculatorState, useCalculatorDispatch } from './context/CalculatorContext.jsx';
import { usePermissions } from './hooks/usePermissions.js';
import { useDarkMode } from './hooks/useDarkMode.js';
import { useCalculator } from './hooks/useCalculator.js';
import { useAnimatedNumber } from './hooks/useAnimatedNumber.js';
import { isFC, isSL, isSM } from './logic/role-groups.js';
import FcLayout from './components/layouts/FcLayout.jsx';
import SlLayout from './components/layouts/SlLayout.jsx';
import SmLayout from './components/layouts/SmLayout.jsx';
import K2Selector from './components/common/K2Selector.jsx';
import BreakdownRow from './components/common/BreakdownRow.jsx';
import FypSummaryCard from './components/common/FypSummaryCard.jsx';
import GrowthChart from './components/common/GrowthChart.jsx';
import { ExtraBonusList, ExtraBonusPhoneRows } from './components/common/ExtraBonusList.jsx';
import { formatCurrencyPhone } from './utils/format.js';
import './App.css';

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'agent', label: 'Đại lý',          icon: 'fa-user',   roles: ['FC','StarFC'] },
  { id: 'sl',    label: 'Quản lý (SL+)',   icon: 'fa-users',  roles: ['GSL','SSL','ESL'] },
  { id: 'sm',    label: 'Cấp cao (SM+)',   icon: 'fa-crown',  roles: ['SM','EM','ERM','IRM'] },
];

const ROLE_META = {
  FC:     { label: 'FC',     icon: 'fa-user',     sub: null },
  StarFC: { label: 'Star FC',icon: 'fa-star',     sub: null,   iconClass: 'text-yellow-400' },
  GSL:    { label: 'GSL',    letter: 'G',         sub: 'Trưởng nhóm' },
  SSL:    { label: 'SSL',    letter: 'S',         sub: 'Trưởng ban' },
  ESL:    { label: 'ESL',    letter: 'E',         sub: 'TB cấp cao' },
  SM:     { label: 'SM',     sub: null },
  EM:     { label: 'EM',     sub: null },
  ERM:    { label: 'ERM',    sub: null },
  IRM:    { label: 'IRM',    sub: null },
};

const BREAKDOWN_LABELS = {
  fyc:           'Hoa hồng cơ bản (FYC)',
  bonusMonth:    'Thưởng năng suất tháng',
  bonusQuarter:  'Thưởng quý (BQ/tháng)',
  starSupport:   'Hỗ trợ tài chính Ngôi sao',
  mgmtTraining:  'Phí đào tạo đội ngũ',
  mgmtDirect:    'Phí khai thác trực tiếp tháng',
  mgmtQuarter:   'Phí khai thác Quý (BQ/tháng)',
  mgmtIndirect:  'Phí khai thác gián tiếp L1/L2',
  mgmtIndirectSm:'Phí quản lý nhóm gián tiếp',
  partner:       'Thưởng Shinhan Partner',
  mdrt:          'Thưởng tiến độ MDRT (BQ)',
};

// ── Inner app (has access to context) ─────────────────────────────────────────
function AppInner() {
  const state    = useCalculatorState();
  const dispatch = useCalculatorDispatch();
  const perms    = usePermissions();
  const { isDark, toggle: toggleDark } = useDarkMode();

  const { visible: visibleTotal, full } = useCalculator();
  const { breakdown } = full;
  const animatedTotal = useAnimatedNumber(visibleTotal, 280);

  const [activeTab, setActiveTab]   = useState(null);
  const [chartOpen, setChartOpen]   = useState(false);
  const [hiddenOpen, setHiddenOpen] = useState(false);

  const dispatch1 = (key, value) => dispatch({ type: 'UPDATE_STATE', payload: { key, value } });

  // ── Initialise from URL params (one-time on mount) ─────────────────────────
  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);

    // Dark mode
    if (params.get('dark') === '1') {
      if (!isDark) toggleDark();
    }

    // Determine starting role (respects permissions)
    let targetRole = params.get('role');
    if (perms.allowedRoles.length > 0) {
      if (targetRole && !perms.allowedRoles.includes(targetRole)) {
        console.warn(`[Permissions] Role "${targetRole}" không được phép cho "${perms.userTitle}". Fallback.`);
        targetRole = perms.defaultRole;
      } else if (!targetRole) {
        targetRole = perms.defaultRole;
      }
    }

    // Find which tab that role belongs to
    const targetTab = TABS.find(t => t.roles.includes(targetRole));
    if (targetTab && perms.allowedTabs.includes(targetTab.id)) {
      setActiveTab(targetTab.id);
      dispatch1('role', targetRole);
    } else if (perms.allowedTabs.length > 0) {
      const firstTab = TABS.find(t => perms.allowedTabs.includes(t.id));
      if (firstTab) {
        setActiveTab(firstTab.id);
        dispatch1('role', perms.allowedRoles[0]);
      }
    } else {
      // No permissions → show all
      setActiveTab('agent');
      dispatch1('role', 'FC');
    }

    // Personal sales
    if (params.get('personal') === '1') {
      dispatch1('hasPersonalSales', true);
    }
  }, []);

  // ── Tab click ──────────────────────────────────────────────────────────────
  const handleTabClick = useCallback((tabId) => {
    setActiveTab(tabId);
    const tab = TABS.find(t => t.id === tabId);
    if (!tab) return;
    const allowedInTab = tab.roles.filter(r => perms.allowedRoles.length === 0 || perms.allowedRoles.includes(r));
    if (allowedInTab.length > 0) {
      dispatch({ type: 'UPDATE_STATE_BATCH', payload: { role: allowedInTab[0], hasPersonalSales: false } });
    }
  }, [dispatch, perms]);

  // ── Role button click ──────────────────────────────────────────────────────
  const handleRoleClick = useCallback((role) => {
    dispatch1('role', role);
    // syncSmTarget equivalent handled in SmLayout useEffect
  }, [dispatch]);

  // ── Determine which layout to show ────────────────────────────────────────
  const role = state.role;
  const layout = isFC(role) ? 'fc' : isSL(role) ? 'sl' : 'sm';
  const resultTitle = isFC(role)
    ? `TỔNG THU NHẬP ƯỚC TÍNH (${role})`
    : `TỔNG PHÍ DỊCH VỤ ƯỚC TÍNH (${role})`;

  // ── Visible tabs / roles (filtered by permissions) ────────────────────────
  const visibleTabs  = TABS.filter(t => perms.allowedRoles.length === 0 || perms.allowedTabs.includes(t.id));
  const isRoleVisible = (r) => perms.allowedRoles.length === 0 || perms.allowedRoles.includes(r);

  // ── Hidden keys accordion ─────────────────────────────────────────────────
  const hiddenCount = state.hiddenKeys.length;

  const restoreKey = (key) => dispatch({ type: 'DELETE_HIDDEN_KEY', payload: key });

  const hiddenRowData = state.hiddenKeys.map(key => {
    if (key.startsWith('extra_')) {
      const id = parseInt(key.split('_')[1]);
      const b  = state.extraBonuses.find(x => x.id === id);
      return b
        ? { key, label: b.name || 'Khoản thưởng khác',
            val: b.type === 'quarter' ? b.amountVND / 3_000_000 : b.amountVND / 1_000_000 }
        : null;
    }
    return { key, label: BREAKDOWN_LABELS[key] || key, val: breakdown[key] || 0 };
  }).filter(Boolean);

  // ── Perks ─────────────────────────────────────────────────────────────────
  const showPerks = isFC(role) || state.hasPersonalSales;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans antialiased min-h-screen transition-colors duration-300">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── HEADER ── */}
        <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <i className="fa-solid fa-calculator text-teal-600 dark:text-teal-400"></i>
              Shinhan Life 2026 Calculator
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Công cụ ước tính thu nhập &amp; phí dịch vụ Đại lý/Quản lý kinh doanh
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              id="dark-toggle"
              aria-label="Chuyển chế độ sáng/tối"
              onClick={toggleDark}
              className="flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm text-sm font-medium"
            >
              <i id="dm-icon-sun"  className={`fa-solid fa-sun text-base transition-all duration-300${isDark ? ' hidden' : ''}`}></i>
              <i id="dm-icon-moon" className={`fa-solid fa-moon text-base transition-all duration-300${isDark ? '' : ' hidden'}`}></i>
              <span id="dm-label" className="mode-label">{isDark ? 'Chế độ Tối' : 'Chế độ Sáng'}</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ══ LEFT COLUMN ══ */}
          <div className="w-full lg:col-span-7 space-y-6">

            {/* Card 1: Chọn Chức Danh */}
            <div className="card-base">
              <h2 className="card-title">
                <i className="fa-solid fa-user-tie text-teal-600 dark:text-teal-400"></i> Chọn Chức Danh
              </h2>

              {/* Tab Bar */}
              <div className="flex bg-slate-900/60 backdrop-blur-md border border-white/[0.05] p-1 rounded-2xl gap-1 mb-6" id="role-tabs">
                {visibleTabs.map(tab => (
                  <button
                    key={tab.id}
                    data-tab={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`role-tab flex-1 py-2 px-3 rounded-xl text-sm transition-all ${activeTab === tab.id ? 'active' : ''}`}
                  >
                    <i className={`fa-solid ${tab.icon} mr-1`}></i> {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: Agent */}
              {activeTab === 'agent' && (
                <div id="tab-panel-agent">
                  <div className="bg-slate-950/40 p-1.5 rounded-xl border border-white/[0.04] grid grid-cols-2 gap-1.5">
                    {TABS[0].roles.filter(isRoleVisible).map(r => {
                      const m = ROLE_META[r];
                      return (
                        <button
                          key={r} data-role={r}
                          onClick={() => handleRoleClick(r)}
                          className={`role-btn role-btn-base rounded-lg py-4 px-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-95 min-h-[72px] ${role === r ? 'active' : ''}`}
                        >
                          <i className={`fa-solid ${m.icon} text-xl ${m.iconClass || ''}`}></i>
                          <span className="font-medium text-sm">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab: SL+ */}
              {activeTab === 'sl' && (
                <div id="tab-panel-sl">
                  {/* Personal sales toggle */}
                  <label className="personal-sales-toggle-base flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl mb-4 cursor-pointer">
                    <div>
                      <div className="font-medium text-sm text-teal-900 dark:text-teal-200">Có phát sinh doanh số cá nhân trong tháng?</div>
                      <div className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">Nếu có, sẽ tính dồn thêm FYC + Thưởng cá nhân</div>
                    </div>
                    <div className="relative flex items-center ml-4 shrink-0">
                      <input
                        type="checkbox" id="has-personal-sales-sl" className="peer sr-only"
                        checked={state.hasPersonalSales}
                        onChange={e => dispatch1('hasPersonalSales', e.target.checked)}
                      />
                      <div className="toggle-track peer-checked:bg-teal-600 w-11 h-6 bg-slate-200 rounded-full relative"></div>
                    </div>
                  </label>
                  <div className="bg-slate-950/40 p-1.5 rounded-xl border border-white/[0.04] grid grid-cols-3 gap-1.5">
                    {TABS[1].roles.filter(isRoleVisible).map(r => {
                      const m = ROLE_META[r];
                      return (
                        <button
                          key={r} data-role={r}
                          onClick={() => handleRoleClick(r)}
                          className={`role-btn role-btn-base rounded-lg py-4 px-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-95 min-h-[72px] ${role === r ? 'active' : ''}`}
                        >
                          <span className="font-bold text-lg text-teal-700 dark:text-teal-400">{m.letter}</span>
                          <span className="font-medium text-sm">{m.label}</span>
                          {m.sub && <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">{m.sub}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab: SM+ */}
              {activeTab === 'sm' && (
                <div id="tab-panel-sm">
                  {/* Personal sales toggle */}
                  <label className="personal-sales-toggle-base flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl mb-4 cursor-pointer">
                    <div>
                      <div className="font-medium text-sm text-teal-900 dark:text-teal-200">Có phát sinh doanh số cá nhân trong tháng?</div>
                      <div className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">Nếu có, sẽ tính dồn thêm FYC + Thưởng cá nhân</div>
                    </div>
                    <div className="relative flex items-center ml-4 shrink-0">
                      <input
                        type="checkbox" id="has-personal-sales-sm" className="peer sr-only"
                        checked={state.hasPersonalSales}
                        onChange={e => dispatch1('hasPersonalSales', e.target.checked)}
                      />
                      <div className="toggle-track peer-checked:bg-teal-600 w-11 h-6 bg-slate-200 rounded-full relative"></div>
                    </div>
                  </label>
                  <div className="bg-slate-950/40 p-1.5 rounded-xl border border-white/[0.04] grid grid-cols-4 gap-1.5">
                    {TABS[2].roles.filter(isRoleVisible).map(r => {
                      const m = ROLE_META[r];
                      return (
                        <button
                          key={r} data-role={r}
                          onClick={() => handleRoleClick(r)}
                          className={`role-btn role-btn-base rounded-lg py-4 px-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-95 min-h-[72px] ${role === r ? 'active' : ''}`}
                        >
                          <span className="font-medium text-sm">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* K2 Selector — shared across all roles */}
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/[0.05]">
                <K2Selector />
              </div>
            </div>

            {/* Layout-specific cards (2 + 3/4) */}
            {layout === 'fc' && <FcLayout />}
            {layout === 'sl' && <SlLayout />}
            {layout === 'sm' && <SmLayout />}

            {/* Card 5: Danh Hiệu & Thưởng Thêm */}
            {showPerks && (
              <div className="card-base" id="perks-section">
                <h2 className="card-title">
                  <i className="fa-solid fa-gift text-teal-600 dark:text-teal-400"></i> Danh Hiệu &amp; Thưởng Thêm
                </h2>
                <div className="space-y-3">
                  {/* Shinhan Partner */}
                  <div className="perk-row-base flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-700/50 min-h-[64px]">
                    <div className="flex-1 pr-2">
                      <div className="font-medium text-sm text-slate-800 dark:text-slate-200">Shinhan Partner</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Thưởng thêm % trên FYC tháng</div>
                    </div>
                    <select
                      id="partner-level"
                      className="input-base min-w-[150px] w-auto"
                      value={state.partner}
                      onChange={e => dispatch1('partner', e.target.value)}
                    >
                      <option value="none">Không</option>
                      <option value="G">G-Partner (+10%)</option>
                      <option value="S">S-Partner (+15%)</option>
                      <option value="E">E-Partner (+20%)</option>
                    </select>
                  </div>
                  {/* MDRT */}
                  <label className="perk-row-base cursor-pointer flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-700/50 min-h-[64px]">
                    <div>
                      <div className="font-medium text-sm text-slate-800 dark:text-slate-200">Đạt mốc MDRT Quý</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Ước tính thưởng TB 5tr/tháng</div>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="checkbox" id="mdrt-check" className="peer sr-only"
                        checked={state.mdrt}
                        onChange={e => dispatch1('mdrt', e.target.checked)}
                      />
                      <div className="toggle-track peer-checked:bg-teal-600 w-11 h-6 bg-slate-200 rounded-full relative"></div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Card 6: Khoản Thưởng Khác */}
            <div className="card-base">
              <h2 className="card-title">
                <i className="fa-solid fa-circle-plus text-emerald-600 dark:text-emerald-400"></i> Khoản Thưởng Khác (Nếu có)
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                Áp dụng cho tất cả chức danh. Số tiền sẽ được cộng trực tiếp vào Tổng Thu Nhập.
              </p>
              <ExtraBonusList />
            </div>

          </div>{/* End Left Column */}

          {/* ══ RIGHT COLUMN (Phone Mockup) ══ */}
          <div className="w-full lg:col-span-5 lg:sticky lg:top-8">
            <div>
              <div
                id="phone-mockup"
                className="relative mx-auto max-w-[365px] w-full border-0 md:border-[10px] border-slate-950 dark:border-slate-700 rounded-none md:rounded-[50px] bg-slate-950 dark:bg-slate-800 shadow-none md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] ring-0 md:ring-1 ring-white/10 overflow-hidden transition-colors duration-300"
              >
                {/* Status Bar */}
                <div className="absolute top-0 left-0 right-0 pt-4 px-6 pb-2 h-12 justify-between items-center z-20 text-white text-xs hidden md:flex">
                  <div className="font-sans tracking-tight font-medium text-white/90">9:41</div>
                  <div className="space-x-1.5 flex items-center text-white/90">
                    <i className="fa-solid fa-signal"></i>
                    <i className="fa-solid fa-wifi"></i>
                    <i className="fa-solid fa-battery-three-quarters text-sm"></i>
                  </div>
                </div>
                {/* Dynamic Island */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 hidden md:flex items-center justify-between px-3">
                  <div className="w-1.5 h-1.5 bg-transparent"></div>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                </div>
                {/* Home Indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/25 rounded-full z-30 hidden md:block"></div>

                {/* Phone Screen */}
                <div
                  id="phone-screen"
                  className="phone-screen w-full h-[720px] md:h-[720px] overflow-y-auto scroll-smooth flex flex-col p-5 pt-14 pb-8 space-y-4 rounded-none md:rounded-[40px] bg-gradient-to-tr from-slate-950 via-teal-950 to-emerald-950 dark:from-slate-800 dark:via-teal-900 dark:to-emerald-900 relative transition-colors duration-300"
                >
                  {/* FYP Summary Card */}
                  <div id="fyp-summary-card" className="bg-white/[0.04] backdrop-blur-lg border border-white/[0.06] rounded-2xl p-4 shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] text-white">
                    <h3 className="text-teal-300/70 uppercase tracking-widest text-[10px] font-bold mb-3">
                      <i className="fa-solid fa-chart-column mr-1"></i> Tổng Hợp Doanh Số FYP
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <FypSummaryCard />
                    </div>
                  </div>

                  {/* Main Result Card */}
                  <div className="bg-white/[0.04] backdrop-blur-lg border border-white/[0.06] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] text-white">
                    <h3 id="result-title" className="text-teal-300/70 uppercase tracking-widest text-[10px] font-bold mb-2">
                      {resultTitle}
                    </h3>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span id="total-income" className="text-yellow-400 font-extrabold text-3xl tracking-tight transition-all duration-300">
                        {formatCurrencyPhone(animatedTotal)}
                      </span>
                      <span className="text-xl text-teal-200">VNĐ</span>
                    </div>
                    <div className="text-sm text-teal-400/80 mb-4">/ tháng</div>

                    {/* Breakdown rows */}
                    <div id="breakdown-rows" className="pt-2 text-sm space-y-0">
                      {Object.entries(BREAKDOWN_LABELS).map(([key, label]) => (
                        <BreakdownRow key={key} rowKey={key} label={label} val={breakdown[key] || 0} />
                      ))}
                      {/* Extra bonus phone rows */}
                      <ExtraBonusPhoneRows />

                      {/* Hidden accordion */}
                      {hiddenCount > 0 && (
                        <div id="hidden-breakdown-container" className="mt-4 pt-4 border-t border-white/[0.1]">
                          <button
                            id="toggle-hidden-breakdown"
                            className="w-full text-xs text-teal-400/80 mb-2 flex items-center justify-between p-2 rounded hover:bg-white/[0.05] transition-colors"
                            onClick={() => setHiddenOpen(o => !o)}
                          >
                            <span>
                              <i className="fa-solid fa-eye-slash mr-1"></i>
                              Các khoản đã ẩn (<span id="hidden-count">{hiddenCount}</span>)
                            </span>
                            <i className={`fa-solid fa-chevron-down transition-transform duration-200 ${hiddenOpen ? 'rotate-180' : ''}`} id="hidden-chevron"></i>
                          </button>
                          {hiddenOpen && (
                            <div id="hidden-rows-list" className="space-y-0">
                              {hiddenRowData.map(({ key, label, val }) => (
                                <div key={key} className="flex items-center gap-2 py-2 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors rounded px-2">
                                  <button
                                    className="eye-btn-restore shrink-0"
                                    data-key={key}
                                    title="Khôi phục khoản này"
                                    onClick={() => restoreKey(key)}
                                  >
                                    <i className="fa-regular fa-eye-slash text-teal-400/80 hover:text-teal-300 transition-colors"></i>
                                  </button>
                                  <span className="text-slate-400 text-xs flex-1 line-through decoration-white/20 truncate">{label}</span>
                                  <span className="text-slate-500 font-semibold text-xs shrink-0">{formatCurrencyPhone(val)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chart Toggle (mobile only) */}
                  <button
                    id="toggle-chart-btn"
                    className="w-full py-3 mt-4 mb-2 bg-white/5 border border-white/10 rounded-xl text-teal-300 text-sm font-semibold flex items-center justify-center gap-2 mt-auto shrink-0 z-10 relative lg:hidden hover:bg-white/10 transition-colors"
                    onClick={() => setChartOpen(o => !o)}
                  >
                    <i className="fa-solid fa-chart-line"></i> Xem biểu đồ Tăng Trưởng
                  </button>

                  {/* Chart Card */}
                  <div id="chart-card" className={`bg-white/[0.04] backdrop-blur-lg border border-white/[0.06] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] text-white mt-auto shrink-0 z-10 relative ${chartOpen ? 'block' : 'hidden lg:block'}`}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-medium text-teal-100 flex items-center gap-2 text-sm">
                        <i className="fa-solid fa-chart-area"></i> Tăng Trưởng
                      </h3>
                      <span className="text-[9px] text-teal-400 bg-teal-950/50 px-2 py-1 rounded uppercase tracking-wider font-semibold border border-teal-800/50">Theo FYP</span>
                    </div>
                    <div className="relative h-40 w-full">
                      <GrowthChart />
                    </div>
                  </div>

                </div>{/* End Phone Screen */}
              </div>
            </div>
          </div>{/* End Right Column */}

        </div>
      </main>
    </div>
  );
}

// ── Root export ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <CalculatorProvider>
      <AppInner />
    </CalculatorProvider>
  );
}
