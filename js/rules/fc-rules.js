// ============================================================
// FC-RULES.JS — Quy tắc đại lý FC / StarFC
// Pure Functions: nhận tham số thuần, không đọc DOM, không import chéo.
// Spec: SHL-FCS-2026-0007
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
// K2 FC — K2 cá nhân
// Mức ngưỡng: <50%, 50-60%, 60-65%, 65-70%, 70-80%, >=80%
// ============================================================

/**
 * Tra hệ số K2 cho chức danh FC / StarFC.
 * @param {string} bracket  - Mức ngưỡng K2 ('80+', '70-80', ...)
 * @param {string} monthMode - Tháng hoạt động ('1', '2-7', '8-13', '14-19', '13+', ...)
 * @returns {number}
 */
export function getK2Coefficient_FC(bracket, monthMode) {
    const isM12Plus = ['12+', '12', '13+', '12-15', '16+', '14-19', '20+'].includes(monthMode);
    switch (bracket) {
        case '<50':   return 0.45;
        case '50-60': return 0.50;
        case '60-65': return 0.65;
        case '65-70': return 0.80;
        case '70-80': return 1.00;
        case '80+':   return isM12Plus ? 1.20 : 1.00;
        default:      return 1.00;
    }
}

// ============================================================
// Tính thưởng năng suất tháng (Bảng 2)
// ============================================================

/**
 * Tính tỷ lệ % thưởng năng suất tháng dựa trên FYP và AiTOM.
 * @param {number} fypMil  - FYP cá nhân tháng (đơn vị: triệu ₫)
 * @param {string} aitom   - Cấp AiTOM: 'S', 'A', 'B', 'C', 'D'
 * @returns {number}       - Tỷ lệ % dạng thập phân (vd: 0.18)
 */
export function getMonthBonusRate(fypMil, aitom) {
    const isHighGrade = ['S', 'A'].includes(aitom);
    if      (fypMil >= 10  && fypMil < 25)  return 0.10;
    else if (fypMil >= 25  && fypMil < 45)  return isHighGrade ? 0.18 : 0.15;
    else if (fypMil >= 45  && fypMil < 70)  return isHighGrade ? 0.23 : 0.20;
    else if (fypMil >= 70  && fypMil < 100) return isHighGrade ? 0.28 : 0.25;
    else if (fypMil >= 100)                 return isHighGrade ? 0.33 : 0.30;
    return 0;
}

// ============================================================
// Tính thưởng quý FC / StarFC (và SL+/SM+ có DS cá nhân)
// ============================================================

/**
 * Tính thưởng quý cá nhân FC / StarFC.
 * @param {number} qFypMil         - FYP quý cá nhân (triệu ₫)
 * @param {number} fycRate         - Tỷ lệ FYC dạng thập phân (vd: 0.30)
 * @param {number} quarterActiveMonths - Số tháng hoạt động trong quý (1 | 2 | 3)
 * @param {number} k2Coef          - Hệ số K2
 * @returns {number}               - Thưởng quý trung bình tháng (triệu ₫/tháng)
 */
export function calculateQuarterBonus(qFypMil, fycRate, quarterActiveMonths, k2Coef) {
    let qBonusRate = 0;
    if      (qFypMil >= 75  && qFypMil < 135) qBonusRate = 0.06;
    else if (qFypMil >= 135 && qFypMil < 210) qBonusRate = 0.08;
    else if (qFypMil >= 210 && qFypMil < 300) qBonusRate = 0.10;
    else if (qFypMil >= 300)                  qBonusRate = 0.12;

    if (qBonusRate === 0) return 0;

    const activeCoef = quarterActiveMonths == 3 ? 1.2
                     : quarterActiveMonths == 2 ? 1.0 : 0.8;
    const qFyc = qFypMil * fycRate;
    return roundMil((qFyc * qBonusRate * activeCoef * k2Coef) / 3);
}

// ============================================================
// Hỗ trợ StarFC (Bảng 1, 3, 4, 5)
// ============================================================

/**
 * Tính khoản hỗ trợ StarFC theo tháng hỗ trợ.
 * @param {number} fypRaw         - FYP cá nhân (VND raw)
 * @param {number} numContracts   - Số hợp đồng tháng 1 (chỉ dùng khi month === '1')
 * @param {number} referralFypRaw - FYP từ ĐLBH được giới thiệu (VND raw, M14-M19)
 * @param {string} month          - Tháng hỗ trợ StarFC ('1', '2-7', '8-13', '14-19')
 * @param {number} k2Coef         - Hệ số K2
 * @returns {number}              - Giá trị hỗ trợ (triệu ₫)
 */
export function calculateStarFCSupport(fypRaw, numContracts, referralFypRaw, month, k2Coef) {
    let starSupportVND = 0;

    if (month === '1') {
        if (numContracts >= 3 && fypRaw >= 25_000_000) {
            starSupportVND = 25_000_000;
        } else if (numContracts >= 1 && fypRaw >= 15_000_000) {
            starSupportVND = 15_000_000;
        } else if (numContracts >= 1 && fypRaw >= 10_000_000) {
            starSupportVND = 10_000_000;
        }
    } else if (month === '2-7') {
        if      (fypRaw >= 20_000_000) starSupportVND = 15_000_000;
        else if (fypRaw >= 10_000_000) starSupportVND = 5_000_000;
    } else if (month === '8-13') {
        if (fypRaw >= 20_000_000) starSupportVND = 10_000_000;
    } else if (month === '14-19') {
        if (fypRaw >= 15_000_000 && referralFypRaw >= 10_000_000) {
            starSupportVND = 5_000_000;
        }
    }

    return roundMil((starSupportVND / 1_000_000) * k2Coef);
}

// ============================================================
// Gói tổng hợp: Tính toàn bộ phần thu nhập cá nhân FC/StarFC
// (hoặc SL/SM+ có hasPersonalSales)
// ============================================================

/**
 * Tính tổng phần thu nhập cá nhân (FYC + thưởng tháng + thưởng quý + hỗ trợ StarFC).
 * @param {Object} params
 * @param {string} params.role
 * @param {number} params.fypMil         - FYP cá nhân tháng (triệu ₫)
 * @param {number} params.fycRate        - Tỷ lệ FYC dạng thập phân
 * @param {number} params.k2Coef         - Hệ số K2
 * @param {string} params.aitom          - Cấp AiTOM
 * @param {boolean} params.hasQuarterBonus
 * @param {number} params.fypQuarterRaw  - FYP quý cá nhân (VND raw)
 * @param {number} params.quarterActiveMonths
 * @param {number} params.fypRaw         - FYP cá nhân (VND raw, dùng cho StarFC)
 * @param {number} params.starFcContracts
 * @param {number} params.starFcReferralFypRaw
 * @param {string} params.monthMode
 * @returns {{ fyc: number, bonusMonth: number, bonusQuarter: number, starSupport: number }}
 */
export function calculatePersonalBonus({
    role,
    fypMil,
    fycRate,
    k2Coef,
    aitom,
    hasQuarterBonus,
    fypQuarterRaw,
    quarterActiveMonths,
    fypRaw,
    starFcContracts,
    starFcReferralFypRaw,
    monthMode,
}) {
    const fyc = roundMil(fypMil * fycRate);

    // Thưởng năng suất tháng
    const monthBonusRate = getMonthBonusRate(fypMil, aitom);
    const bonusMonth = roundMil(fyc * monthBonusRate * k2Coef);

    // Thưởng quý (FC/StarFC hoặc SL/SM+ có DS cá nhân)
    let bonusQuarter = 0;
    if (hasQuarterBonus) {
        const qFypMil = safeNum(fypQuarterRaw) / 1_000_000;
        bonusQuarter = calculateQuarterBonus(qFypMil, fycRate, quarterActiveMonths, k2Coef);
    }

    // Hỗ trợ StarFC
    let starSupport = 0;
    if (role === 'StarFC') {
        starSupport = calculateStarFCSupport(
            safeNum(fypRaw),
            safeNum(starFcContracts),
            safeNum(starFcReferralFypRaw),
            monthMode,
            k2Coef
        );
    }

    return { fyc, bonusMonth, bonusQuarter, starSupport };
}
