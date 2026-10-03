/* eslint-disable @next/next/no-img-element */
const HUES = ["#7aa2ff", "#3ddc97", "#ff6b5a", "#c792ff", "#ff9f43", "#4dd0e1", "#f06fb0", "#ffc83d"];

function hueFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

export function Avatar({
  name,
  image,
  seed,
  size = 32,
  dim = false,
}: {
  name: string;
  image?: string | null;
  seed?: string;
  size?: number;
  dim?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const color = hueFor(seed ?? name);
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold ${dim ? "opacity-40 grayscale" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `color-mix(in oklab, ${color} 22%, #121735)`,
        color,
        boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, ${color} 55%, transparent)`,
      }}
      aria-hidden="true"
    >
      {image ? <img src={image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initials}
    </span>
  );
}
