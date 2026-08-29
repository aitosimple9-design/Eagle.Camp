// ============================================================
// CALCULATOR.JS — Pure Functions, Zero DOM
// Nhận state object làm input duy nhất.
// Trả về { total, breakdown, smDerived } — không có side effects.
// ============================================================

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
// K2 COEFFICIENT LOOKUP TABLES
// ============================================================

/**
 * K2 FC (SHL-FCS-2026-0007) — K2 cá nhân
 * Mức ngưỡng: <50%, 50-60%, 60-65%, 65-70%, 70-80%, >=80%
 * @param {string} bracket
 * @param {string} monthMode
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

/**
 * K2 SL+ (SHL-FCS-2026-0008) — K2 Toàn Nhóm
 * Mức ngưỡng: <40%, 40-50%, 50-60%, 60-65%, 65-75%, >=75%
 * @param {string} bracket
 * @param {string} monthMode
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

/**
 * K2 SM+ (SHL-FCS-2026-0009) — K2 Toàn Nhóm
 * Mức ngưỡng: <35%, 35-45%, 45-50%, 50-60%, 60-70%, >=70%
 * @param {string} bracket
 * @param {string} monthMode
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

/**
 * Tra hệ số K2 theo role hiện tại trong state.
 * @param {Object} state
 * @returns {number}
 */
export function getK2Coefficient(state) {
    const role    = state.role;
    const bracket = state.k2Bracket;
    const month   = state.monthMode;
    const isAgent = ['FC', 'StarFC'].includes(role);
    const isSL    = ['GSL', 'SSL', 'ESL'].includes(role);
    if (isAgent) return getK2Coefficient_FC(bracket, month);
    if (isSL)    return getK2Coefficient_SL(bracket, month);
    return getK2Coefficient_SM(bracket, month);
}

// ============================================================
// MAIN CALCULATION
// ============================================================

/**
 * Tính toán thu nhập/phí dịch vụ dựa trên state.
 *
 * @param {Object} state - globalState từ state.js
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
    // Defensive: ép kiểu tất cả số trước khi tính
    const role    = state.role;
    const fyp     = overrideFypMillions !== null
        ? safeNum(overrideFypMillions)
        : safeNum(state.fyp) / 1_000_000;
    const fycRate = safeNum(state.fycRate) / 100;
    const fyc     = fyp * fycRate;
    const k2Coef  = getK2Coefficient(state);

    let total = 0;
    const breakdown = {
        fyc: 0, bonusMonth: 0, bonusQuarter: 0,
        starSupport: 0, mgmtTraining: 0, mgmtDirect: 0, mgmtIndirect: 0,
        mgmtQuarter: 0, mgmtIndirectSm: 0, partner: 0, mdrt: 0, extraTotal: 0
    };

    // smDerived: trả về để app.js cập nhật DOM (tránh side-effect trong calculator)
    let smDerived = null;

    const isAgent     = ['FC', 'StarFC'].includes(role);
    const isSL        = ['GSL', 'SSL', 'ESL'].includes(role);
    const isSM        = ['SM', 'EM', 'ERM', 'IRM'].includes(role);
    const calcPersonal = isAgent || ((isSL || isSM) && state.hasPersonalSales);

    // ======================================================
    // NHÓM 1: Tư vấn viên (FC / StarFC) — hoặc SL/SM+ có DS cá nhân
    // ======================================================
    if (calcPersonal) {
        breakdown.fyc = roundMil(fyc);
        total += breakdown.fyc;

        // 1.2 Thưởng năng suất tháng (Bảng 2)
        let monthBonusRate = 0;
        const isHighGrade = ['S', 'A'].includes(state.aitom);
        if      (fyp >= 10 && fyp < 25)  monthBonusRate = 0.10;
        else if (fyp >= 25 && fyp < 45)  monthBonusRate = isHighGrade ? 0.18 : 0.15;
        else if (fyp >= 45 && fyp < 70)  monthBonusRate = isHighGrade ? 0.23 : 0.20;
        else if (fyp >= 70 && fyp < 100) monthBonusRate = isHighGrade ? 0.28 : 0.25;
        else if (fyp >= 100)             monthBonusRate = isHighGrade ? 0.33 : 0.30;
        breakdown.bonusMonth = roundMil(fyc * monthBonusRate * k2Coef);
        total += breakdown.bonusMonth;

        // 1.3 Thưởng quý FC/StarFC (hoặc SL+/SM+ có DS cá nhân)
        if (state.hasQuarterBonus && (isAgent || state.hasPersonalSales)) {
            const qFyp = safeNum(state.fypQuarter) / 1_000_000;
            let qBonusRate = 0;
            if      (qFyp >= 75  && qFyp < 135) qBonusRate = 0.06;
            else if (qFyp >= 135 && qFyp < 210) qBonusRate = 0.08;
            else if (qFyp >= 210 && qFyp < 300) qBonusRate = 0.10;
            else if (qFyp >= 300)               qBonusRate = 0.12;

            const activeCoef = state.quarterActiveMonths == 3 ? 1.2
                             : state.quarterActiveMonths == 2 ? 1.0 : 0.8;
            const qFyc = qFyp * fycRate;
            breakdown.bonusQuarter = roundMil((qFyc * qBonusRate * activeCoef * k2Coef) / 3);
            total += breakdown.bonusQuarter;
        }

        // 1.4 Hỗ trợ StarFC (Bảng 1, 3, 4, 5)
        if (role === 'StarFC') {
            let starSupportVal = 0;
            const valFyp     = safeNum(state.fyp);
            const numContracts = safeNum(state.starFcContracts);
            const month      = state.monthMode;

            if (month === '1') {
                if (numContracts >= 3 && valFyp >= 25000000) {
                    starSupportVal = 25000000;
                } else if (numContracts >= 1 && valFyp >= 15000000) {
                    starSupportVal = 15000000;
                } else if (numContracts >= 1 && valFyp >= 10000000) {
                    starSupportVal = 10000000;
                }
            } else if (month === '2-7') {
                if (valFyp >= 20000000) starSupportVal = 15000000;
                else if (valFyp >= 10000000) starSupportVal = 5000000;
            } else if (month === '8-13') {
                if (valFyp >= 20000000) starSupportVal = 10000000;
            } else if (month === '14-19') {
                const refVal = safeNum(state.starFcReferralFyp);
                if (valFyp >= 15000000 && refVal >= 10000000) {
                    starSupportVal = 5000000;
                }
            }
            breakdown.starSupport = roundMil((starSupportVal / 1_000_000) * k2Coef);
            total += breakdown.starSupport;
        }
    }

    // ======================================================
    // NHÓM 2: Quản lý cấp trung — SL (GSL, SSL, ESL)
    // ======================================================
    if (isSL) {
        const slK2Coef  = k2Coef;
        const slFycRate = safeNum(state.fycRateSl) / 100;
        const teamFypTT = safeNum(state.fycTeamDirect);
        const teamFycTT = teamFypTT * slFycRate;

        // 2.0 Thưởng quý SL
        if (state.hasSlQuarterBonus) {
            const fypQ   = safeNum(state.fypTeamQuarter) / 1_000_000;
            const l1FypQ = role === 'GSL' ? 0 : safeNum(state.fycTeamIndirectL1Quarter) / 1_000_000;
            const l2FypQ = role !== 'ESL' ? 0 : safeNum(state.fycTeamIndirectL2Quarter) / 1_000_000;

            let pctQ = 0;
            if (fypQ >= 100 && fypQ < 300) {
                pctQ = role === 'GSL' ? 0.05 : (role === 'SSL' ? 0.08 : 0.10);
            } else if (fypQ >= 300) {
                pctQ = role === 'GSL' ? 0.08 : (role === 'SSL' ? 0.10 : 0.12);
            }

            const fycQTT  = fypQ   * slFycRate;
            const fycQL1  = l1FypQ * slFycRate;
            const fycQL2  = l2FypQ * slFycRate;
            const slQuarter = ((fycQTT * pctQ) + (fycQL1 * 0.05) + (fycQL2 * 0.025)) * slK2Coef;
            breakdown.mgmtQuarter = roundMil(slQuarter / 3);
            total += breakdown.mgmtQuarter;
        }

        // 2.1 Phí đào tạo đội ngũ (chỉ tuyển ngang & trong giai đoạn hỗ trợ)
        let phiDaoTao = 0;
        if (state.slAppointmentType === 'lateral') {
            const reqHeadcount = { GSL: 1, SSL: 2, ESL: 1 }[role];
            const m = state.monthMode;
            const inSupport =
                (role === 'GSL' && m === '1-9') ||
                (role === 'SSL' && (m === '1-11' || m === '12')) ||
                (role === 'ESL' && (m === '1-11' || m === '12-15'));

            if (inSupport && safeNum(state.activeHeadcount) >= reqHeadcount) {
                const phiChuan = { GSL: 8, SSL: 10, ESL: 12 }[role];
                phiDaoTao = phiChuan * slK2Coef;
            }
        }
        breakdown.mgmtTraining = roundMil(phiDaoTao);
        total += breakdown.mgmtTraining;

        // 2.2 Phí khai thác trực tiếp tháng
        let pctKhaiThac = 0;
        if (role === 'GSL') {
            if      (teamFypTT < 30) pctKhaiThac = 0.03;
            else if (teamFypTT < 60) pctKhaiThac = 0.10;
            else if (teamFypTT < 90) pctKhaiThac = 0.15;
            else                     pctKhaiThac = 0.20;
        } else if (role === 'SSL') {
            if      (teamFypTT < 30) pctKhaiThac = 0.04;
            else if (teamFypTT < 60) pctKhaiThac = 0.15;
            else if (teamFypTT < 90) pctKhaiThac = 0.20;
            else                     pctKhaiThac = 0.25;
        } else { // ESL
            if      (teamFypTT < 30) pctKhaiThac = 0.05;
            else if (teamFypTT < 60) pctKhaiThac = 0.20;
            else if (teamFypTT < 90) pctKhaiThac = 0.25;
            else                     pctKhaiThac = 0.30;
        }
        breakdown.mgmtDirect = roundMil(teamFycTT * pctKhaiThac * slK2Coef);
        total += breakdown.mgmtDirect;

        // 2.3 Phí khai thác gián tiếp (L1: 5%, L2: 2.5%)
        const l1Fyp = role === 'GSL' ? 0 : safeNum(state.fycTeamIndirectL1);
        const l2Fyp = role !== 'ESL' ? 0 : safeNum(state.fycTeamIndirectL2);
        const l1Fyc = l1Fyp * slFycRate;
        const l2Fyc = l2Fyp * slFycRate;
        breakdown.mgmtIndirect = roundMil(((l1Fyc * 0.05) + (l2Fyc * 0.025)) * slK2Coef);
        total += breakdown.mgmtIndirect;
    }

    // ======================================================
    // NHÓM 3: Quản lý cấp cao — SM+ (SM, EM, ERM, IRM)
    // ======================================================
    if (isSM) {
        const smK2Coef  = k2Coef;
        const smFycRate = safeNum(state.fycRateSm) / 100;
        const fypTT = safeNum(state.fypTeamDirectSm) / 1_000_000;
        const fypL1 = (role === 'SM') ? 0 : safeNum(state.fypIndirectSmL1) / 1_000_000;
        const fypL2 = (['SM', 'EM'].includes(role)) ? 0 : safeNum(state.fypIndirectSmL2) / 1_000_000;
        const fypL3 = (['SM', 'EM', 'ERM'].includes(role)) ? 0 : safeNum(state.fypIndirectSmL3) / 1_000_000;

        const totalFyp  = fypTT + fypL1 + fypL2 + fypL3;
        const targetMil = safeNum(state.smTargetRevenue) / 1_000_000;
        const completionRate = targetMil > 0
            ? totalFyp / targetMil
            : safeNum(state.smTargetRatio) / 100;

        // 3.1 Phí đào tạo đội ngũ
        const phiChuan = { SM: 40, EM: 60, ERM: 80, IRM: 110 }[role];
        let heSoFyp = 0;
        if      (completionRate < 0.35) heSoFyp = 0;
        else if (completionRate < 0.50) heSoFyp = completionRate;
        else if (completionRate < 0.80) heSoFyp = 0.50;
        else if (completionRate < 1.15) heSoFyp = 1.00;
        else                            heSoFyp = 1.20;

        const hsHeadcount = safeNum(state.activeHeadcountSm) >= 1 ? 1.0 : 0.0;
        breakdown.mgmtTraining = roundMil(phiChuan * (0.75 * heSoFyp + 0.25 * hsHeadcount) * smK2Coef);
        total += breakdown.mgmtTraining;

        // 3.2 Phí khai thác trực tiếp tháng
        let pctKhaiThacTT = 0.06;
        if      (completionRate >= 0.8 && completionRate < 1.0) pctKhaiThacTT = 0.10;
        else if (completionRate >= 1.0)                          pctKhaiThacTT = 0.12;

        const fycTT = fypTT * smFycRate;
        breakdown.mgmtDirect = roundMil(fycTT * pctKhaiThacTT * smK2Coef);
        total += breakdown.mgmtDirect;

        // 3.3 Phí khai thác gián tiếp SM+ (EM, ERM, IRM)
        if (role !== 'SM') {
            let pctIndirect = 0;
            if (role === 'EM') {
                pctIndirect = completionRate < 0.8 ? 0.024 : (completionRate < 1.0 ? 0.04 : 0.048);
            } else if (role === 'ERM') {
                pctIndirect = completionRate < 0.8 ? 0.018 : (completionRate < 1.0 ? 0.03 : 0.036);
            } else if (role === 'IRM') {
                pctIndirect = completionRate < 0.8 ? 0.012 : (completionRate < 1.0 ? 0.02 : 0.024);
            }
            const totalIndirectFyc = (fypL1 + fypL2 + fypL3) * smFycRate;
            breakdown.mgmtIndirectSm = roundMil(totalIndirectFyc * pctIndirect * smK2Coef);
            total += breakdown.mgmtIndirectSm;
        }

        // 3.4 Phí khai thác quý SM+
        if (state.hasSmQuarterBonus) {
            const fypQTT = safeNum(state.fypTeamQuarterSm) / 1_000_000;
            const fypQL1 = role !== 'SM' ? safeNum(state.fypQuarterIndirectSmL1) / 1_000_000 : 0;
            const fypQL2 = !['SM', 'EM'].includes(role) ? safeNum(state.fypQuarterIndirectSmL2) / 1_000_000 : 0;
            const fypQL3 = role === 'IRM' ? safeNum(state.fypQuarterIndirectSmL3) / 1_000_000 : 0;

            const totalQFyp = fypQTT + fypQL1 + fypQL2 + fypQL3;
            const qTarget   = safeNum(state.smTargetRevenue) * 3 / 1_000_000; // 3 tháng
            const qCompRate = qTarget > 0 ? totalQFyp / qTarget : completionRate;

            let pctQTT = 0.06;
            if      (qCompRate >= 0.8 && qCompRate < 1.0) pctQTT = 0.10;
            else if (qCompRate >= 1.0)                     pctQTT = 0.12;

            let pctQIndirect = 0;
            if (role !== 'SM') {
                if (role === 'EM') {
                    pctQIndirect = qCompRate < 0.8 ? 0.024 : (qCompRate < 1.0 ? 0.04 : 0.048);
                } else if (role === 'ERM') {
                    pctQIndirect = qCompRate < 0.8 ? 0.018 : (qCompRate < 1.0 ? 0.03 : 0.036);
                } else if (role === 'IRM') {
                    pctQIndirect = qCompRate < 0.8 ? 0.012 : (qCompRate < 1.0 ? 0.02 : 0.024);
                }
            }

            const fycQTT       = fypQTT * smFycRate;
            const fycQIndirect = (fypQL1 + fypQL2 + fypQL3) * smFycRate;
            const smQVal       = (fycQTT * pctQTT + fycQIndirect * pctQIndirect) * smK2Coef;
            breakdown.mgmtQuarter = roundMil(smQVal / 3);
            total += breakdown.mgmtQuarter;
        }

        // smDerived: trả về để app.js cập nhật DOM mà không cần side-effect trong calculator
        if (fypTT > 0 || fypL1 > 0) {
            smDerived = {
                completionRate,
                smTargetRatio: Math.round(completionRate * 10000) / 100,
                smActualRevenue: totalFyp * 1_000_000,
            };
        }
    }

    // ======================================================
    // Shinhan Partner (chỉ FC, K2 >= 70%)
    // ======================================================
    const partnerK2Met = ['70-80', '80+'].includes(state.k2Bracket);
    if (state.partner !== 'none' && partnerK2Met) {
        const pRate = { G: 0.10, S: 0.15, E: 0.20 }[state.partner] || 0;
        const fypMil = safeNum(state.fyp) / 1_000_000;
        breakdown.partner = roundMil(fypMil * (safeNum(state.fycRate) / 100) * pRate);
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
        'mgmtIndirectSm', 'partner', 'mdrt'
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

// ============================================================
// K2 OPTIONS (config dùng cho UI — không đụng DOM)
// ============================================================

export const K2_OPTIONS = {
    FC: [
        { value: '<50',   label: 'K2 < 50%' },
        { value: '50-60', label: '50% ≤ K2 < 60%' },
        { value: '60-65', label: '60% ≤ K2 < 65%' },
        { value: '65-70', label: '65% ≤ K2 < 70%' },
        { value: '70-80', label: '70% ≤ K2 < 80%' },
        { value: '80+',   label: 'K2 ≥ 80%' },
    ],
    SL: [
        { value: '<40',   label: 'K2 < 40%' },
        { value: '40-50', label: '40% ≤ K2 < 50%' },
        { value: '50-60', label: '50% ≤ K2 < 60%' },
        { value: '60-65', label: '60% ≤ K2 < 65%' },
        { value: '65-75', label: '65% ≤ K2 < 75%' },
        { value: '75+',   label: 'K2 ≥ 75%' },
    ],
    SM: [
        { value: '<35',   label: 'K2 < 35%' },
        { value: '35-45', label: '35% ≤ K2 < 45%' },
        { value: '45-50', label: '45% ≤ K2 < 50%' },
        { value: '50-60', label: '50% ≤ K2 < 60%' },
        { value: '60-70', label: '60% ≤ K2 < 70%' },
        { value: '70+',   label: 'K2 ≥ 70%' },
    ],
};

export const K2_DEFAULT_BRACKET = { FC: '80+', SL: '75+', SM: '70+' };
