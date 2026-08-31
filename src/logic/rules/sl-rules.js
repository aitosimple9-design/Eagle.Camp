// ============================================================
// SL-RULES.JS — Quy tắc quản lý cấp trung SL+ (GSL, SSL, ESL)
// Pure Functions: nhận tham số thuần, không đọc DOM, không import chéo.
// Spec: SHL-FCS-2026-0008
// ============================================================

// ---- Defensive helper (local, không export) ----
function safeNum(val, fallback = 0) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
}

function roundMil(val) {
    return Math.round(safeNum(val) * 1_000_000) / 1_000_000;
}

// ============================================================
// K2 SL+ — K2 Toàn Nhóm
// Mức ngưỡng: <40%, 40-50%, 50-60%, 60-65%, 65-75%, >=75%
// ============================================================

/**
 * Tra hệ số K2 cho chức danh SL (GSL / SSL / ESL).
 * @param {string} bracket   - Mức ngưỡng K2 ('75+', '65-75', ...)
 * @param {string} monthMode - Tháng hoạt động
 * @returns {number}
 */
export function getK2Coefficient_SL(bracket, monthMode) {
    const isM12Plus = ['12+', '13+', '12-15', '16+', '14-19', '20+'].includes(monthMode);
    switch (bracket) {
        case '<40':   return 0.50;
        case '40-50': return 0.50;
        case '50-60': return 0.65;
        case '60-65': return 0.80;
        case '65-75': return 1.00;
        case '75+':   return isM12Plus ? 1.20 : 1.00;
        default:      return 1.00;
    }
}

// ============================================================
// Thưởng quý SL
// ============================================================

/**
 * Tính phí khai thác quý SL (GSL/SSL/ESL).
 * @param {string} role           - 'GSL' | 'SSL' | 'ESL'
 * @param {number} fypQMil        - FYP nhóm TT quý (triệu ₫)
 * @param {number} l1FypQMil      - FYP GT L1 quý (triệu ₫) — 0 nếu GSL
 * @param {number} l2FypQMil      - FYP GT L2 quý (triệu ₫) — 0 nếu GSL/SSL
 * @param {number} slFycRate      - Tỷ lệ FYC nhóm (dạng thập phân)
 * @param {number} k2Coef         - Hệ số K2
 * @returns {number}              - Phí quý trung bình tháng (triệu ₫/tháng)
 */
export function calculateSLQuarterBonus(role, fypQMil, l1FypQMil, l2FypQMil, slFycRate, k2Coef) {
    let pctQ = 0;
    if (fypQMil >= 100 && fypQMil < 300) {
        pctQ = role === 'GSL' ? 0.05 : (role === 'SSL' ? 0.08 : 0.10);
    } else if (fypQMil >= 300) {
        pctQ = role === 'GSL' ? 0.08 : (role === 'SSL' ? 0.10 : 0.12);
    }

    const fycQTT  = fypQMil   * slFycRate;
    const fycQL1  = l1FypQMil * slFycRate;
    const fycQL2  = l2FypQMil * slFycRate;
    const total   = ((fycQTT * pctQ) + (fycQL1 * 0.05) + (fycQL2 * 0.025)) * k2Coef;
    return roundMil(total / 3);
}

// ============================================================
// Phí đào tạo đội ngũ (SL — chỉ tuyển ngang trong giai đoạn hỗ trợ)
// ============================================================

/**
 * Tính phí đào tạo đội ngũ SL (chỉ áp dụng tuyển ngang trong giai đoạn hỗ trợ).
 * @param {string} role              - 'GSL' | 'SSL' | 'ESL'
 * @param {string} slAppointmentType - 'lateral' | 'promotion'
 * @param {string} monthMode         - Tháng hỗ trợ
 * @param {number} activeHeadcount   - Số lượt hoạt động nhóm TT
 * @param {number} k2Coef            - Hệ số K2
 * @returns {number}                 - Phí đào tạo (triệu ₫)
 */
export function calculateStandardManagementFee(role, slAppointmentType, monthMode, activeHeadcount, k2Coef) {
    if (slAppointmentType !== 'lateral') return 0;

    const reqHeadcount = { GSL: 1, SSL: 2, ESL: 1 }[role] ?? 1;
    const m = monthMode;
    const inSupport =
        (role === 'GSL' && m === '1-9') ||
        (role === 'SSL' && (m === '1-11' || m === '12')) ||
        (role === 'ESL' && (m === '1-11' || m === '12-15'));

    if (!inSupport || safeNum(activeHeadcount) < reqHeadcount) return 0;

    const phiChuan = { GSL: 8, SSL: 10, ESL: 12 }[role] ?? 0;
    return roundMil(phiChuan * k2Coef);
}

// ============================================================
// Phí khai thác trực tiếp tháng (SL)
// ============================================================

/**
 * Tính % phí khai thác trực tiếp tháng theo role và FYP nhóm TT.
 * @param {string} role       - 'GSL' | 'SSL' | 'ESL'
 * @param {number} teamFypTT  - FYP nhóm TT tháng (đơn vị: triệu ₫)
 * @returns {number}          - Tỷ lệ % (thập phân)
 */
export function getSLDirectRate(role, teamFypTT) {
    if (role === 'GSL') {
        if      (teamFypTT < 30) return 0.03;
        else if (teamFypTT < 60) return 0.10;
        else if (teamFypTT < 90) return 0.15;
        else                     return 0.20;
    } else if (role === 'SSL') {
        if      (teamFypTT < 30) return 0.04;
        else if (teamFypTT < 60) return 0.15;
        else if (teamFypTT < 90) return 0.20;
        else                     return 0.25;
    } else { // ESL
        if      (teamFypTT < 30) return 0.05;
        else if (teamFypTT < 60) return 0.20;
        else if (teamFypTT < 90) return 0.25;
        else                     return 0.30;
    }
}

// ============================================================
// Phí khai thác gián tiếp (L1: 5%, L2: 2.5%)
// ============================================================

/**
 * Tính phí khai thác gián tiếp nhóm SL+ (L1: 5%, L2: 2.5%).
 * @param {number} l1FypMil  - FYP GT Lớp 1 (triệu ₫) — 0 nếu GSL
 * @param {number} l2FypMil  - FYP GT Lớp 2 (triệu ₫) — 0 nếu GSL/SSL
 * @param {number} slFycRate - Tỷ lệ FYC nhóm (dạng thập phân)
 * @param {number} k2Coef    - Hệ số K2
 * @returns {number}         - Phí gián tiếp (triệu ₫)
 */
export function calculateGroupOverrideFee(l1FypMil, l2FypMil, slFycRate, k2Coef) {
    const l1Fyc = l1FypMil * slFycRate;
    const l2Fyc = l2FypMil * slFycRate;
    return roundMil(((l1Fyc * 0.05) + (l2Fyc * 0.025)) * k2Coef);
}

// ============================================================
// Gói tổng hợp: Tính toàn bộ phần phí dịch vụ SL+
// ============================================================

/**
 * Tính toàn bộ phần phí dịch vụ quản lý SL+ (GSL / SSL / ESL).
 * @param {Object} params
 * @param {string} params.role
 * @param {number} params.slFycRate       - % FYC nhóm (thập phân)
 * @param {number} params.teamFypTT       - FYP nhóm TT tháng (triệu ₫)
 * @param {number} params.l1FypMil        - FYP GT L1 tháng (triệu ₫)
 * @param {number} params.l2FypMil        - FYP GT L2 tháng (triệu ₫)
 * @param {number} params.k2Coef          - Hệ số K2
 * @param {string} params.slAppointmentType
 * @param {string} params.monthMode
 * @param {number} params.activeHeadcount
 * @param {boolean} params.hasSlQuarterBonus
 * @param {number} params.fypTeamQuarterRaw  - FYP nhóm TT quý (VND raw)
 * @param {number} params.l1FypQuarterRaw    - FYP GT L1 quý (VND raw)
 * @param {number} params.l2FypQuarterRaw    - FYP GT L2 quý (VND raw)
 * @returns {{ mgmtTraining: number, mgmtDirect: number, mgmtIndirect: number, mgmtQuarter: number }}
 */
export function calculateSLFees({
    role,
    slFycRate,
    teamFypTT,
    l1FypMil,
    l2FypMil,
    k2Coef,
    slAppointmentType,
    monthMode,
    activeHeadcount,
    hasSlQuarterBonus,
    fypTeamQuarterRaw,
    l1FypQuarterRaw,
    l2FypQuarterRaw,
}) {
    // 2.0 Thưởng quý SL
    let mgmtQuarter = 0;
    if (hasSlQuarterBonus) {
        const fypQMil  = safeNum(fypTeamQuarterRaw)  / 1_000_000;
        const l1FypQMil = role === 'GSL' ? 0 : safeNum(l1FypQuarterRaw) / 1_000_000;
        const l2FypQMil = role !== 'ESL' ? 0 : safeNum(l2FypQuarterRaw) / 1_000_000;
        mgmtQuarter = calculateSLQuarterBonus(role, fypQMil, l1FypQMil, l2FypQMil, slFycRate, k2Coef);
    }

    // 2.1 Phí đào tạo
    const mgmtTraining = calculateStandardManagementFee(
        role, slAppointmentType, monthMode, activeHeadcount, k2Coef
    );

    // 2.2 Phí khai thác trực tiếp
    const directRate = getSLDirectRate(role, teamFypTT);
    const teamFycTT  = teamFypTT * slFycRate;
    const mgmtDirect = roundMil(teamFycTT * directRate * k2Coef);

    // 2.3 Phí khai thác gián tiếp
    const actualL1 = role === 'GSL' ? 0 : l1FypMil;
    const actualL2 = role !== 'ESL' ? 0 : l2FypMil;
    const mgmtIndirect = calculateGroupOverrideFee(actualL1, actualL2, slFycRate, k2Coef);

    return { mgmtTraining, mgmtDirect, mgmtIndirect, mgmtQuarter };
}
