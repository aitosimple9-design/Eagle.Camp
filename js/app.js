// ============================================================
// APP.JS — UI Controller
// Import: state.js (state management) + calculator.js (pure logic)
// Không chứa bất kỳ công thức tính toán nào.
// ============================================================
import {
    getState,
    updateState,
    updateStateBatch,
    onStateChange,
} from './state.js';

import {
    getK2Coefficient,
    calculateIncome,
    calculateVisibleTotal,
    K2_OPTIONS,
    K2_DEFAULT_BRACKET,
} from './calculator.js';

// ============================================================
// FORMATTERS
// ============================================================
function formatVND(amount) {
    if (!amount || amount === 0) return '0';
    return Math.round(amount).toLocaleString('vi-VN');
}

function parseVND(str) {
    if (typeof str === 'number') return str;
    return parseInt(String(str).replace(/\./g, '').replace(/\s/g, '')) || 0;
}

function formatMillionsToVND(millions) {
    const raw = Math.round(millions * 1_000_000);
    return formatVND(raw) + ' ₫';
}

// Expose globally cho chart-config.js tooltip callback
window.formatCurrencyPhone = formatCurrencyPhone;
function formatCurrencyPhone(valInMillions) {
    if (!valInMillions || valInMillions === 0) return '0';
    const raw = Math.round(Number(valInMillions) * 1_000_000);
    return formatVND(raw);
}

function roundMil(val) {
    return Math.round(val * 1_000_000) / 1_000_000;
}

// ============================================================
// LIVE FORMAT VND INPUT
// ============================================================
function liveFormatVNDInput(el, onValue) {
    if (!el) return;
    el.addEventListener('input', (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        const num = parseInt(raw) || 0;
        const formatted = num > 0 ? formatVND(num) : '';
        e.target.value = formatted;
        try {
            const len = formatted.length;
            e.target.setSelectionRange(len, len);
        } catch (_) {}
        if (onValue) onValue(num);
    });
}

// ============================================================
// HELPERS
// ============================================================
function fypInMillions() { return getState().fyp / 1_000_000; }

// Theo dõi nhóm K2 đã render để tránh render lại HTML liên tục gây mất focus dropdown
let lastRenderedK2Group = null;

function buildK2Options() {
    const state = getState();
    const el = document.getElementById('k2-rate');
    if (!el) return;
    const role   = state.role;
    const isFC   = ['FC', 'StarFC'].includes(role);
    const isSL   = ['GSL', 'SSL', 'ESL'].includes(role);
    const group  = isFC ? 'FC' : isSL ? 'SL' : 'SM';
    const opts   = K2_OPTIONS[group];
    const curVal = state.k2Bracket;
    const hasVal = opts.some(o => o.value === curVal);

    // Reset bracket nếu không hợp lệ với group mới
    if (!hasVal) {
        updateState('k2Bracket', K2_DEFAULT_BRACKET[group]);
    }

    // Chỉ render lại innerHTML nếu group thay đổi
    if (lastRenderedK2Group !== group) {
        el.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
        lastRenderedK2Group = group;
    }

    if (el.value !== state.k2Bracket) {
        el.value = state.k2Bracket;
    }

    const sub = document.getElementById('k2-subtitle');
    if (sub) {
        if (isFC)      sub.textContent = 'K2 cá nhân — ảnh hưởng đến Thưởng năng suất (FC)';
        else if (isSL) sub.textContent = 'K2 Toàn Nhóm — ảnh hưởng đến Phí đào tạo & Khai thác (SL+)';
        else           sub.textContent = 'K2 Toàn Nhóm — ảnh hưởng đến Phí đào tạo & Chăm sóc KH (SM+)';
    }
}

// ============================================================
// SYNC SM TARGET (UI side-effect từ role/month change)
// ============================================================
function syncSmTarget() {
    const state = getState();
    const role = state.role;
    if (!['SM', 'EM', 'ERM', 'IRM'].includes(role)) return;

    const baseTarget = { SM: 3200000000, EM: 8000000000, ERM: 16000000000, IRM: 28000000000 }[role];
    let monthCoef = 0;
    if      (state.monthMode === '1')    monthCoef = 0.04;
    else if (state.monthMode === '2')    monthCoef = 0.05;
    else if (state.monthMode === '3')    monthCoef = 0.06;
    else if (state.monthMode === '4-12') monthCoef = 0.0945;
    else monthCoef = 0.0833;

    const newTarget = baseTarget * monthCoef;
    // Dùng updateStateBatch để chỉ notify 1 lần
    if (!state.smTargetModeUnlocked) {
        updateStateBatch({
            smTargetRevenue: newTarget,
            smActualRevenue: newTarget * (state.smTargetRatio / 100),
        });
        const actualEl = document.getElementById('sm-actual-number');
        if (actualEl) actualEl.value = formatVND(newTarget * (state.smTargetRatio / 100));
    } else {
        updateStateBatch({ smTargetRevenue: newTarget });
    }

    const el = document.getElementById('sm-target-number');
    if (el) el.value = formatVND(newTarget);
}

// ============================================================
// FYP SYNC
// ============================================================
function syncFypDisplay() {
    const state = getState();
    const fypEl = document.getElementById('fyp-val-display');
    if (fypEl) fypEl.innerText = formatMillionsToVND(fypInMillions());
    const sliderEl = document.getElementById('fyp-slider');
    if (sliderEl) sliderEl.value = state.fyp;
    const numEl = document.getElementById('fyp-number-input');
    if (numEl && document.activeElement !== numEl) {
        numEl.value = state.fyp > 0 ? formatVND(state.fyp) : '';
    }
}

// ============================================================
// DARK MODE
// ============================================================
function applyDarkMode(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('darkMode', isDark ? '1' : '0');
    document.getElementById('dm-icon-sun').classList.toggle('hidden', isDark);
    document.getElementById('dm-icon-moon').classList.toggle('hidden', !isDark);
    document.getElementById('dm-label').innerText = isDark ? 'Chế độ Tối' : 'Chế độ Sáng';
}

// ============================================================
// ANIMATION
// ============================================================
let _animFrame = null;
let _currentDisplayed = 0;

function animateNumber(elId, targetMil) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (_animFrame) cancelAnimationFrame(_animFrame);

    const start    = _currentDisplayed;
    const end      = targetMil;
    const duration = 280;
    const startTs  = performance.now();

    function step(ts) {
        const elapsed = ts - startTs;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = start + (end - start) * eased;
        _currentDisplayed = current;
        el.innerText = formatCurrencyPhone(current);
        if (t < 1) {
            _animFrame = requestAnimationFrame(step);
        } else {
            _currentDisplayed = end;
            el.innerText = formatCurrencyPhone(end);
        }
    }
    _animFrame = requestAnimationFrame(step);
}

// ============================================================
// CHART UPDATE
// ============================================================
function updateChart() {
    if (typeof window.myChart === 'undefined' || !window.myChart) return;
    const state = getState();
    const points = [10, 25, 45, 70, 100];
    window.myChart.data.datasets[0].data = points.map(p => calculateIncome(state, p).total);
    window.myChart.update();
}

// ============================================================
// EXTRA BONUS PHONE ROWS
// ============================================================
function renderExtraBonusPhoneRows() {
    const state = getState();
    const container = document.getElementById('extra-bonus-phone-rows');
    if (!container) return;
    container.innerHTML = '';

    state.extraBonuses.forEach(b => {
        const monthly = b.type === 'quarter' ? b.amountVND / 3_000_000 : b.amountVND / 1_000_000;
        if (monthly <= 0) return;
        if (state.hiddenKeys.has('extra_' + b.id)) return;

        const typeLabel = b.type === 'quarter' ? ' (Quý÷3)' : '';
        const nameText  = b.name || 'Khoản thưởng';

        const row = document.createElement('div');
        row.className = 'breakdown-row slide-in';
        row.dataset.key = 'extra_' + b.id;
        row.innerHTML = `
            <button class="eye-btn" data-key="extra_${b.id}" title="Ẩn/hiện khoản này">
                <i class="fa-regular fa-eye text-teal-400/60 hover:text-teal-300 transition-colors"></i>
            </button>
            <span class="text-slate-300 flex-1 truncate">${nameText}${typeLabel}</span>
            <span class="breakdown-val text-yellow-400 font-semibold">${formatCurrencyPhone(monthly)}</span>
        `;
        row.querySelector('.eye-btn').addEventListener('click', handleEyeToggle);
        container.appendChild(row);
    });
}

// ============================================================
// EYE TOGGLE — giữ nguyên 100% logic & markup
// ============================================================
function handleEyeToggle(e) {
    e.stopPropagation();
    const state = getState();
    const key = e.currentTarget.dataset.key;
    if (state.hiddenKeys.has(key)) state.hiddenKeys.delete(key);
    else state.hiddenKeys.add(key);
    scheduleUpdateUI();
}

function initEyeButtons() {
    document.querySelectorAll('.eye-btn').forEach(btn => btn.addEventListener('click', handleEyeToggle));
}

let isHiddenAccordionOpen = false;

function renderHiddenRows(breakdown) {
    const state = getState();
    const container = document.getElementById('hidden-breakdown-container');
    const list = document.getElementById('hidden-rows-list');
    const countSpan = document.getElementById('hidden-count');
    if (!container || !list) return;

    if (state.hiddenKeys.size === 0) {
        container.classList.add('hidden');
        list.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    countSpan.textContent = state.hiddenKeys.size;
    list.innerHTML = '';

    const labelMap = {
        'fyc': 'Hoa hồng cơ bản (FYC)',
        'bonusMonth': 'Thưởng năng suất tháng',
        'bonusQuarter': 'Thưởng quý (BQ)',
        'mgmtQuarter': 'Phí khai thác quý',
        'starSupport': 'Hỗ trợ Ngôi sao',
        'mgmtTraining': 'Phí đào tạo đội ngũ',
        'mgmtDirect': 'Phí khai thác trực tiếp tháng',
        'mgmtIndirect': 'Phí gián tiếp L1/L2',
        'mgmtIndirectSm': 'Phí gián tiếp SM+',
        'partner': 'Thưởng Shinhan Partner',
        'mdrt': 'Thưởng tiến độ MDRT'
    };

    state.hiddenKeys.forEach(key => {
        let val = 0, label = key;
        if (key.startsWith('extra_')) {
            const id = parseInt(key.split('_')[1]);
            const b = state.extraBonuses.find(x => x.id === id);
            if (b) {
                val = b.type === 'quarter' ? b.amountVND / 3_000_000 : b.amountVND / 1_000_000;
                label = b.name || 'Khoản thưởng khác';
            }
        } else {
            val = breakdown[key] || 0;
            label = labelMap[key] || key;
        }

        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 py-2 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] transition-colors rounded px-2';
        row.innerHTML = `
            <button class="eye-btn-restore shrink-0" data-key="${key}" title="Khôi phục khoản này">
                <i class="fa-regular fa-eye-slash text-teal-400/80 hover:text-teal-300 transition-colors"></i>
            </button>
            <span class="text-slate-400 text-xs flex-1 line-through decoration-white/20 truncate">${label}</span>
            <span class="text-slate-500 font-semibold text-xs shrink-0">${formatCurrencyPhone(val)}</span>
        `;
        list.appendChild(row);
    });

    list.querySelectorAll('.eye-btn-restore').forEach(btn => {
        btn.addEventListener('click', (e) => {
            getState().hiddenKeys.delete(e.currentTarget.dataset.key);
            scheduleUpdateUI();
        });
    });
}

// ============================================================
// EXTRA BONUS LIST (left panel)
// ============================================================
let bonusIdCounter = 0;

function renderExtraBonusList() {
    const state = getState();
    const list = document.getElementById('extra-bonus-list');
    if (!list) return;
    list.innerHTML = '';

    state.extraBonuses.forEach(b => {
        const row = document.createElement('div');
        row.className = 'extra-bonus-row slide-in';
        row.dataset.id = b.id;

        row.innerHTML = `
            <input type="text" class="bonus-name-input input-base text-sm py-2 px-3 min-h-[40px]" placeholder="Tên khoản thưởng..." value="${b.name}">
            <select class="bonus-type-select input-base text-xs py-2 px-3 min-h-[40px]">
                <option value="month" ${b.type === 'month' ? 'selected' : ''}>Cố định tháng</option>
                <option value="quarter" ${b.type === 'quarter' ? 'selected' : ''}>Tính theo Quý (÷3)</option>
            </select>
            <div class="relative">
                <input type="text" inputmode="numeric"
                    class="bonus-amount-input vnd-input-base text-xs py-2 pl-3 pr-6 min-h-[40px]"
                    placeholder="Số tiền VNĐ"
                    value="${b.amountVND > 0 ? formatVND(b.amountVND) : ''}">
                <span class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₫</span>
            </div>
            <button class="bonus-delete-btn w-10 h-10 rounded-xl flex items-center justify-center text-red-400/50 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0" title="Xoá khoản thưởng này">
                <i class="fa-solid fa-trash text-sm"></i>
            </button>
        `;

        row.querySelector('.bonus-name-input').addEventListener('input', (e) => {
            const bonus = getState().extraBonuses.find(x => x.id === b.id);
            if (bonus) bonus.name = e.target.value;
            requestAnimationFrame(() => { renderExtraBonusPhoneRows(); recalcTotal(); });
        });
        row.querySelector('.bonus-type-select').addEventListener('change', (e) => {
            const bonus = getState().extraBonuses.find(x => x.id === b.id);
            if (bonus) bonus.type = e.target.value;
            requestAnimationFrame(() => { renderExtraBonusPhoneRows(); recalcTotal(); });
        });
        liveFormatVNDInput(row.querySelector('.bonus-amount-input'), (num) => {
            const bonus = getState().extraBonuses.find(x => x.id === b.id);
            if (bonus) bonus.amountVND = num;
            requestAnimationFrame(() => { renderExtraBonusPhoneRows(); recalcTotal(); });
        });
        row.querySelector('.bonus-delete-btn').addEventListener('click', () => {
            row.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            row.style.opacity = '0';
            row.style.transform = 'translateX(8px)';
            setTimeout(() => {
                const st = getState();
                st.extraBonuses = st.extraBonuses.filter(x => x.id !== b.id);
                st.hiddenKeys.delete('extra_' + b.id);
                renderExtraBonusList();
                requestAnimationFrame(() => { renderExtraBonusPhoneRows(); recalcTotal(); });
            }, 250);
        });

        list.appendChild(row);
    });
}

function recalcTotal() {
    const { visible } = calculateVisibleTotal(getState());
    animateNumber('total-income', visible);
    renderFypSummary();
    updateChart();
}

// ============================================================
// FYP SUMMARY CARD (#11)
// ============================================================
function renderFypSummary() {
    const state = getState();
    const container = document.getElementById('fyp-summary-rows');
    if (!container) return;

    const role    = state.role;
    const isAgent = ['FC', 'StarFC'].includes(role);
    const isSL    = ['GSL', 'SSL', 'ESL'].includes(role);
    const isSM    = ['SM', 'EM', 'ERM', 'IRM'].includes(role);

    const rows = [];

    if (isAgent) {
        const fyp = fypInMillions();
        rows.push({ label: 'FYP Cá nhân Tháng', val: fyp, unit: 'triệu ₫' });
        if (state.hasQuarterBonus) {
            rows.push({ label: 'FYP Cá nhân Quý', val: state.fypQuarter / 1_000_000, unit: 'triệu ₫' });
        }
        if (role === 'StarFC' && state.monthMode === '14-19') {
            rows.push({ label: 'FYP ĐLBH giới thiệu', val: state.starFcReferralFyp / 1_000_000, unit: 'triệu ₫' });
        }
    }

    if (isSL) {
        const fypTT = Number(state.fycTeamDirect);
        rows.push({ label: 'FYP Nhóm TT Tháng', val: fypTT, unit: 'triệu ₫' });
        rows.push({ label: 'Số lượt hoạt động', val: state.activeHeadcount, unit: 'lượt', noFormat: true });
        if (role === 'SSL' || role === 'ESL') {
            rows.push({ label: 'FYP GT Lớp 1', val: Number(state.fycTeamIndirectL1), unit: 'triệu ₫' });
        }
        if (role === 'ESL') {
            rows.push({ label: 'FYP GT Lớp 2', val: Number(state.fycTeamIndirectL2), unit: 'triệu ₫' });
        }
        if (state.hasSlQuarterBonus) {
            rows.push({ label: 'FYP Nhóm TT Quý', val: state.fypTeamQuarter / 1_000_000, unit: 'triệu ₫' });
        }
        if (state.hasPersonalSales) {
            rows.push({ label: 'FYP Cá nhân Tháng', val: fypInMillions(), unit: 'triệu ₫' });
            if (state.hasQuarterBonus) {
                rows.push({ label: 'FYP Cá nhân Quý', val: state.fypQuarter / 1_000_000, unit: 'triệu ₫' });
            }
        }
    }

    if (isSM) {
        const fypTT   = Number(state.fypTeamDirectSm) / 1_000_000;
        const fypL1   = Number(state.fypIndirectSmL1) / 1_000_000;
        const fypL2   = Number(state.fypIndirectSmL2) / 1_000_000;
        const fypL3   = Number(state.fypIndirectSmL3) / 1_000_000;
        const total   = fypTT + (role !== 'SM' ? fypL1 : 0)
                            + (!['SM', 'EM'].includes(role) ? fypL2 : 0)
                            + (role === 'IRM' ? fypL3 : 0);
        const target  = state.smTargetRevenue / 1_000_000;
        const pctHT   = target > 0 ? (total / target * 100).toFixed(1) : state.smTargetRatio.toFixed(1);

        rows.push({ label: 'Chỉ tiêu Tháng', val: target.toFixed(0), unit: 'triệu ₫', noFormat: true });
        rows.push({ label: 'FYP Nhóm TT', val: fypTT, unit: 'triệu ₫' });
        if (role !== 'SM') rows.push({ label: 'FYP GT Lớp 1', val: fypL1, unit: 'triệu ₫' });
        if (!['SM', 'EM'].includes(role)) rows.push({ label: 'FYP GT Lớp 2', val: fypL2, unit: 'triệu ₫' });
        if (role === 'IRM') rows.push({ label: 'FYP GT Lớp 3', val: fypL3, unit: 'triệu ₫' });
        rows.push({ label: '% Hoàn thành', val: pctHT, unit: '%', noFormat: true, highlight: true });
        rows.push({ label: 'Số lượt HĐ', val: state.activeHeadcountSm, unit: 'lượt', noFormat: true });

        if (state.hasPersonalSales) {
            rows.push({ label: 'FYP Cá nhân', val: fypInMillions(), unit: 'triệu ₫' });
        }
    }

    container.innerHTML = rows.map(r => {
        const valStr = r.noFormat ? r.val : Number(r.val).toFixed(1).replace('.0', '');
        const color  = r.highlight ? 'text-yellow-300' : (Number(r.val) > 0 ? 'text-teal-300' : 'text-slate-500');
        return `<div class="fyp-summary-row border-b border-white/[0.05] last:border-0">
            <span class="text-slate-400">${r.label}</span>
            <span class="${color} font-semibold">${valStr} <span class="text-slate-500 font-normal">${r.unit}</span></span>
        </div>`;
    }).join('');
}

// ============================================================
// UI RENDER — Điều phối toàn bộ cập nhật giao diện
// ============================================================
function updateUI() {
    const state = getState();
    const role    = state.role;
    const isAgent = ['FC', 'StarFC'].includes(role);
    const isSL    = ['GSL', 'SSL', 'ESL'].includes(role);
    const isSM    = ['SM', 'EM', 'ERM', 'IRM'].includes(role);

    document.getElementById('result-title').innerText = isAgent
        ? `TỔNG THU NHẬP ƯỚC TÍNH (${role})`
        : `TỔNG PHÍ DỊCH VỤ ƯỚC TÍNH (${role})`;

    const personalSection = document.getElementById('personal-section');
    const teamSection     = document.getElementById('team-section');
    const aitomContainer  = document.getElementById('aitom-container');
    const smFields        = document.getElementById('sm-fields');
    const slTeamSection   = document.getElementById('sl-team-direct-section');
    const indL1Row        = document.getElementById('indirect-l1-row');
    const indL2Row        = document.getElementById('indirect-l2-row');
    const perksSection    = document.getElementById('perks-section');
    const fcQuarterSec    = document.getElementById('fc-quarter-section');
    const slQuarterSec    = document.getElementById('sl-quarter-section');
    const starContracts   = document.getElementById('star-fc-contracts-container');
    const slAppointment   = document.getElementById('sl-appointment-row');
    const activeHCRow     = document.getElementById('active-headcount-row');
    const indL1QCol       = document.getElementById('fyc-team-indirect-l1-quarter-col');
    const indL2QCol       = document.getElementById('fyc-team-indirect-l2-quarter-col');
    const slDirectQCol    = document.getElementById('sl-quarter-direct-col');
    const referralFypBox  = document.getElementById('star-fc-referral-fyp-container');
    const fycTeamDirectContainer = document.getElementById('fyc-team-direct-container');
    const monthHint       = document.getElementById('month-hint');

    const fcMonthGrp     = document.getElementById('month-btn-group');
    const starfcMonthGrp = document.getElementById('starfc-month-btn-group');
    const gslMonthGrp    = document.getElementById('gsl-month-btn-group');
    const sslMonthGrp    = document.getElementById('ssl-month-btn-group');
    const eslMonthGrp    = document.getElementById('esl-month-btn-group');
    const smMonthGrp     = document.getElementById('sm-month-btn-group');

    // Hide all month groups first
    [fcMonthGrp, starfcMonthGrp, gslMonthGrp, sslMonthGrp, eslMonthGrp, smMonthGrp].forEach(g => {
        if (g) { g.classList.add('hidden'); g.classList.remove('flex'); }
    });

    let activeMonthGrp = null;
    if      (role === 'StarFC') activeMonthGrp = starfcMonthGrp;
    else if (role === 'GSL')    activeMonthGrp = gslMonthGrp;
    else if (role === 'SSL')    activeMonthGrp = sslMonthGrp;
    else if (role === 'ESL')    activeMonthGrp = eslMonthGrp;
    else if (isSM)              activeMonthGrp = smMonthGrp;
    else                        activeMonthGrp = fcMonthGrp;

    if (activeMonthGrp) {
        activeMonthGrp.classList.remove('hidden');
        activeMonthGrp.classList.add('flex');
    }

    if (isAgent) {
        if (personalSection) personalSection.classList.remove('hidden');
        if (aitomContainer) aitomContainer.classList.remove('hidden');
        if (teamSection) teamSection.classList.add('hidden');
        if (perksSection) perksSection.classList.remove('hidden');
        if (fcQuarterSec) fcQuarterSec.classList.remove('hidden');
        if (slQuarterSec) slQuarterSec.classList.add('hidden');

        if (role === 'StarFC') {
            if (starContracts) starContracts.classList.toggle('hidden', state.monthMode !== '1');
            if (referralFypBox) referralFypBox.classList.toggle('hidden', state.monthMode !== '14-19');
        } else {
            if (starContracts) starContracts.classList.add('hidden');
            if (referralFypBox) referralFypBox.classList.add('hidden');
        }

        if (monthHint) {
            if (role === 'StarFC') {
                const hints = {
                    '1': 'M1: Bảng 1 (Số HĐ + FYP)',
                    '2-7': 'M2-M7: Bảng 3 (FYP ngưỡng 10/20tr)',
                    '8-13': 'M8-M13: Bảng 4 (FYP ngưỡng 20tr)',
                    '14-19': 'M14-M19: Bảng 5 (FYP cá nhân + FYP ĐLBH giới thiệu)'
                };
                monthHint.textContent = hints[state.monthMode] || '';
                monthHint.classList.remove('hidden');
            } else {
                monthHint.classList.add('hidden');
            }
        }
    } else {
        if (teamSection) teamSection.classList.remove('hidden');
        if (fcQuarterSec) fcQuarterSec.classList.toggle('hidden', !state.hasPersonalSales);
        if (starContracts) starContracts.classList.add('hidden');
        if (referralFypBox) referralFypBox.classList.add('hidden');
        if (monthHint) monthHint.classList.add('hidden');
        if (slQuarterSec) slQuarterSec.classList.toggle('hidden', !isSL);

        if (state.hasPersonalSales) {
            if (personalSection) personalSection.classList.remove('hidden');
            if (aitomContainer) aitomContainer.classList.remove('hidden');
            if (perksSection) perksSection.classList.remove('hidden');
        } else {
            if (personalSection) personalSection.classList.add('hidden');
            if (aitomContainer) aitomContainer.classList.add('hidden');
            if (perksSection) perksSection.classList.add('hidden');
        }

        if (isSL) {
            if (smFields) smFields.classList.add('hidden');
            if (slTeamSection) slTeamSection.classList.remove('hidden');
            if (slAppointment) slAppointment.classList.remove('hidden');
            if (state.slAppointmentType === 'promotion') {
                if (activeHCRow) activeHCRow.classList.add('hidden');
                if (fycTeamDirectContainer) {
                    fycTeamDirectContainer.classList.remove('sm:col-span-1');
                    fycTeamDirectContainer.classList.add('col-span-2');
                }
            } else {
                if (activeHCRow) activeHCRow.classList.remove('hidden');
                if (fycTeamDirectContainer) {
                    fycTeamDirectContainer.classList.remove('col-span-2');
                    fycTeamDirectContainer.classList.add('sm:col-span-1');
                }
            }

            if (role === 'GSL') {
                indL1Row.classList.add('hidden');
                indL2Row.classList.add('hidden');
                if (indL1QCol) indL1QCol.classList.add('hidden');
                if (indL2QCol) indL2QCol.classList.add('hidden');
                if (slDirectQCol) { slDirectQCol.classList.add('col-span-2'); slDirectQCol.classList.remove('col-span-1'); }
            } else if (role === 'SSL') {
                indL1Row.classList.remove('hidden');
                indL2Row.classList.add('hidden');
                if (indL1QCol) indL1QCol.classList.remove('hidden');
                if (indL2QCol) indL2QCol.classList.add('hidden');
                if (slDirectQCol) { slDirectQCol.classList.remove('col-span-2'); slDirectQCol.classList.add('col-span-1'); }
            } else {
                indL1Row.classList.remove('hidden');
                indL2Row.classList.remove('hidden');
                if (indL1QCol) indL1QCol.classList.remove('hidden');
                if (indL2QCol) indL2QCol.classList.remove('hidden');
                if (slDirectQCol) { slDirectQCol.classList.add('col-span-2'); slDirectQCol.classList.remove('col-span-1'); }
            }
        }

        if (isSM) {
            if (smFields) smFields.classList.remove('hidden');
            if (slTeamSection) slTeamSection.classList.add('hidden');
            if (slAppointment) slAppointment.classList.add('hidden');
            if (activeHCRow) activeHCRow.classList.add('hidden');
            if (indL1Row) indL1Row.classList.add('hidden');
            if (indL2Row) indL2Row.classList.add('hidden');

            const smIndirectFields  = document.getElementById('sm-indirect-fields');
            const l1Col             = document.getElementById('sm-indirect-l1-col');
            const l2Col             = document.getElementById('sm-indirect-l2-col');
            const l3Col             = document.getElementById('sm-indirect-l3-col');
            const smQIndirectFields = document.getElementById('sm-quarter-indirect-fields');
            const smQL1Col          = document.getElementById('sm-quarter-l1-col');
            const smQL2Col          = document.getElementById('sm-quarter-l2-col');
            const smQL3Col          = document.getElementById('sm-quarter-l3-col');

            if (smIndirectFields) {
                if (role === 'SM') {
                    smIndirectFields.classList.add('hidden');
                } else {
                    smIndirectFields.classList.remove('hidden');
                    if (l1Col) {
                        l1Col.classList.remove('hidden');
                        if (role === 'EM') {
                            l1Col.classList.add('sm:col-span-2');
                        } else {
                            l1Col.classList.remove('sm:col-span-2');
                        }
                    }
                    if (l2Col) l2Col.classList.toggle('hidden', role === 'EM');
                    if (l3Col) l3Col.classList.toggle('hidden', role !== 'IRM');
                }
            }

            if (smQIndirectFields) {
                const showQIndirect = (role !== 'SM');
                smQIndirectFields.classList.toggle('hidden', !showQIndirect);
                if (smQL1Col) {
                    smQL1Col.classList.remove('hidden');
                    if (role === 'EM') {
                        smQL1Col.classList.add('sm:col-span-2');
                    } else {
                        smQL1Col.classList.remove('sm:col-span-2');
                    }
                }
                if (smQL2Col) smQL2Col.classList.toggle('hidden', role === 'SM' || role === 'EM');
                if (smQL3Col) smQL3Col.classList.toggle('hidden', role !== 'IRM');
            }
        }
    }

    // Sync K2 dropdown & badge
    buildK2Options();
    const k2CoefBadge = document.getElementById('k2-coef-badge');
    if (k2CoefBadge) {
        const coef = getK2Coefficient(state);
        k2CoefBadge.textContent = `Hệ số K2 áp dụng: ×${coef.toFixed(2)}`;
        k2CoefBadge.className = coef >= 1.0
            ? 'mt-2 text-right text-xs text-teal-500 font-semibold'
            : coef >= 0.65
                ? 'mt-2 text-right text-xs text-yellow-500 font-semibold'
                : 'mt-2 text-right text-xs text-red-400 font-semibold';
    }

    // Calculate & render
    const { visible, full } = calculateVisibleTotal(state);
    const { breakdown, smDerived } = full;

    // SM derived: cập nhật DOM từ kết quả tính (tách ra khỏi calculator.js)
    if (smDerived && !state.smTargetModeUnlocked) {
        const { smTargetRatio, smActualRevenue } = smDerived;
        // Chỉ ghi state nội bộ, không trigger re-render
        getState().smTargetRatio   = smTargetRatio;
        getState().smActualRevenue = smActualRevenue;
        const ratioEl  = document.getElementById('sm-target-ratio');
        const actualEl = document.getElementById('sm-actual-number');
        if (ratioEl  && document.activeElement !== ratioEl)  ratioEl.value  = smTargetRatio.toFixed(1);
        if (actualEl && document.activeElement !== actualEl) actualEl.value = formatVND(smActualRevenue);
    }

    animateNumber('total-income', visible);

    function setRow(rowId, valId, val, key) {
        const row   = document.getElementById(rowId);
        const valEl = document.getElementById(valId);
        if (!row || !valEl) return;
        if (val > 0.0001 && !state.hiddenKeys.has(key)) {
            row.classList.remove('hidden');
            valEl.innerText = formatCurrencyPhone(val);
        } else {
            row.classList.add('hidden');
        }
    }

    setRow('row-fyc',              'val-fyc',             breakdown.fyc,          'fyc');
    setRow('row-bonus-month',      'val-bonus-month',     breakdown.bonusMonth,   'bonusMonth');
    setRow('row-bonus-quarter',    'val-bonus-quarter',   breakdown.bonusQuarter, 'bonusQuarter');
    setRow('row-star-support',     'val-star-support',    breakdown.starSupport,  'starSupport');
    setRow('row-mgmt-quarter',     'val-mgmt-quarter',    breakdown.mgmtQuarter,  'mgmtQuarter');
    setRow('row-mgmt-training',    'val-mgmt-training',   breakdown.mgmtTraining, 'mgmtTraining');
    setRow('row-mgmt-direct',      'val-mgmt-direct',     breakdown.mgmtDirect,   'mgmtDirect');
    setRow('row-mgmt-indirect',    'val-mgmt-indirect',   breakdown.mgmtIndirect, 'mgmtIndirect');
    setRow('row-mgmt-indirect-sm', 'val-mgmt-indirect-sm', breakdown.mgmtIndirectSm, 'mgmtIndirectSm');
    setRow('row-partner',          'val-partner',         breakdown.partner,      'partner');
    setRow('row-mdrt',             'val-mdrt',            breakdown.mdrt,         'mdrt');

    renderExtraBonusPhoneRows();
    renderHiddenRows(breakdown);
    renderFypSummary();
    updateChart();
}

// ============================================================
// SCHEDULE UI UPDATE (debounce bằng rAF)
// ============================================================
let updateUIFrame = null;
function scheduleUpdateUI() {
    if (updateUIFrame) return;
    updateUIFrame = requestAnimationFrame(() => {
        updateUI();
        updateUIFrame = null;
    });
}

// Subscribe: mỗi khi state thay đổi qua updateState() → scheduleUpdateUI()
onStateChange(() => scheduleUpdateUI());

// ============================================================
// EVENTS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

    // Dark mode
    const savedDark = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyDarkMode(savedDark === '1' || (savedDark === null && prefersDark));
    document.getElementById('dark-toggle').addEventListener('click', () => {
        applyDarkMode(!document.documentElement.classList.contains('dark'));
    });

    // Hidden accordion
    const toggleHiddenBtn = document.getElementById('toggle-hidden-breakdown');
    if (toggleHiddenBtn) {
        toggleHiddenBtn.addEventListener('click', () => {
            const list    = document.getElementById('hidden-rows-list');
            const chevron = document.getElementById('hidden-chevron');
            isHiddenAccordionOpen = !isHiddenAccordionOpen;
            list.classList.toggle('hidden', !isHiddenAccordionOpen);
            chevron.classList.toggle('rotate-180', isHiddenAccordionOpen);
        });
    }

    if (typeof window.initChart === 'function') window.initChart();
    initEyeButtons();

    // Role tabs
    document.querySelectorAll('.role-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.role-tab').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const tab = e.currentTarget.dataset.tab;
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
            document.getElementById(`tab-panel-${tab}`).classList.remove('hidden');

            const firstRoleBtn = document.querySelector(`#tab-panel-${tab} .role-btn`);
            if (firstRoleBtn) {
                document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
                firstRoleBtn.classList.add('active');
                updateStateBatch({
                    role: firstRoleBtn.dataset.role,
                    hasPersonalSales: false,
                });
                document.querySelectorAll('[id^="has-personal-sales"]').forEach(cb => cb.checked = false);
            }
            syncSmTarget();
        });
    });

    // Role buttons
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            updateState('role', e.currentTarget.dataset.role);
            syncSmTarget();
        });
    });

    // Personal sales toggles
    ['has-personal-sales-sl', 'has-personal-sales-sm'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', (e) => {
            document.querySelectorAll('[id^="has-personal-sales"]').forEach(cb => cb.checked = e.target.checked);
            updateState('hasPersonalSales', e.target.checked);
        });
    });

    // Month buttons (FC group)
    document.querySelectorAll('#month-btn-group .month-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#month-btn-group .month-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            updateState('monthMode', e.currentTarget.dataset.month);
            syncSmTarget();
        });
    });

    // Month buttons (StarFC group)
    document.querySelectorAll('#starfc-month-btn-group .month-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#starfc-month-btn-group .month-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            updateState('monthMode', e.currentTarget.dataset.month);
            syncSmTarget();
        });
    });

    // Month buttons for SL role-specific groups
    ['gsl-month-btn-group', 'ssl-month-btn-group', 'esl-month-btn-group'].forEach(groupId => {
        document.querySelectorAll(`#${groupId} .month-btn`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll(`#${groupId} .month-btn`).forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                updateState('monthMode', e.currentTarget.dataset.month);
            });
        });
    });

    // Month buttons for SM+ group
    document.querySelectorAll('#sm-month-btn-group .month-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#sm-month-btn-group .month-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            updateState('monthMode', e.currentTarget.dataset.month);
            syncSmTarget();
        });
    });

    // Chart Toggle
    const toggleChartBtn = document.getElementById('toggle-chart-btn');
    if (toggleChartBtn) {
        toggleChartBtn.addEventListener('click', () => {
            const chartCard = document.getElementById('chart-card');
            chartCard.classList.toggle('hidden');
            chartCard.classList.toggle('lg:block');
            chartCard.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
    }

    // SM+ Quarter
    const hasSmQuarterBonus = document.getElementById('has-sm-quarter-bonus');
    if (hasSmQuarterBonus) {
        hasSmQuarterBonus.addEventListener('change', (e) => {
            updateState('hasSmQuarterBonus', e.target.checked);
            document.getElementById('sm-quarter-fields').classList.toggle('hidden', !e.target.checked);
        });
    }
    const fypTeamQuarterSmNumber = document.getElementById('fyp-team-quarter-sm-number');
    if (fypTeamQuarterSmNumber) {
        liveFormatVNDInput(fypTeamQuarterSmNumber, (num) => { updateState('fypTeamQuarterSm', num); });
    }
    const fypQIndSmL1 = document.getElementById('fyp-quarter-indirect-sm-l1');
    if (fypQIndSmL1) liveFormatVNDInput(fypQIndSmL1, (num) => { updateState('fypQuarterIndirectSmL1', num); });
    const fypQIndSmL2 = document.getElementById('fyp-quarter-indirect-sm-l2');
    if (fypQIndSmL2) liveFormatVNDInput(fypQIndSmL2, (num) => { updateState('fypQuarterIndirectSmL2', num); });
    const fypQIndSmL3 = document.getElementById('fyp-quarter-indirect-sm-l3');
    if (fypQIndSmL3) liveFormatVNDInput(fypQIndSmL3, (num) => { updateState('fypQuarterIndirectSmL3', num); });

    // FC Quarter
    document.getElementById('has-quarter-bonus').addEventListener('change', (e) => {
        updateState('hasQuarterBonus', e.target.checked);
        document.getElementById('fc-quarter-fields').classList.toggle('hidden', !e.target.checked);
    });
    liveFormatVNDInput(document.getElementById('fyp-quarter-number'), (num) => {
        updateState('fypQuarter', num);
    });
    document.getElementById('quarter-active-months').addEventListener('change', (e) => {
        updateState('quarterActiveMonths', parseInt(e.target.value));
    });

    // Star FC contracts
    document.getElementById('star-fc-contracts').addEventListener('input', (e) => {
        updateState('starFcContracts', parseInt(e.target.value) || 0);
    });

    // Star FC referral FYP
    liveFormatVNDInput(document.getElementById('star-fc-referral-fyp'), (num) => {
        updateState('starFcReferralFyp', num);
    });

    // SL Appointment
    document.querySelectorAll('.appointment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.appointment-btn').forEach(b => {
                b.classList.remove('active'); b.classList.add('text-slate-500');
            });
            e.currentTarget.classList.add('active');
            e.currentTarget.classList.remove('text-slate-500');
            updateState('slAppointmentType', e.currentTarget.dataset.type);
        });
    });

    // SL Active headcount
    document.getElementById('active-headcount').addEventListener('input', (e) => {
        updateState('activeHeadcount', parseInt(e.target.value) || 1);
    });

    // FYC Rate SL
    const fycRateSlEl = document.getElementById('fyc-rate-sl');
    if (fycRateSlEl) fycRateSlEl.addEventListener('input', (e) => {
        updateState('fycRateSl', Number(e.target.value) || 30);
    });

    // K2 Dropdown
    const k2RateEl = document.getElementById('k2-rate');
    if (k2RateEl) k2RateEl.addEventListener('change', (e) => {
        updateState('k2Bracket', e.target.value);
    });

    // SL Quarter
    document.getElementById('has-sl-quarter-bonus').addEventListener('change', (e) => {
        updateState('hasSlQuarterBonus', e.target.checked);
        document.getElementById('sl-quarter-fields').classList.toggle('hidden', !e.target.checked);
    });
    liveFormatVNDInput(document.getElementById('fyp-team-quarter-number'), (num) => {
        updateState('fypTeamQuarter', num);
    });
    liveFormatVNDInput(document.getElementById('fyc-team-indirect-l1-quarter'), (num) => {
        updateState('fycTeamIndirectL1Quarter', num);
    });
    liveFormatVNDInput(document.getElementById('fyc-team-indirect-l2-quarter'), (num) => {
        updateState('fycTeamIndirectL2Quarter', num);
    });

    // SM+ Target Inputs
    document.getElementById('sm-unlock-btn').addEventListener('click', () => {
        const st = getState();
        const newUnlocked = !st.smTargetModeUnlocked;
        getState().smTargetModeUnlocked = newUnlocked;

        const icon        = document.getElementById('sm-lock-icon');
        const ratioInput  = document.getElementById('sm-target-ratio');
        const actualInput = document.getElementById('sm-actual-number');

        if (newUnlocked) {
            icon.className = 'fa-solid fa-unlock text-xs text-teal-500';
            actualInput.readOnly = false;
            actualInput.classList.remove('!bg-slate-200', 'dark:!bg-slate-900/40', 'cursor-not-allowed');
            ratioInput.readOnly = true;
            ratioInput.classList.add('!bg-slate-200', 'dark:!bg-slate-900/40', 'cursor-not-allowed');
        } else {
            icon.className = 'fa-solid fa-lock text-xs';
            actualInput.readOnly = true;
            actualInput.classList.add('!bg-slate-200', 'dark:!bg-slate-900/40', 'cursor-not-allowed');
            ratioInput.readOnly = false;
            ratioInput.classList.remove('!bg-slate-200', 'dark:!bg-slate-900/40', 'cursor-not-allowed');
        }
    });

    document.getElementById('sm-target-ratio').addEventListener('input', (e) => {
        if (getState().smTargetModeUnlocked) return;
        const ratio = Number(e.target.value) || 0;
        const newActual = getState().smTargetRevenue * (ratio / 100);
        getState().smTargetRatio   = ratio;
        getState().smActualRevenue = newActual;
        document.getElementById('sm-actual-number').value = formatVND(newActual);
        scheduleUpdateUI();
    });

    liveFormatVNDInput(document.getElementById('sm-actual-number'), (num) => {
        if (!getState().smTargetModeUnlocked) return;
        const st = getState();
        st.smActualRevenue = num;
        st.smTargetRatio   = st.smTargetRevenue > 0 ? Math.round((num / st.smTargetRevenue) * 10000) / 100 : 0;
        document.getElementById('sm-target-ratio').value = st.smTargetRatio;
        scheduleUpdateUI();
    });

    // SM+ Headcount
    document.getElementById('active-headcount-sm').addEventListener('input', (e) => {
        updateState('activeHeadcountSm', parseInt(e.target.value) || 1);
    });

    // FYC Rate SM+
    const fycRateSmEl = document.getElementById('fyc-rate-sm');
    if (fycRateSmEl) fycRateSmEl.addEventListener('input', (e) => {
        updateState('fycRateSm', Number(e.target.value) || 30);
    });

    // SM+ FYP inputs
    liveFormatVNDInput(document.getElementById('fyp-team-direct-sm'), (num) => {
        updateState('fypTeamDirectSm', num);
    });
    liveFormatVNDInput(document.getElementById('fyp-indirect-sm-l1'), (num) => {
        updateState('fypIndirectSmL1', num);
    });
    liveFormatVNDInput(document.getElementById('fyp-indirect-sm-l2'), (num) => {
        updateState('fypIndirectSmL2', num);
    });
    liveFormatVNDInput(document.getElementById('fyp-indirect-sm-l3'), (num) => {
        updateState('fypIndirectSmL3', num);
    });

    // FYP mode toggle
    document.getElementById('fyp-mode-toggle').addEventListener('click', () => {
        const st = getState();
        const toNumber = st.fypInputMode === 'slider';
        getState().fypInputMode = toNumber ? 'number' : 'slider';
        document.getElementById('fyp-slider-block').classList.toggle('hidden', toNumber);
        document.getElementById('fyp-number-block').classList.toggle('hidden', !toNumber);
        document.getElementById('fyp-mode-icon').className = toNumber ? 'fa-solid fa-keyboard' : 'fa-solid fa-sliders';
        document.getElementById('fyp-mode-label').innerText = toNumber ? 'Nhập số' : 'Thanh trượt';
        if (toNumber) {
            const el = document.getElementById('fyp-number-input');
            el.value = st.fyp > 0 ? formatVND(st.fyp) : '';
            el.focus();
        }
    });

    document.getElementById('fyp-slider').addEventListener('input', (e) => {
        updateState('fyp', parseInt(e.target.value) || 0);
        syncFypDisplay();
    });

    liveFormatVNDInput(document.getElementById('fyp-number-input'), (num) => {
        updateState('fyp', num);
        syncFypDisplay();
    });

    document.querySelectorAll('.fyp-quick-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const val = parseInt(e.currentTarget.dataset.val);
            updateState('fyp', val);
            document.getElementById('fyp-slider').value = val;
            syncFypDisplay();
        });
    });

    // FYC Rate (personal)
    document.getElementById('fyc-rate').addEventListener('input', (e) => {
        updateState('fycRate', Number(e.target.value) || 0);
    });

    // AiTOM buttons
    document.querySelectorAll('.aitom-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.aitom-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            updateState('aitom', e.currentTarget.dataset.grade);
        });
    });

    // Team Direct mode toggle (SL)
    document.getElementById('team-direct-mode-toggle').addEventListener('click', () => {
        const st = getState();
        const toNumber = st.teamDirectInputMode === 'slider';
        getState().teamDirectInputMode = toNumber ? 'number' : 'slider';
        document.getElementById('team-direct-slider-block').classList.toggle('hidden', toNumber);
        document.getElementById('team-direct-number-block').classList.toggle('hidden', !toNumber);
        document.getElementById('team-direct-mode-icon').className = toNumber ? 'fa-solid fa-keyboard' : 'fa-solid fa-sliders';
        document.getElementById('team-direct-mode-label').innerText = toNumber ? 'Nhập số' : 'Thanh trượt';
        if (toNumber) {
            const el = document.getElementById('fyc-team-direct-number');
            el.value = st.fycTeamDirect > 0 ? formatVND(st.fycTeamDirect * 1_000_000) : '';
            el.focus();
        }
    });

    document.getElementById('fyc-team-direct').addEventListener('input', (e) => {
        const val = Number(e.target.value) || 0;
        updateState('fycTeamDirect', val);
        document.getElementById('fyc-team-direct-val').innerText = val + ' tr';
    });

    liveFormatVNDInput(document.getElementById('fyc-team-direct-number'), (num) => {
        const val = num / 1_000_000;
        updateState('fycTeamDirect', val);
        document.getElementById('fyc-team-direct-val').innerText = val.toFixed(1) + ' tr';
    });

    // SL Indirect L1 & L2 (FYP)
    liveFormatVNDInput(document.getElementById('fyc-team-indirect-l1'), (num) => {
        updateState('fycTeamIndirectL1', num / 1_000_000);
    });
    liveFormatVNDInput(document.getElementById('fyc-team-indirect-l2'), (num) => {
        updateState('fycTeamIndirectL2', num / 1_000_000);
    });

    // Partner
    document.getElementById('partner-level').addEventListener('change', (e) => {
        updateState('partner', e.target.value);
    });

    // MDRT
    document.getElementById('mdrt-check').addEventListener('change', (e) => {
        updateState('mdrt', e.target.checked);
    });

    // Add bonus
    document.getElementById('add-bonus-btn').addEventListener('click', () => {
        getState().extraBonuses.push({ id: ++bonusIdCounter, name: '', type: 'month', amountVND: 0 });
        renderExtraBonusList();
        setTimeout(() => {
            const list = document.getElementById('extra-bonus-list');
            if (list.lastElementChild) {
                list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                list.lastElementChild.querySelector('.bonus-name-input')?.focus();
            }
        }, 100);
    });

    // Initial render
    syncSmTarget();
    syncFypDisplay();
    updateUI();
});
