export function TimerRing({ left, total, size = 96 }: { left: number; total: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const urgent = left <= 10;
  const color = urgent ? "var(--color-stop)" : "var(--color-chalk)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="timer" aria-live="off" aria-label={`${left} Sekunden übrig`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-rim)" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset 300ms linear, stroke 300ms" }}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-mono text-xl font-medium tabular-nums ${urgent ? "text-stop" : "text-chalk"}`}
      >
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </span>
    </div>
  );
}
