export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wj-tile" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ffd96b" />
          <stop offset="0.5" stopColor="#ffc83d" />
          <stop offset="1" stopColor="#e2a514" />
        </linearGradient>
      </defs>
      <rect x="3" y="6" width="34" height="32" rx="8" fill="#9a6d00" />
      <rect x="3" y="3" width="34" height="32" rx="8" fill="url(#wj-tile)" />
      <rect x="5" y="4.5" width="30" height="2" rx="1" fill="#fff" opacity="0.45" />
      <polyline
        points="10.5,12 15,27 20,16.5 25,27 29.5,12"
        fill="none"
        stroke="#2a1d00"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="34.5" cy="5.5" r="4.5" fill="#ff6b5a" stroke="#121735" strokeWidth="2" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[1.375rem] font-extrabold tracking-tight text-chalk">wortjagd</span>
    </span>
  );
}
