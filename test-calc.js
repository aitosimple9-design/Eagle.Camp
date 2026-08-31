import { calculateIncome } from './src/logic/calculator.js';

const mockState = {
  role: 'FC', monthMode: '1',
  fyp: 20000000, fycRate: 35, k2Bracket: 'M', aitom: 'A',
  hasQuarterBonus: false, fypQuarter: 0, quarterActiveMonths: 0,
  starFcContracts: 0, starFcReferralFyp: 0,
  extraBonuses: []
};

const result = calculateIncome(mockState, 100);
console.log('Result:', result.total);
