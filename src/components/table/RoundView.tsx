"use client";

import { useEffect, useRef, useState } from "react";
import { Hand, Pause, PenLine, Play, RotateCcw, Shuffle, SkipForward, X } from "lucide-react";
import { BONUS_POOL } from "@/lib/bonus";
import { sfx } from "@/lib/client/sound";
import { pickLetter } from "@/server/game/scoring";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Tile } from "@/components/ui/Tile";
import { TimerRing } from "@/components/ui/TimerRing";
import type { TableGame } from "./store";

type Update = (fn: (g: TableGame) => TableGame | null) => void;

export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/** Bildschirm bleibt an, solange der Timer läuft */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = () =>
      navigator.wakeLock
        .request("screen")
        .then((l) => {
          if (cancelled) void l.release();
          else lock = l;
        })
        .catch(() => {});
    acquire();
    const onVis = () => document.visibilityState === "visible" && acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
    };
  }, [active]);
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* nicht unterstützt */
  }
}

function drawCard(g: TableGame): { letter: string; bonus: string | null } {
  const used = g.rounds.map((r) => r.letter);
  const letter = pickLetter(g.settings.excludedLetters, used);
  let bonus: string | null = null;
  if (g.settings.bonusCategory) {
    const usedBonus = new Set(g.rounds.map((r) => r.bonus));
    const pool = BONUS_POOL.filter((c) => !g.settings.categories.includes(c) && !usedBonus.has(c));
    if (pool.length) bonus = pool[Math.floor(Math.random() * pool.length)];
  }
  return { letter, bonus };
}

export function RoundView({ game, update }: { game: TableGame; update: Update }) {
  const { phase, settings } = game;
  const ticking = phase === "running" || phase === "grace";
  const now = useNow(ticking);
  useWakeLock(ticking);
  const [flipKey, setFlipKey] = useState(0);
  const lastTick = useRef<number | null>(null);

  const left = game.endsAt ? Math.max(0, Math.ceil((game.endsAt - now) / 1000)) : 0;
  const current = game.rounds.at(-1);
  const letter = phase === "draw" ? game.pending?.letter : current?.letter;
  const bonus = phase === "draw" ? game.pending?.bonus : current?.bonus;
  const roundNo = phase === "draw" ? game.rounds.length + 1 : game.rounds.length;
  const deckLeft = Math.max(0, 26 - settings.excludedLetters.length - game.rounds.length);

  // Ablauf der Zeit
  useEffect(() => {
    if (!ticking || !game.endsAt) return;
    if (left > 0 && left <= 10 && lastTick.current !== left) {
      lastTick.current = left;
      sfx.tick(left <= 5 || phase === "grace");
      if (left <= 3) vibrate(40);
    }
    if (left === 0) {
      sfx.stop();
      vibrate([300, 120, 300, 120, 500]);
      update((g) => ({ ...g, phase: "timeup", endsAt: null }));
    }
  }, [left, ticking, game.endsAt, phase, update]);

  const draw = () => {
    sfx.reveal();
    vibrate(30);
    setFlipKey((k) => k + 1);
    update((g) => ({ ...g, pending: drawCard(g) }));
  };

  const start = () => {
    sfx.start();
    vibrate(60);
    lastTick.current = null;
    update((g) =>
      g.pending
        ? {
            ...g,
            phase: "running",
            endsAt: Date.now() + g.settings.roundTime * 1000,
            rounds: [...g.rounds, { letter: g.pending.letter, bonus: g.pending.bonus, points: Object.fromEntries(g.players.map((p) => [p.id, null])) }],
            pending: null,
          }
        : g,
    );
  };

  const stop = () => {
    sfx.stop();
    vibrate([80, 60, 80]);
    update((g) => {
      const graceEnd = Date.now() + g.settings.stopGrace * 1000;
      if (g.settings.stopGrace === 0) return { ...g, phase: "timeup", endsAt: null };
      return { ...g, phase: "grace", endsAt: Math.min(g.endsAt ?? graceEnd, graceEnd) };
    });
  };

  const pause = () => update((g) => ({ ...g, phase: "paused", pausedLeft: Math.max(0, (g.endsAt ?? 0) - Date.now()), endsAt: null }));
  const resume = () => update((g) => ({ ...g, phase: "running", endsAt: Date.now() + (g.pausedLeft ?? 0), pausedLeft: null }));
  const abortRound = () =>
    update((g) => ({ ...g, phase: "draw", endsAt: null, pausedLeft: null, rounds: g.rounds.slice(0, -1), pending: g.rounds.at(-1) ? { letter: g.rounds.at(-1)!.letter, bonus: g.rounds.at(-1)!.bonus } : null }));
  const toScoring = () =>
    update((g) => {
      if (g.players.length > 0) return { ...g, phase: "scoring" };
      const done = g.settings.rounds > 0 && g.rounds.length >= g.settings.rounds;
      return { ...g, phase: done ? "finished" : "draw" };
    });

  // ---------- Ziehen ----------
  if (phase === "draw") {
    return (
      <div className="flex flex-col items-center gap-6 pb-28 pt-2 text-center">
        <p className="text-sm text-haze">
          Runde {roundNo}
          {settings.rounds > 0 && ` von ${settings.rounds}`} – noch {deckLeft} {deckLeft === 1 ? "Karte" : "Karten"} im Stapel
        </p>

        <button
          onClick={draw}
          className="group relative h-64 w-48 [perspective:900px]"
          aria-label={letter ? "Neu ziehen" : "Buchstaben ziehen"}
        >
          {letter ? (
            <span key={flipKey} className="animate-card-flip absolute inset-0 flex items-center justify-center rounded-2xl bg-tile font-display text-[7.5rem] font-semibold leading-none text-tile-ink">
              {letter}
            </span>
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-rim-2 bg-night-2 transition group-active:scale-[0.98]">
              <span className="font-display text-5xl font-semibold text-dim">?</span>
              <span className="text-sm font-medium text-haze">Tippen zum Ziehen</span>
            </span>
          )}
        </button>

        {bonus && (
          <p className="flex items-center gap-2 rounded-full border border-rim px-4 py-2 text-sm">
            <Shuffle className="h-4 w-4" /> Bonuskategorie: <b>{bonus}</b>
          </p>
        )}

        {game.rounds.length > 0 && (
          <div className="flex max-w-xs flex-wrap justify-center gap-1.5" aria-label="Schon gespielt">
            {game.rounds.map((r, i) => (
              <Tile key={i} size="xs" className="!bg-rim-2 !text-haze">{r.letter}</Tile>
            ))}
          </div>
        )}

        <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-rim bg-night/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-xl gap-2">
            {letter ? (
              <>
                <button className="btn-secondary py-3.5" onClick={draw} aria-label="Neu ziehen" title="Neu ziehen">
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button className="btn-primary flex-1 py-3.5 text-base" onClick={start}>
                  <Play className="h-5 w-5 fill-current" /> Timer starten
                </button>
              </>
            ) : (
              <button className="btn-primary flex-1 py-3.5 text-base" onClick={draw} disabled={deckLeft === 0}>
                Buchstaben ziehen
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Zeit um ----------
  if (phase === "timeup") {
    return (
      <div className="animate-pop flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-stop text-white">
          <PenLine className="h-11 w-11" />
        </span>
        <h1 className="font-display text-5xl font-semibold">Stifte weg!</h1>
        <p className="text-haze">
          Runde {roundNo} mit <b className="text-chalk">{letter}</b> ist vorbei.
        </p>
        <button className="btn-primary mt-4 px-8 py-3.5 text-base" onClick={toScoring}>
          {game.players.length > 0 ? "Punkte eintragen" : "Nächste Runde"}
        </button>
      </div>
    );
  }

  // ---------- Läuft / Pause / Restzeit ----------
  const total = phase === "grace" ? settings.stopGrace : settings.roundTime;
  const shownLeft = phase === "paused" ? Math.ceil((game.pausedLeft ?? 0) / 1000) : left;
  const cats = [...settings.categories, ...(bonus ? [bonus] : [])];

  return (
    <div className="space-y-5 pb-28">
      <div className={`flex items-center gap-4 rounded-2xl border p-4 ${phase === "grace" ? "border-stop/60 bg-stop/10" : "border-rim bg-deck"}`}>
        <Tile size="lg" className="max-sm:h-24 max-sm:w-24 max-sm:text-6xl">{letter}</Tile>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-haze">
            Runde {roundNo}
            {settings.rounds > 0 && ` von ${settings.rounds}`}
          </p>
          <p className={`font-display text-xl font-semibold ${phase === "grace" ? "text-stop" : ""}`}>
            {phase === "grace" ? "Stopp! Letzte Sekunden" : phase === "paused" ? "Pausiert" : "Schreibt los"}
          </p>
        </div>
      </div>

      <div className="flex justify-center py-2">
        <TimerRing left={shownLeft} total={total} size={220} />
      </div>

      <ul className="grid grid-cols-2 gap-2">
        {cats.map((c, i) => (
          <li key={c} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${i >= settings.categories.length ? "border-chalk/60" : "border-rim"}`}>
            <CategoryIcon name={c} className="h-4 w-4 shrink-0 text-haze" />
            <span className="truncate font-medium">{c}</span>
            {i >= settings.categories.length && <Shuffle className="ml-auto h-3.5 w-3.5 shrink-0 text-haze" aria-label="Bonus" />}
          </li>
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rim bg-night/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-xl gap-2">
          {phase === "paused" ? (
            <>
              <button className="btn-secondary py-3.5" onClick={abortRound} title="Runde abbrechen, Buchstabe bleibt" aria-label="Runde abbrechen">
                <X className="h-5 w-5" />
              </button>
              <button className="btn-primary flex-1 py-3.5 text-base" onClick={resume}>
                <Play className="h-5 w-5 fill-current" /> Weiter
              </button>
            </>
          ) : phase === "running" ? (
            <>
              <button className="btn-secondary py-3.5" onClick={pause} aria-label="Pause">
                <Pause className="h-5 w-5" />
              </button>
              <button className="btn-danger flex-1 py-3.5 text-base" onClick={stop}>
                <Hand className="h-5 w-5" /> Stopp
              </button>
            </>
          ) : (
            <button className="btn-secondary flex-1 py-3.5 text-base" onClick={() => update((g) => ({ ...g, phase: "timeup", endsAt: null }))}>
              <SkipForward className="h-5 w-5" /> Sofort beenden
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
