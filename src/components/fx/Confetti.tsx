"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#ffc83d", "#ff6b5a", "#3ddc97", "#7aa2ff", "#c792ff", "#ffffff"];

/** Einmaliger Konfetti-Regen, respektiert reduzierte Bewegung */
export function Confetti({ pieces = 160 }: { pieces?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    const W = () => canvas.width;
    const parts = Array.from({ length: pieces }, () => ({
      x: Math.random() * W(),
      y: -Math.random() * canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 4 * dpr,
      vy: (2 + Math.random() * 4) * dpr,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      w: (6 + Math.random() * 6) * dpr,
      h: (8 + Math.random() * 8) * dpr,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    let frame = 0;
    let raf = 0;
    const loop = () => {
      frame++;
      c.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05 * dpr;
        p.r += p.vr;
        if (p.y < canvas.height + 20) alive++;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.r);
        c.fillStyle = p.color;
        c.globalAlpha = Math.max(0, 1 - frame / 360);
        c.fillRect(-p.w / 2, -p.h / 2, p.w, Math.abs(Math.cos(p.r * 2)) * p.h);
        c.restore();
      }
      if (alive > 0 && frame < 360) raf = requestAnimationFrame(loop);
      else c.clearRect(0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [pieces]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-50 h-full w-full" aria-hidden="true" />;
}
