/* eslint-disable @next/next/no-img-element */
import {
  Anchor, Bird, Cat, Coffee, Crown, Dog, Fish, Flame, Gamepad2, Ghost, Heart, Leaf, Moon, Music,
  Pizza, Rabbit, Rocket, Skull, Snail, Squirrel, Star, Sun, Turtle, Zap, type LucideIcon,
} from "lucide-react";
import type { AvatarIcon } from "@/lib/avatars";
import type { AvatarStyle } from "@/server/game/types";

export const AVATAR_ICON_MAP: Record<AvatarIcon, LucideIcon> = {
  cat: Cat, dog: Dog, rabbit: Rabbit, bird: Bird, fish: Fish, turtle: Turtle, squirrel: Squirrel, snail: Snail,
  rocket: Rocket, ghost: Ghost, crown: Crown, flame: Flame, zap: Zap, star: Star, moon: Moon, sun: Sun,
  pizza: Pizza, coffee: Coffee, music: Music, gamepad: Gamepad2, anchor: Anchor, leaf: Leaf, skull: Skull, heart: Heart,
};

const HUES = ["#7aa2ff", "#3ddc97", "#ff6b5a", "#c792ff", "#ff9f43", "#4dd0e1", "#f06fb0", "#ffc83d"];

function hueFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

export function Avatar({
  name,
  image,
  avatar,
  seed,
  size = 32,
  dim = false,
}: {
  name: string;
  image?: string | null;
  avatar?: AvatarStyle | null;
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
  const color = avatar?.color ?? hueFor(seed ?? name);
  const Icon = avatar ? AVATAR_ICON_MAP[avatar.icon as AvatarIcon] : null;
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold ${dim ? "opacity-40 grayscale" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `color-mix(in oklab, ${color} 24%, var(--color-night))`,
        color,
        boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, ${color} 55%, transparent)`,
      }}
      aria-hidden="true"
    >
      {image ? (
        <img src={image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : Icon ? (
        <Icon style={{ width: size * 0.52, height: size * 0.52 }} strokeWidth={2.2} />
      ) : (
        initials
      )}
    </span>
  );
}
