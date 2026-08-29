// ============================================================
// CALCULATOR.JS — Orchestrator Engine
// Import từ /rules/ → gọi pure functions → cộng dồn kết quả.
// Không chứa công thức tính toán nội tuyến — chỉ điều phối.
// Zero DOM. Zero side-effects.
// ============================================================

import {
    getK2Coefficient_FC,
    calculatePersonalBonus,
} from './rules/fc-rules.js';

import {
    getK2Coefficient_SL,
    calculateSLFees,
} from './rules/sl-rules.js';

import {
    getK2Coefficient_SM,
    calculateSMFees,
} from './rules/sm-rules.js';

// ---- Defensive helper ----
/**
 * Chuyển đổi giá trị sang Number an toàn.
 * Nếu kết quả là NaN, trả về fallback (mặc định 0).
 * @param {*} val
 * @param {number} fallback
 * @returns {number}
 */
function safeNum(val, fallback = 0) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
}

function roundMil(val) {
    return Math.round(safeNum(val) * 1_000_000) / 1_000_000;
}

// ============================================================
// K2 OPTIONS — Config dùng cho UI (không đụng DOM)
// ============================================================

export const K2_OPTIONS = {
    FC: [
        { value: '<50', label: 'K2 < 50%' },
        { value: '50-60', label: 'K2 ≥ 50%' },
        { value: '60-65', label: 'K2 ≥ 60%' },
        { value: '65-70', label: 'K2 ≥ 65%' },
        { value: '70-80', label: 'K2 ≥ 70%' },
        { value: '80+', label: 'K2 ≥ 80%' },
    ],
    SL: [
        { value: '<40', label: 'K2 < 40%' },
        { value: '40-50', label: 'K2 ≥ 40%' },
        { value: '50-60', label: 'K2 ≥ 50%' },
        { value: '60-65', label: 'K2 ≥ 60%' },
        { value: '65-75', label: 'K2 ≥ 65%' },
        { value: '75+', label: 'K2 ≥ 75%' },
    ],
    SM: [
        { value: '<35', label: 'K2 < 35%' },
        { value: '35-45', label: 'K2 ≥ 35%' },
        { value: '45-50', label: 'K2 ≥ 45%' },
        { value: '50-60', label: 'K2 ≥ 50%' },
        { value: '60-70', label: 'K2 ≥ 60%' },
        { value: '70+', label: 'K2 ≥ 70%' },
    ],
};

export const K2_DEFAULT_BRACKET = { FC: '80+', SL: '75+', SM: '70+' };

// ============================================================
// K2 ROUTER — tra hệ số K2 theo role hiện tại
// ============================================================

/**
 * Tra hệ số K2 theo role hiện tại trong state.
 * Ủy thác cho hàm K2 phù hợp trong từng rules file.
 * @param {Object} state
 * @returns {number}
 */
export function getK2Coefficient(state) {
    const role = state.role;
    const bracket = state.k2Bracket;
    const month = state.monthMode;
    const isAgent = ['FC', 'StarFC'].includes(role);
    const isSL = ['GSL', 'SSL', 'ESL'].includes(role);
    if (isAgent) return getK2Coefficient_FC(bracket, month);
    if (isSL) return getK2Coefficient_SL(bracket, month);
    return getK2Coefficient_SM(bracket, month);
}

// ============================================================
// MAIN CALCULATION ORCHESTRATOR
// ============================================================

/**
 * Tính toán thu nhập/phí dịch vụ dựa trên state.
 * Điều phối các rules file tương ứng với chức danh, cộng dồn kết quả.
 *
 * @param {Object} state                   - globalState từ state.js
 * @param {number|null} overrideFypMillions - Ghi đè FYP (triệu) cho chart projection
 * @returns {{
 *   total: number,
 *   breakdown: Object,
 *   smDerived: { completionRate: number, smTargetRatio: number, smActualRevenue: number } | null
 * }}
 *
 * breakdown keys:
 *   fyc, bonusMonth, bonusQuarter, starSupport,
 *   mgmtTraining, mgmtDirect, mgmtIndirect,
 *   mgmtQuarter, mgmtIndirectSm,
 *   partner, mdrt, extraTotal
 */
export function calculateIncome(state, overrideFypMillions = null) {
    const role = state.role;
    const fypMil = overrideFypMillions !== null
        ? safeNum(overrideFypMillions)
        : safeNum(state.fyp) / 1_000_000;
    const fycRate = safeNum(state.fycRate) / 100;
    const k2Coef = getK2Coefficient(state);

    let total = 0;
    const breakdown = {
        fyc: 0, bonusMonth: 0, bonusQuarter: 0,
        starSupport: 0, mgmtTraining: 0, mgmtDirect: 0, mgmtIndirect: 0,
        mgmtQuarter: 0, mgmtIndirectSm: 0, partner: 0, mdrt: 0, extraTotal: 0,
    };

    let smDerived = null;

    const isAgent = ['FC', 'StarFC'].includes(role);
    const isSL = ['GSL', 'SSL', 'ESL'].includes(role);
    const isSM = ['SM', 'EM', 'ERM', 'IRM'].includes(role);
    const calcPersonal = isAgent || ((isSL || isSM) && state.hasPersonalSales);

    // ======================================================
    // NHÓM 1: Tư vấn viên (FC / StarFC) — hoặc SL/SM+ có DS cá nhân
    // ======================================================
    if (calcPersonal) {
        const personal = calculatePersonalBonus({
            role,
            fypMil,
            fycRate,
            k2Coef,
            aitom: state.aitom,
            hasQuarterBonus: state.hasQuarterBonus && (isAgent || state.hasPersonalSales),
            fypQuarterRaw: state.fypQuarter,
            quarterActiveMonths: state.quarterActiveMonths,
            fypRaw: state.fyp,
            starFcContracts: state.starFcContracts,
            starFcReferralFypRaw: state.starFcReferralFyp,
            monthMode: state.monthMode,
        });

        breakdown.fyc = personal.fyc;
        breakdown.bonusMonth = personal.bonusMonth;
        breakdown.bonusQuarter = personal.bonusQuarter;
        breakdown.starSupport = personal.starSupport;

        total += breakdown.fyc + breakdown.bonusMonth + breakdown.bonusQuarter + breakdown.starSupport;
    }

    // ======================================================
    // NHÓM 2: Quản lý cấp trung — SL (GSL, SSL, ESL)
    // ======================================================
    if (isSL) {
        const slResult = calculateSLFees({
            role,
            slFycRate: safeNum(state.fycRateSl) / 100,
            teamFypTT: safeNum(state.fycTeamDirect),
            l1FypMil: safeNum(state.fycTeamIndirectL1),
            l2FypMil: safeNum(state.fycTeamIndirectL2),
            k2Coef,
            slAppointmentType: state.slAppointmentType,
            monthMode: state.monthMode,
            activeHeadcount: state.activeHeadcount,
            hasSlQuarterBonus: state.hasSlQuarterBonus,
            fypTeamQuarterRaw: state.fypTeamQuarter,
            l1FypQuarterRaw: state.fycTeamIndirectL1Quarter,
            l2FypQuarterRaw: state.fycTeamIndirectL2Quarter,
        });

        breakdown.mgmtQuarter = slResult.mgmtQuarter;
        breakdown.mgmtTraining = slResult.mgmtTraining;
        breakdown.mgmtDirect = slResult.mgmtDirect;
        breakdown.mgmtIndirect = slResult.mgmtIndirect;

        total += breakdown.mgmtQuarter + breakdown.mgmtTraining
            + breakdown.mgmtDirect + breakdown.mgmtIndirect;
    }

    // ======================================================
    // NHÓM 3: Quản lý cấp cao — SM+ (SM, EM, ERM, IRM)
    // ======================================================
    if (isSM) {
        const fypL1Mil = (role === 'SM') ? 0 : safeNum(state.fypIndirectSmL1) / 1_000_000;
        const fypL2Mil = (['SM', 'EM'].includes(role)) ? 0 : safeNum(state.fypIndirectSmL2) / 1_000_000;
        const fypL3Mil = (['SM', 'EM', 'ERM'].includes(role)) ? 0 : safeNum(state.fypIndirectSmL3) / 1_000_000;

        const smResult = calculateSMFees({
            role,
            smFycRate: safeNum(state.fycRateSm) / 100,
            fypTTMil: safeNum(state.fypTeamDirectSm) / 1_000_000,
            fypL1Mil,
            fypL2Mil,
            fypL3Mil,
            smTargetRevenueMil: safeNum(state.smTargetRevenue) / 1_000_000,
            smTargetRatio: state.smTargetRatio,
            activeHeadcountSm: state.activeHeadcountSm,
            k2Coef,
            hasSmQuarterBonus: state.hasSmQuarterBonus,
            fypTeamQuarterSmRaw: state.fypTeamQuarterSm,
            fypQuarterIndirectSmL1Raw: state.fypQuarterIndirectSmL1,
            fypQuarterIndirectSmL2Raw: state.fypQuarterIndirectSmL2,
            fypQuarterIndirectSmL3Raw: state.fypQuarterIndirectSmL3,
        });

        breakdown.mgmtTraining = smResult.mgmtTraining;
        breakdown.mgmtDirect = smResult.mgmtDirect;
        breakdown.mgmtIndirectSm = smResult.mgmtIndirectSm;
        breakdown.mgmtQuarter = smResult.mgmtQuarter;
        smDerived = smResult.smDerived;

        total += breakdown.mgmtTraining + breakdown.mgmtDirect
            + breakdown.mgmtIndirectSm + breakdown.mgmtQuarter;
    }

    // ======================================================
    // Shinhan Partner (chỉ FC, K2 >= 70%)
    // ======================================================
    const partnerK2Met = ['70-80', '80+'].includes(state.k2Bracket);
    if (state.partner !== 'none' && partnerK2Met) {
        const pRate = { G: 0.10, S: 0.15, E: 0.20 }[state.partner] || 0;
        const fypMilP = safeNum(state.fyp) / 1_000_000;
        breakdown.partner = roundMil(fypMilP * (safeNum(state.fycRate) / 100) * pRate);
        total += breakdown.partner;
    }

    // MDRT
    if (state.mdrt) { breakdown.mdrt = 5.0; total += breakdown.mdrt; }

    // Extra bonuses
    let extraTotal = 0;
    if (Array.isArray(state.extraBonuses)) {
        state.extraBonuses.forEach(b => {
            const monthly = b.type === 'quarter'
                ? safeNum(b.amountVND) / 3_000_000
                : safeNum(b.amountVND) / 1_000_000;
            extraTotal += monthly;
        });
    }
    breakdown.extraTotal = roundMil(extraTotal);
    total += breakdown.extraTotal;

    return { total, breakdown, smDerived };
}

// ============================================================
// VISIBLE TOTAL (trừ các khoản đã ẩn)
// ============================================================

/**
 * Tính tổng visible (loại trừ các key trong hiddenKeys).
 * @param {Object} state
 * @returns {{ visible: number, full: ReturnType<calculateIncome> }}
 */
export function calculateVisibleTotal(state) {
    const full = calculateIncome(state);
    const { breakdown } = full;
    let visible = 0;

    const keys = [
        'fyc', 'bonusMonth', 'bonusQuarter', 'starSupport',
        'mgmtQuarter', 'mgmtTraining', 'mgmtDirect', 'mgmtIndirect',
        'mgmtIndirectSm', 'partner', 'mdrt',
    ];
    keys.forEach(k => {
        if (!state.hiddenKeys.has(k)) visible += (breakdown[k] || 0);
    });

    if (Array.isArray(state.extraBonuses)) {
        state.extraBonuses.forEach(b => {
            if (!state.hiddenKeys.has('extra_' + b.id)) {
                const monthly = b.type === 'quarter'
                    ? safeNum(b.amountVND) / 3_000_000
                    : safeNum(b.amountVND) / 1_000_000;
                visible += monthly;
            }
        });
    }

    return { visible, full };
}
