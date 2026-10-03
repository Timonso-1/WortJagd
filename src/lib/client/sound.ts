"use client";

import { isMuted } from "./prefs";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || isMuted()) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = "sine", gain = 0.15) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Kurze Klänge, alles synthetisch – keine Audiodateien nötig */
export const sfx = {
  tick(urgent = false) {
    tone(urgent ? 1200 : 900, 0, 0.06, "square", 0.05);
  },
  countdown() {
    tone(660, 0, 0.12, "triangle", 0.12);
  },
  start() {
    tone(523, 0, 0.12, "triangle");
    tone(784, 0.1, 0.25, "triangle");
  },
  stop() {
    tone(440, 0, 0.12, "sawtooth", 0.08);
    tone(330, 0.12, 0.25, "sawtooth", 0.08);
  },
  pop() {
    tone(880, 0, 0.05, "sine", 0.08);
  },
  reveal() {
    tone(392, 0, 0.1, "triangle", 0.1);
    tone(523, 0.08, 0.1, "triangle", 0.1);
    tone(659, 0.16, 0.2, "triangle", 0.1);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3, "triangle", 0.12));
    tone(1047, 0.5, 0.6, "sine", 0.1);
  },
};
