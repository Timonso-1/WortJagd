import type { CSSProperties } from "react";

const SIZES = {
  xs: "h-7 w-7 text-base rounded-lg",
  sm: "h-10 w-10 text-xl",
  md: "h-16 w-16 text-4xl",
  lg: "h-28 w-28 text-7xl",
  xl: "h-36 w-36 text-8xl",
} as const;

export function Tile({
  children,
  size = "md",
  className = "",
  style,
}: {
  children: React.ReactNode;
  size?: keyof typeof SIZES;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`tile select-none ${SIZES[size]} ${className}`} style={style}>
      {children}
    </span>
  );
}

/** Raumcode als Reihe kleiner Spielsteine */
export function CodeTiles({ code, size = "sm" }: { code: string; size?: "xs" | "sm" }) {
  return (
    <span className="inline-flex gap-1.5" aria-label={`Raumcode ${code}`}>
      {code.split("").map((c, i) => (
        <Tile key={i} size={size} className={i % 2 ? "rotate-2" : "-rotate-2"}>
          {c}
        </Tile>
      ))}
    </span>
  );
}
