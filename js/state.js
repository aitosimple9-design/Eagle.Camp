// ============================================================
// STATE.JS — Single Source of Truth
// Kiến trúc: State Management tương tự Redux/Vuex đơn giản hóa
// ============================================================

/**
 * Schema globalState — toàn bộ field của ứng dụng.
 * Không trực tiếp đọc/ghi object này từ bên ngoài module.
 * Dùng getState() / updateState() / updateStateBatch().
 */
const globalState = {
    // ---- Vai trò & Tháng ----
    role: 'FC',
    monthMode: '13+',

    // ---- FC / StarFC: Cá nhân ----
    fyp: 30000000,           // VND raw (doanh số cá nhân)
    fycRate: 30,             // % hoa hồng cá nhân (mặc định 30%)
    k2Bracket: '80+',        // Mức K2 đang chọn trong dropdown
    aitom: 'S',              // S, A, B, C, D

    // ---- FC: Thưởng quý ----
    hasQuarterBonus: false,
    fypQuarter: 0,           // FYP cá nhân quý (VND raw)
    quarterActiveMonths: 3,  // Số tháng hoạt động trong quý (1, 2, 3)

    // ---- StarFC specific ----
    starFcContracts: 3,      // Số hợp đồng tháng 1 (StarFC)
    starFcReferralFyp: 0,    // FYP từ ĐLBH được giới thiệu (M14-M19, VND raw)

    // ---- SL (GSL, SSL, ESL): Nhóm ----
    slAppointmentType: 'lateral', // 'lateral' | 'promotion'
    activeHeadcount: 5,           // Số lượt hoạt động nhóm TT (SL)
    fycTeamDirect: 100,           // FYP nhóm TT SL (triệu) — giữ key cũ
    fycRateSl: 30,                // % tỷ lệ FYC nhóm SL
    fycTeamIndirectL1: 0,         // FYP GT L1 SL (triệu)
    fycTeamIndirectL2: 0,         // FYP GT L2 SL (triệu)

    // ---- SL: Thưởng quý ----
    hasSlQuarterBonus: false,
    fypTeamQuarter: 0,                // FYP nhóm TT SL quý (VND raw)
    fycTeamIndirectL1Quarter: 0,      // FYP GT L1 SL quý (VND raw)
    fycTeamIndirectL2Quarter: 0,      // FYP GT L2 SL quý (VND raw)

    // ---- SM+ (SM, EM, ERM, IRM): Chỉ tiêu & Nhóm ----
    smTargetRevenue: 3200000000,    // Chỉ tiêu tháng (VND raw)
    smActualRevenue: 3200000000,    // Doanh số thực tế (VND raw)
    smTargetRatio: 100,             // % hoàn thành chỉ tiêu
    smTargetModeUnlocked: false,    // true = nhập thực tế trực tiếp

    activeHeadcountSm: 5,           // Số lượt hoạt động SM+
    fycRateSm: 30,                  // % tỷ lệ FYC nhóm SM+
    fypTeamDirectSm: 0,             // FYP nhóm TT SM+ (VND raw)
    fypIndirectSmL1: 0,             // FYP GT L1 SM+ (VND raw)
    fypIndirectSmL2: 0,             // FYP GT L2 SM+ (VND raw)
    fypIndirectSmL3: 0,             // FYP GT L3 SM+ (VND raw)

    // ---- SM+: Thưởng quý ----
    hasSmQuarterBonus: false,
    fypTeamQuarterSm: 0,            // FYP nhóm TT SM+ quý (VND raw)
    fypQuarterIndirectSmL1: 0,      // FYP GT L1 SM+ quý (VND raw)
    fypQuarterIndirectSmL2: 0,      // FYP GT L2 SM+ quý (VND raw)
    fypQuarterIndirectSmL3: 0,      // FYP GT L3 SM+ quý (VND raw)

    // ---- SL/SM+: Doanh số cá nhân kèm theo ----
    hasPersonalSales: false,

    // ---- Quyền lợi (FC) ----
    partner: 'none',    // 'none' | 'G' | 'S' | 'E' (Shinhan Partner)
    mdrt: false,        // Thưởng tiến độ MDRT

    // ---- UI state ----
    fypInputMode: 'slider',        // 'slider' | 'number'
    teamDirectInputMode: 'slider', // 'slider' | 'number'

    // ---- Eye toggle (YC7) ----
    hiddenKeys: new Set(),

    // ---- Extra bonuses (YC2) ----
    extraBonuses: [],  // [{ id, name, type: 'month'|'quarter', amountVND }]
};

// ---- Subscriber list ----
const subscribers = [];

/**
 * Đăng ký callback được gọi mỗi khi state thay đổi.
 * @param {Function} callback
 */
export function onStateChange(callback) {
    if (typeof callback === 'function') {
        subscribers.push(callback);
    }
}

/** Thông báo cho tất cả subscriber. Internal use only. */
function notifySubscribers() {
    subscribers.forEach(cb => cb(globalState));
}

/**
 * Đọc toàn bộ state.
 * @returns {Object}
 */
export function getState() {
    return globalState;
}

/**
 * Cập nhật một field đơn trong state, sau đó notify subscribers.
 * @param {string} key
 * @param {*} value
 */
export function updateState(key, value) {
    if (!(key in globalState)) {
        console.warn(`[state] Unknown key: "${key}". Allowed keys:`, Object.keys(globalState));
    }
    globalState[key] = value;
    notifySubscribers();
}

/**
 * Cập nhật nhiều field cùng lúc — chỉ notify 1 lần duy nhất.
 * @param {Object} patch - { key: value, ... }
 */
export function updateStateBatch(patch) {
    Object.entries(patch).forEach(([key, value]) => {
        if (!(key in globalState)) {
            console.warn(`[state] Unknown key: "${key}"`);
        }
        globalState[key] = value;
    });
    notifySubscribers();
}
