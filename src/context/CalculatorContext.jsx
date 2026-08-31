import React, { createContext, useReducer, useContext } from 'react';

const initialState = {
  // ---- Vai trò & Tháng ----
  role: 'FC',
  monthMode: '13+',

  // ---- FC / StarFC: Cá nhân ----
  fyp: 25000000,
  fycRate: 25,
  k2Bracket: '80+',
  aitom: 'A',

  // ---- FC: Thưởng quý ----
  hasQuarterBonus: false,
  fypQuarter: 0,
  quarterActiveMonths: 3,

  // ---- StarFC specific ----
  starFcContracts: 3,
  starFcReferralFyp: 0,

  // ---- SL (GSL, SSL, ESL): Nhóm ----
  slAppointmentType: 'lateral',
  activeHeadcount: 5,
  fycTeamDirect: 100,
  fycRateSl: 25,
  fycTeamIndirectL1: 0,
  fycTeamIndirectL2: 0,

  // ---- SL: Thưởng quý ----
  hasSlQuarterBonus: false,
  fypTeamQuarter: 0,
  fycTeamIndirectL1Quarter: 0,
  fycTeamIndirectL2Quarter: 0,

  // ---- SM+ (SM, EM, ERM, IRM): Chỉ tiêu & Nhóm ----
  smTargetRevenue: 3200000000,
  smActualRevenue: 3200000000,
  smTargetRatio: 100,
  smTargetModeUnlocked: false,

  activeHeadcountSm: 5,
  fycRateSm: 25,
  fypTeamDirectSm: 0,
  fypIndirectSmL1: 0,
  fypIndirectSmL2: 0,
  fypIndirectSmL3: 0,

  // ---- SM+: Thưởng quý ----
  hasSmQuarterBonus: false,
  fypTeamQuarterSm: 0,
  fypQuarterIndirectSmL1: 0,
  fypQuarterIndirectSmL2: 0,
  fypQuarterIndirectSmL3: 0,

  // ---- SL/SM+: Doanh số cá nhân kèm theo ----
  hasPersonalSales: false,

  // ---- Quyền lợi (FC) ----
  partner: 'none',
  mdrt: false,

  // ---- UI state ----
  fypInputMode: 'slider',
  teamDirectInputMode: 'slider',

  // ---- Eye toggle (YC7) ----
  // Constraint #6: changed from Set to Array
  hiddenKeys: [],

  // ---- Extra bonuses (YC2) ----
  extraBonuses: [],
};

const CalculatorContext = createContext(null);
const CalculatorDispatchContext = createContext(null);

function calculatorReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_STATE': {
      return { ...state, [action.payload.key]: action.payload.value };
    }
    case 'UPDATE_STATE_BATCH': {
      return { ...state, ...action.payload };
    }
    case 'TOGGLE_HIDDEN_KEY': {
      const key = action.payload;
      const isHidden = state.hiddenKeys.includes(key);
      if (isHidden) {
        return { ...state, hiddenKeys: state.hiddenKeys.filter(k => k !== key) };
      } else {
        return { ...state, hiddenKeys: [...state.hiddenKeys, key] };
      }
    }
    case 'DELETE_HIDDEN_KEY': {
      const key = action.payload;
      return { ...state, hiddenKeys: state.hiddenKeys.filter(k => k !== key) };
    }
    default:
      return state;
  }
}

export function CalculatorProvider({ children }) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);

  return (
    <CalculatorContext.Provider value={state}>
      <CalculatorDispatchContext.Provider value={dispatch}>
        {children}
      </CalculatorDispatchContext.Provider>
    </CalculatorContext.Provider>
  );
}

export function useCalculatorState() {
  const context = useContext(CalculatorContext);
  if (context === null) {
    throw new Error('useCalculatorState must be used within a CalculatorProvider');
  }
  return context;
}

export function useCalculatorDispatch() {
  const context = useContext(CalculatorDispatchContext);
  if (context === null) {
    throw new Error('useCalculatorDispatch must be used within a CalculatorProvider');
  }
  return context;
}
