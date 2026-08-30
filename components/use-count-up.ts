'use client';

import { useEffect, useRef, useState } from 'react';

function easeOut(t: number) { return 1 - (1 - t) ** 3; }

export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(target); prevTarget.current = target; return undefined; }
    const start = prevTarget.current;
    if (start === target) return undefined;
    const startTime = performance.now();
    let raf: number;
    function tick(now: number) {
      const progress = Math.min(1, (now - startTime) / duration);
      setValue(Math.round(start + (target - start) * easeOut(progress)));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else prevTarget.current = target;
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
