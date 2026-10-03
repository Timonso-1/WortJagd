"use client";

import { useEffect, useState } from "react";

/** Restzeit in Sekunden bis `target` (Serverzeit), korrigiert um Offset */
export function useCountdown(target: number, offset: number): number {
  const calc = () => Math.max(0, Math.ceil((target - (Date.now() + offset)) / 1000));
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    const id = setInterval(() => setLeft(calc()), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, offset]);
  return left;
}
