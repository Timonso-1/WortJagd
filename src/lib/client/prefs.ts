"use client";

import { AVATAR_COLORS, AVATAR_ICONS } from "@/lib/avatars";
import type { AvatarStyle } from "@/server/game/types";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Speicher nicht verfügbar */
  }
}

export function getAvatar(): AvatarStyle | null {
  try {
    const v = JSON.parse(read("wj.avatar") ?? "null");
    if (v && AVATAR_COLORS.includes(v.color) && AVATAR_ICONS.includes(v.icon)) return v;
  } catch {
    /* ungültig */
  }
  return null;
}

export function setAvatar(a: AvatarStyle) {
  write("wj.avatar", JSON.stringify(a));
}

export function isMuted(): boolean {
  return read("wj.muted") === "1";
}

export function setMuted(m: boolean) {
  write("wj.muted", m ? "1" : "0");
}

export type Theme = "dark" | "light";

export function getTheme(): Theme {
  const t = read("wj.theme");
  if (t === "light" || t === "dark") return t;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(t: Theme) {
  write("wj.theme", t);
  document.documentElement.dataset.theme = t;
}
