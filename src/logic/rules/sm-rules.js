// ============================================================
// SM-RULES.JS — Quy tắc quản lý cấp cao SM+ (SM, EM, ERM, IRM)
// Pure Functions: nhận tham số thuần, không đọc DOM, không import chéo.
// Spec: SHL-FCS-2026-0009
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
// K2 SM+ — K2 Toàn Nhóm
// Mức ngưỡng: <35%, 35-45%, 45-50%, 50-60%, 60-70%, >=70%
// ============================================================

/**
 * Tra hệ số K2 cho chức danh SM+ (SM / EM / ERM / IRM).
 * @param {string} bracket   - Mức ngưỡng K2 ('70+', '60-70', ...)
 * @param {string} monthMode - Tháng hoạt động
 * @returns {number}
 */
export function getK2Coefficient_SM(bracket, monthMode) {
    const isM12Plus = ['13+'].includes(monthMode);
    switch (bracket) {
        case '<35':   return 0.50;
        case '35-45': return 0.50;
        case '45-50': return 0.60;
        case '50-60': return 0.80;
        case '60-70': return 1.00;
        case '70+':   return isM12Plus ? 1.20 : 1.00;
        default:      return 1.00;
    }
}

// ============================================================
// Tính tỷ lệ hoàn thành chỉ tiêu SM+
// ============================================================

/**
 * Tính tỷ lệ hoàn thành chỉ tiêu SM+.
 * @param {number} totalFypMil   - Tổng FYP thực tế (triệu ₫)
 * @param {number} targetMil     - Chỉ tiêu tháng (triệu ₫)
 * @param {number} smTargetRatio - % hoàn thành (dạng số, vd: 100)  — fallback nếu target = 0
 * @returns {number}             - Tỷ lệ hoàn thành (dạng thập phân, vd: 1.0)
 */
export function calcSMCompletionRate(totalFypMil, targetMil, smTargetRatio) {
    return targetMil > 0
        ? totalFypMil / targetMil
        : safeNum(smTargetRatio) / 100;
}

// ============================================================
// Phí đào tạo đội ngũ SM+
// ============================================================

/**
 * Tính phí đào tạo đội ngũ SM+.
 * @param {string} role               - 'SM' | 'EM' | 'ERM' | 'IRM'
 * @param {number} completionRate     - Tỷ lệ hoàn thành chỉ tiêu (thập phân)
 * @param {number} activeHeadcountSm  - Số lượt hoạt động SM+
 * @param {number} k2Coef             - Hệ số K2
 * @returns {number}                  - Phí đào tạo (triệu ₫)
 */
export function calculateSMTrainingFee(role, completionRate, activeHeadcountSm, k2Coef) {
    const phiChuan = { SM: 40, EM: 60, ERM: 80, IRM: 110 }[role] ?? 0;

    let heSoFyp = 0;
    if      (completionRate < 0.35) heSoFyp = 0;
    else if (completionRate < 0.50) heSoFyp = completionRate;
    else if (completionRate < 0.80) heSoFyp = 0.50;
    else if (completionRate < 1.15) heSoFyp = 1.00;
    else                            heSoFyp = 1.20;

    const hsHeadcount = safeNum(activeHeadcountSm) >= 1 ? 1.0 : 0.0;
    return roundMil(phiChuan * (0.75 * heSoFyp + 0.25 * hsHeadcount) * k2Coef);
}

// ============================================================
// Phí khai thác trực tiếp tháng SM+
// ============================================================

/**
 * Tính % phí khai thác trực tiếp tháng SM+ theo tỷ lệ hoàn thành.
 * @param {number} completionRate - Tỷ lệ hoàn thành chỉ tiêu (thập phân)
 * @returns {number}              - Tỷ lệ % (thập phân)
 */
export function getSMDirectRate(completionRate) {
    if      (completionRate >= 1.0) return 0.12;
    else if (completionRate >= 0.8) return 0.10;
    return 0.06;
}

/**
 * Tính phí khai thác trực tiếp tháng SM+.
 * @param {number} fypTTMil       - FYP nhóm TT (triệu ₫)
 * @param {number} smFycRate      - Tỷ lệ FYC nhóm (thập phân)
 * @param {number} completionRate - Tỷ lệ hoàn thành (thập phân)
 * @param {number} k2Coef         - Hệ số K2
 * @returns {number}              - Phí khai thác TT (triệu ₫)
 */
export function calculateSMDirectFee(fypTTMil, smFycRate, completionRate, k2Coef) {
    const fycTT = fypTTMil * smFycRate;
    return roundMil(fycTT * getSMDirectRate(completionRate) * k2Coef);
}

// ============================================================
// Phí khai thác gián tiếp SM+ (EM, ERM, IRM)
// ============================================================

/**
 * Tính % phí khai thác gián tiếp SM+ theo role và tỷ lệ hoàn thành.
 * @param {string} role           - 'EM' | 'ERM' | 'IRM'
 * @param {number} completionRate - Tỷ lệ hoàn thành (thập phân)
 * @returns {number}              - Tỷ lệ % (thập phân)
 */
export function getSMIndirectRate(role, completionRate) {
    if (role === 'EM') {
        return completionRate < 0.8 ? 0.024 : (completionRate < 1.0 ? 0.04 : 0.048);
    } else if (role === 'ERM') {
        return completionRate < 0.8 ? 0.018 : (completionRate < 1.0 ? 0.03 : 0.036);
    } else if (role === 'IRM') {
        return completionRate < 0.8 ? 0.012 : (completionRate < 1.0 ? 0.02 : 0.024);
    }
    return 0;
}

/**
 * Tính phí khai thác gián tiếp SM+ (EM, ERM, IRM).
 * @param {string} role           - 'EM' | 'ERM' | 'IRM' (SM không có gián tiếp)
 * @param {number} fypL1Mil       - FYP GT L1 (triệu ₫)
 * @param {number} fypL2Mil       - FYP GT L2 (triệu ₫)
 * @param {number} fypL3Mil       - FYP GT L3 (triệu ₫)
 * @param {number} smFycRate      - Tỷ lệ FYC nhóm (thập phân)
 * @param {number} completionRate - Tỷ lệ hoàn thành (thập phân)
 * @param {number} k2Coef         - Hệ số K2
 * @returns {number}              - Phí gián tiếp (triệu ₫)
 */
export function calculateSMIndirectFee(role, fypL1Mil, fypL2Mil, fypL3Mil, smFycRate, completionRate, k2Coef) {
    if (role === 'SM') return 0;
    const pctIndirect = getSMIndirectRate(role, completionRate);
    const totalIndirectFyc = (fypL1Mil + fypL2Mil + fypL3Mil) * smFycRate;
    return roundMil(totalIndirectFyc * pctIndirect * k2Coef);
}

// ============================================================
// Phí khai thác quý SM+
// ============================================================

/**
 * Tính phí khai thác quý SM+.
 * @param {string} role                 - 'SM' | 'EM' | 'ERM' | 'IRM'
 * @param {number} fypQTTMil            - FYP nhóm TT quý (triệu ₫)
 * @param {number} fypQL1Mil            - FYP GT L1 quý (triệu ₫)
 * @param {number} fypQL2Mil            - FYP GT L2 quý (triệu ₫)
 * @param {number} fypQL3Mil            - FYP GT L3 quý (triệu ₫)
 * @param {number} smFycRate            - Tỷ lệ FYC nhóm (thập phân)
 * @param {number} k2Coef               - Hệ số K2
 * @param {number} monthlyCompletionRate - Tỷ lệ hoàn thành tháng (dùng làm fallback)
 * @param {number} smTargetRevenueMil   - Chỉ tiêu tháng (triệu ₫, dùng tính chỉ tiêu quý)
 * @returns {number}                    - Phí quý trung bình tháng (triệu ₫/tháng)
 */
export function calculateSMQuarterBonus(
    role,
    fypQTTMil, fypQL1Mil, fypQL2Mil, fypQL3Mil,
    smFycRate, k2Coef,
    monthlyCompletionRate, smTargetRevenueMil
) {
    const totalQFyp = fypQTTMil + fypQL1Mil + fypQL2Mil + fypQL3Mil;
    const qTarget   = smTargetRevenueMil * 3; // 3 tháng
    const qCompRate = qTarget > 0 ? totalQFyp / qTarget : monthlyCompletionRate;

    const pctQTT      = getSMDirectRate(qCompRate);
    const pctQIndirect = role !== 'SM' ? getSMIndirectRate(role, qCompRate) : 0;

    const fycQTT       = fypQTTMil * smFycRate;
    const fycQIndirect = (fypQL1Mil + fypQL2Mil + fypQL3Mil) * smFycRate;
    const smQVal       = (fycQTT * pctQTT + fycQIndirect * pctQIndirect) * k2Coef;
    return roundMil(smQVal / 3);
}

// ============================================================
// Gói tổng hợp: Tính toàn bộ phần phí dịch vụ SM+
// ============================================================

/**
 * Tính toàn bộ phần phí dịch vụ quản lý SM+ (SM / EM / ERM / IRM).
 * @param {Object} params
 * @param {string} params.role
 * @param {number} params.smFycRate             - % FYC nhóm (thập phân)
 * @param {number} params.fypTTMil              - FYP nhóm TT tháng (triệu ₫)
 * @param {number} params.fypL1Mil              - FYP GT L1 tháng (triệu ₫)
 * @param {number} params.fypL2Mil              - FYP GT L2 tháng (triệu ₫)
 * @param {number} params.fypL3Mil              - FYP GT L3 tháng (triệu ₫)
 * @param {number} params.smTargetRevenueMil    - Chỉ tiêu tháng (triệu ₫)
 * @param {number} params.smTargetRatio         - % hoàn thành fallback
 * @param {number} params.activeHeadcountSm     - Số lượt hoạt động
 * @param {number} params.k2Coef               - Hệ số K2
 * @param {boolean} params.hasSmQuarterBonus
 * @param {number} params.fypTeamQuarterSmRaw   - FYP nhóm TT quý (VND raw)
 * @param {number} params.fypQuarterIndirectSmL1Raw
 * @param {number} params.fypQuarterIndirectSmL2Raw
 * @param {number} params.fypQuarterIndirectSmL3Raw
 * @returns {{
 *   mgmtTraining: number,
 *   mgmtDirect: number,
 *   mgmtIndirectSm: number,
 *   mgmtQuarter: number,
 *   smDerived: { completionRate: number, smTargetRatio: number, smActualRevenue: number } | null
 * }}
 */
export function calculateSMFees({
    role,
    smFycRate,
    fypTTMil,
    fypL1Mil,
    fypL2Mil,
    fypL3Mil,
    smTargetRevenueMil,
    smTargetRatio,
    activeHeadcountSm,
    k2Coef,
    hasSmQuarterBonus,
    fypTeamQuarterSmRaw,
    fypQuarterIndirectSmL1Raw,
    fypQuarterIndirectSmL2Raw,
    fypQuarterIndirectSmL3Raw,
}) {
    const totalFyp       = fypTTMil + fypL1Mil + fypL2Mil + fypL3Mil;
    const completionRate = calcSMCompletionRate(totalFyp, smTargetRevenueMil, smTargetRatio);

    // 3.1 Phí đào tạo đội ngũ
    const mgmtTraining = calculateSMTrainingFee(role, completionRate, activeHeadcountSm, k2Coef);

    // 3.2 Phí khai thác trực tiếp
    const mgmtDirect = calculateSMDirectFee(fypTTMil, smFycRate, completionRate, k2Coef);

    // 3.3 Phí khai thác gián tiếp
    const mgmtIndirectSm = calculateSMIndirectFee(
        role, fypL1Mil, fypL2Mil, fypL3Mil, smFycRate, completionRate, k2Coef
    );

    // 3.4 Phí khai thác quý SM+
    let mgmtQuarter = 0;
    if (hasSmQuarterBonus) {
        const fypQTTMil = safeNum(fypTeamQuarterSmRaw)         / 1_000_000;
        const fypQL1Mil = role !== 'SM'             ? safeNum(fypQuarterIndirectSmL1Raw) / 1_000_000 : 0;
        const fypQL2Mil = !['SM','EM'].includes(role)? safeNum(fypQuarterIndirectSmL2Raw) / 1_000_000 : 0;
        const fypQL3Mil = role === 'IRM'            ? safeNum(fypQuarterIndirectSmL3Raw) / 1_000_000 : 0;

        mgmtQuarter = calculateSMQuarterBonus(
            role,
            fypQTTMil, fypQL1Mil, fypQL2Mil, fypQL3Mil,
            smFycRate, k2Coef,
            completionRate, smTargetRevenueMil
        );
    }

    // smDerived: trả về để app.js cập nhật DOM — tách khỏi side-effect
    let smDerived = null;
    if (fypTTMil > 0 || fypL1Mil > 0) {
        smDerived = {
            completionRate,
            smTargetRatio: Math.round(completionRate * 10000) / 100,
            smActualRevenue: totalFyp * 1_000_000,
        };
    }

    return { mgmtTraining, mgmtDirect, mgmtIndirectSm, mgmtQuarter, smDerived };
}
