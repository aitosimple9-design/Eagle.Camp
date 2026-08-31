import { useState, useEffect, useRef } from 'react';

export function useAnimatedNumber(targetMil, duration = 280) {
  const [currentDisplayed, setCurrentDisplayed] = useState(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const start = currentDisplayed;
    const end = targetMil;
    const startTs = performance.now();

    function step(ts) {
      const elapsed = ts - startTs;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = start + (end - start) * eased;
      
      setCurrentDisplayed(current);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setCurrentDisplayed(end);
      }
    }

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetMil, duration]);

  return currentDisplayed;
}
