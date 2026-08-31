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
 * Spec: SHL-FCS-2026-0012, Chương 3 Bảng 1/3/4/5.
 *
 * @param {number} fypRaw         - FYP cá nhân tháng (VND raw)
 * @param {number} numContracts   - Số hợp đồng tháng M1 (chỉ dùng khi month === '1')
 * @param {number} referralFypRaw - FYP từ ĐLBH được giới thiệu (VND raw, chỉ dùng M14-M19)
 * @param {string} month          - Khoảng tháng hỗ trợ StarFC: '1' | '2-7' | '8-13' | '14-19'
 * @param {number} k2Coef         - Hệ số K2 (đã tra Bảng 6)
 * @param {string} aiTomGrade     - Hạng AiTOM: 'S' | 'A' | 'B' | 'C'
 * @returns {number}              - Khoản hỗ trợ (triệu ₫)
 */
export function calculateStarFCSupport(fypRaw, numContracts, referralFypRaw, month, k2Coef, aiTomGrade) {
    // Quy đổi sang triệu VNĐ để tra bảng
    const fypMil       = safeNum(fypRaw)       / 1_000_000;
    const referralMil  = safeNum(referralFypRaw) / 1_000_000;
    const grade        = String(aiTomGrade || '').toUpperCase();
    let   supportMil   = 0;

    // ----------------------------------------------------------
    // Bảng 1 — Đánh giá tháng M1
    // Mức 3: >= 3 HĐ, FYP >= 25tr, AiTOM A  => 4,0 triệu
    // Mức 2: >= 1 HĐ, FYP >= 15tr, AiTOM B  => 2,5 triệu
    // Mức 1: >= 1 HĐ, FYP >= 10tr, AiTOM B  => 1,0 triệu
    // ----------------------------------------------------------
    if (month === '1') {
        if (numContracts >= 3 && fypMil >= 25 && (grade === 'A' || grade === 'S')) {
            supportMil = 4.0;
        } else if (numContracts >= 1 && fypMil >= 15 && grade === 'B') {
            supportMil = 2.5;
        } else if (numContracts >= 1 && fypMil >= 10 && grade === 'B') {
            supportMil = 1.0;
        }

    // ----------------------------------------------------------
    // Bảng 3 — Giai đoạn M2-M7
    // Cột FYP: [20-40), [40-60), [60-80), >=80  (triệu)
    // Hàng AiTOM: A/S | B | C
    // ----------------------------------------------------------
    } else if (month === '2-7') {
        // Xác định cột FYP
        let col = -1; // -1 = dưới ngưỡng
        if      (fypMil >= 80) col = 3;
        else if (fypMil >= 60) col = 2;
        else if (fypMil >= 40) col = 1;
        else if (fypMil >= 20) col = 0;

        if (col >= 0) {
            if (grade === 'S' || grade === 'A') {
                supportMil = [1.8, 4.0, 6.5, 9.0][col];
            } else if (grade === 'B') {
                supportMil = [1.4, 3.0, 5.0, 7.0][col];
            } else if (grade === 'C') {
                supportMil = [1.0, 2.2, 3.5, 5.0][col];
            }
        }

    // ----------------------------------------------------------
    // Bảng 4 — Giai đoạn M8-M13
    // Cột FYP: [30-50), [50-70), [70-100), >=100  (triệu)
    // Hàng AiTOM: S | A | B
    // ----------------------------------------------------------
    } else if (month === '8-13') {
        let col = -1;
        if      (fypMil >= 100) col = 3;
        else if (fypMil >= 70)  col = 2;
        else if (fypMil >= 50)  col = 1;
        else if (fypMil >= 30)  col = 0;

        if (col >= 0) {
            if (grade === 'S') {
                supportMil = [4.0, 8.0, 13.0, 20.0][col];
            } else if (grade === 'A') {
                supportMil = [3.4, 6.0,  9.0, 18.0][col];
            } else if (grade === 'B') {
                supportMil = [2.3, 4.0,  6.0, 15.0][col];
            }
        }

    // ----------------------------------------------------------
    // Bảng 5 — Giai đoạn M14-M19
    // Hàng: FYP giới thiệu (referral): >=60 | [40-60) | [20-40)  (triệu)
    // Cột:  FYP cá nhân:               [40-60) | [60-80) | [80-100) | >=100  (triệu)
    // ----------------------------------------------------------
    } else if (month === '14-19') {
        // Xác định cột FYP cá nhân
        let col = -1;
        if      (fypMil >= 100) col = 3;
        else if (fypMil >= 80)  col = 2;
        else if (fypMil >= 60)  col = 1;
        else if (fypMil >= 40)  col = 0;

        // Xác định hàng FYP được giới thiệu
        if (col >= 0) {
            if (referralMil >= 60) {
                supportMil = [5.0, 10.0, 15.0, 20.0][col];
            } else if (referralMil >= 40) {
                supportMil = [4.5,  7.0, 10.0, 18.0][col];
            } else if (referralMil >= 20) {
                supportMil = [3.0,  5.0,  7.0, 15.0][col];
            }
        }
    }

    return roundMil(supportMil * k2Coef);
}

// ============================================================
// Tính thưởng Shinhan Partner (Bảng 9)
// ============================================================

/**
 * Tính thưởng Shinhan Partner (FC).
 * @param {string} partner    - Danh hiệu: 'G', 'S', 'E', 'none'
 * @param {string} k2Bracket  - Mức ngưỡng K2
 * @param {number} fypMil     - FYP cá nhân (triệu ₫)
 * @param {number} fycRate    - Tỷ lệ FYC dạng thập phân
 * @returns {number}          - Thưởng Shinhan Partner (triệu ₫)
 */
export function calculatePartnerBonus(partner, k2Bracket, fypMil, fycRate) {
    const partnerK2Met = ['70-80', '80+'].includes(k2Bracket);
    if (partner !== 'none' && partnerK2Met) {
        const pRate = { G: 0.10, S: 0.15, E: 0.20 }[partner] || 0;
        return roundMil(fypMil * fycRate * pRate);
    }
    return 0;
}

// ============================================================
// Tính thưởng MDRT (Ví dụ: Thưởng tiến độ tạm tính)
// ============================================================

/**
 * Tính thưởng MDRT (Ví dụ: tiến độ).
 * @param {boolean} mdrt - Có đạt MDRT hay không
 * @returns {number}     - Thưởng MDRT (triệu ₫)
 */
export function calculateMDRTBonus(mdrt) {
    return mdrt ? 5.0 : 0;
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
 * @param {string} params.k2Bracket      - Mức ngưỡng K2
 * @param {string} params.aitom          - Cấp AiTOM
 * @param {string} params.partner        - Danh hiệu Shinhan Partner ('G', 'S', 'E', 'none')
 * @param {boolean} params.mdrt          - Đạt MDRT
 * @param {boolean} params.hasQuarterBonus
 * @param {number} params.fypQuarterRaw  - FYP quý cá nhân (VND raw)
 * @param {number} params.quarterActiveMonths
 * @param {number} params.fypRaw         - FYP cá nhân (VND raw, dùng cho StarFC)
 * @param {number} params.starFcContracts
 * @param {number} params.starFcReferralFypRaw
 * @param {string} params.monthMode
 * @returns {{ fyc: number, bonusMonth: number, bonusQuarter: number, starSupport: number, partner: number, mdrt: number }}
 */
export function calculatePersonalBonus({
    role,
    fypMil,
    fycRate,
    k2Coef,
    k2Bracket,
    aitom,
    partner,
    mdrt,
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
            k2Coef,
            aitom
        );
    }

    // Shinhan Partner
    const partnerBonus = calculatePartnerBonus(partner, k2Bracket, fypMil, fycRate);

    // MDRT
    const mdrtBonus = calculateMDRTBonus(mdrt);

    return {
        fyc,
        bonusMonth,
        bonusQuarter,
        starSupport,
        partner: partnerBonus,
        mdrt: mdrtBonus
    };
}
