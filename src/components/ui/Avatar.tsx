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

const HUES = ["#ededed", "#a1a1a1", "#d4d4d4", "#8f8f8f"];

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
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-semibold ${dim ? "opacity-40 grayscale" : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: avatar ? `color-mix(in oklab, ${color} 16%, var(--color-night-2))` : "var(--color-night-2)",
        color: avatar ? color : "var(--color-haze)",
        boxShadow: "inset 0 0 0 1px var(--color-rim-2)",
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
