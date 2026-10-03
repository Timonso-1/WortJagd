"use client";

import { useEffect, useState } from "react";

/** Zählt von 0 auf `target` hoch */
export function useCountUp(target: number, ms = 900, delay = 0): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / ms));
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, delay]);
  return v;
}

export function CountUp({ value, delay = 0, prefix = "" }: { value: number; delay?: number; prefix?: string }) {
  const v = useCountUp(value, 900, delay);
  return (
    <>
      {prefix}
      {v}
    </>
  );
}
