import { useMemo } from 'react';
import { useCalculatorState } from '../context/CalculatorContext.jsx';
import { calculateVisibleTotal } from '../logic/calculator.js';

export function useCalculator() {
  const state = useCalculatorState();
  
  return useMemo(() => {
    return calculateVisibleTotal(state);
  }, [state]);
}
