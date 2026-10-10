"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Hand as HandIcon, Minus, Pause, Play, RotateCcw, Trophy, Undo2 } from "lucide-react";
import { sfx } from "@/lib/client/sound";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { TimerRing } from "@/components/ui/TimerRing";
import { useNow, useWakeLock, vibrate } from "../RoundView";
import { allDone, drawCategory, removeCards, undoLast, type CardsGame, type CardsPlayer } from "./store";

type Update = (fn: (g: CardsGame) => CardsGame | null) => void;

export function placeOf(g: CardsGame, p: CardsPlayer): number | null {
  if (p.finishedRound === null) return null;
  if (g.settings.check === "live") return p.finishedOrder;
  return 1 + g.players.filter((x) => x.finishedRound !== null && x.finishedRound < p.finishedRound!).length;
}

/** Nach jeder Änderung prüfen, ob alle fertig sind */
function finishIfDone(g: CardsGame): CardsGame {
  return allDone(g) ? { ...g, phase: "finished", endsAt: null, pausedLeft: null } : g;
}

function PlayerHand({
  game,
  player,
  interactive,
  selected,
  onTapLetter,
  onRemoveOne,
  onUndo,
}: {
  game: CardsGame;
  player: CardsPlayer;
  interactive: boolean;
  selected?: string[] | number;
  onTapLetter?: (l: string) => void;
  onRemoveOne?: () => void;
  onUndo?: () => void;
}) {
  const place = placeOf(game, player);
  const removedNow = game.rounds.at(-1)?.removed[player.id];
  const hasRemoved = Array.isArray(removedNow) ? removedNow.length > 0 : typeof removedNow === "number" && removedNow > 0;

  return (
    <li className={`rounded-xl border p-3 ${place ? "border-rim bg-night-2" : "border-rim-2"}`}>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-semibold">{player.name}</span>
        {place ? (
          <span className="flex items-center gap-1 rounded-full bg-chalk px-2.5 py-0.5 text-xs font-semibold text-night">
            <Trophy className="h-3 w-3" /> Platz {place}
          </span>
        ) : (
          <span className="text-sm text-dim tabular-nums">
            {player.count} {player.count === 1 ? "Karte" : "Karten"}
          </span>
        )}
        {onUndo && hasRemoved && (
          <button className="icon-btn h-8 w-8" onClick={onUndo} aria-label={`Letzte Karte von ${player.name} zurücknehmen`} title="Rückgängig">
            <Undo2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {!place && game.settings.dealt && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {player.letters.map((l) => {
            const marked = Array.isArray(selected) && selected.includes(l);
            return (
              <button
                key={l}
                disabled={!interactive}
                onClick={() => onTapLetter?.(l)}
                aria-pressed={marked}
                aria-label={`Buchstabe ${l}${marked ? ", abgelegt" : ""}`}
                className={`flex h-14 w-12 items-center justify-center rounded-lg font-display text-2xl font-semibold transition active:scale-95 ${
                  marked ? "border-2 border-dashed border-rim-2 text-dim line-through" : "bg-tile text-tile-ink"
                } disabled:active:scale-100`}
              >
                {l}
              </button>
            );
          })}
        </div>
      )}

      {!place && !game.settings.dealt && interactive && (
        <div className="mt-2.5 flex items-center gap-3">
          {typeof selected === "number" && (
            <span className="text-sm text-haze">
              {selected} {selected === 1 ? "Karte" : "Karten"} ablegen
            </span>
          )}
          <button className="btn-secondary ml-auto py-2" onClick={onRemoveOne} disabled={typeof selected === "number" && selected >= player.count}>
            <Minus className="h-4 w-4" /> Karte ablegen
          </button>
        </div>
      )}
    </li>
  );
}

export function CardsPlay({ game, update }: { game: CardsGame; update: Update }) {
  const { phase, settings } = game;
  const ticking = phase === "running";
  const now = useNow(ticking);
  useWakeLock(ticking);
  const lastTick = useRef<number | null>(null);
  const [flipKey, setFlipKey] = useState(0);
  // Auswahl in der Prüfphase (Modus "nach der Zeit")
  const [sel, setSel] = useState<Record<string, string[] | number>>({});

  const left = game.endsAt ? Math.max(0, Math.ceil((game.endsAt - now) / 1000)) : 0;
  const round = game.rounds.at(-1);
  const category = phase === "category" ? game.pendingCategory : round?.category;
  const active = game.players.filter((p) => p.finishedRound === null);
  const done = game.players.filter((p) => p.finishedRound !== null);
  const live = settings.check === "live";

  useEffect(() => {
    if (!ticking || !game.endsAt) return;
    if (left > 0 && left <= 10 && lastTick.current !== left) {
      lastTick.current = left;
      sfx.tick(left <= 5);
      if (left <= 3) vibrate(40);
    }
    if (left === 0) {
      sfx.stop();
      vibrate([300, 120, 300, 120, 500]);
      setSel({});
      update((g) => ({ ...g, phase: "check", endsAt: null }));
    }
  }, [left, ticking, game.endsAt, update]);

  const draw = () => {
    sfx.reveal();
    vibrate(30);
    setFlipKey((k) => k + 1);
    update((g) => ({ ...g, pendingCategory: drawCategory(g) }));
  };

  const start = () => {
    sfx.start();
    vibrate(60);
    lastTick.current = null;
    update((g) =>
      g.pendingCategory
        ? {
            ...g,
            phase: "running",
            endsAt: Date.now() + g.settings.roundTime * 1000,
            rounds: [...g.rounds, { category: g.pendingCategory, removed: {} }],
            usedCategories: [...g.usedCategories, g.pendingCategory],
            pendingCategory: null,
          }
        : g,
    );
  };

  const liveRemove = (p: CardsPlayer, what: string[] | number) => {
    sfx.pop();
    vibrate(25);
    update((g) => {
      const next = removeCards(g, p.id, what);
      const nowDone = next.players.find((x) => x.id === p.id)!.finishedRound !== null;
      if (nowDone) {
        sfx.reveal();
        vibrate([60, 40, 60, 40, 120]);
      }
      if (allDone(next)) sfx.win();
      return finishIfDone(next);
    });
  };

  const applyCheck = () => {
    update((g) => {
      let next = g;
      for (const [pid, what] of Object.entries(sel)) {
        if ((Array.isArray(what) && what.length) || (typeof what === "number" && what > 0)) next = removeCards(next, pid, what);
      }
      if (allDone(next)) sfx.win();
      return allDone(next) ? finishIfDone(next) : { ...next, phase: "category" };
    });
    setSel({});
  };

  // ---------- Kategorie ziehen ----------
  if (phase === "category") {
    return (
      <div className="flex flex-col items-center gap-5 pb-28 text-center">
        <p className="text-sm text-haze">
          Runde {game.rounds.length + 1} – noch {active.length} von {game.players.length} im Spiel
        </p>
        <button onClick={draw} className="group relative h-48 w-full max-w-xs [perspective:900px]" aria-label={category ? "Neue Kategorie ziehen" : "Kategorie ziehen"}>
          {category ? (
            <span key={flipKey} className="animate-card-flip absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-tile px-4 text-tile-ink">
              <CategoryIcon name={category} className="h-9 w-9" />
              <span className="font-display text-4xl font-semibold leading-tight">{category}</span>
            </span>
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rim-2 bg-night-2">
              <span className="font-display text-4xl font-semibold text-dim">?</span>
              <span className="text-sm font-medium text-haze">Tippen für die Kategorie</span>
            </span>
          )}
        </button>

        <ul className="w-full space-y-2 text-left">
          {active.map((p) => (
            <PlayerHand key={p.id} game={game} player={p} interactive={false} />
          ))}
          {done.length > 0 && (
            <li className="pt-1 text-sm text-dim">
              Fertig: {done
                .sort((a, b) => (placeOf(game, a) ?? 0) - (placeOf(game, b) ?? 0))
                .map((p) => `${p.name} (${placeOf(game, p)}.)`)
                .join(", ")}
            </li>
          )}
        </ul>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rim bg-night/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-xl gap-2">
            {category ? (
              <>
                <button className="btn-secondary py-3.5" onClick={draw} aria-label="Neue Kategorie ziehen" title="Neue Kategorie ziehen">
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button className="btn-primary flex-1 py-3.5 text-base" onClick={start}>
                  <Play className="h-5 w-5 fill-current" /> Timer starten
                </button>
              </>
            ) : (
              <button className="btn-primary flex-1 py-3.5 text-base" onClick={draw}>
                Kategorie ziehen
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Prüfen nach Ablauf ----------
  if (phase === "check") {
    return (
      <div className="space-y-4 pb-28">
        <div className="flex items-center gap-3 rounded-2xl border border-stop/60 bg-stop/10 p-4">
          <HandIcon className="h-7 w-7 shrink-0 text-stop" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold">Zeit um!</h1>
            <p className="text-sm text-haze">
              Kategorie <b className="text-chalk">{category}</b> –{" "}
              {live ? "noch etwas vergessen? Hier nachtragen oder zurücknehmen." : "tippt an, welche Karten abgelegt werden dürfen."}
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {active.map((p) =>
            live ? (
              <PlayerHand
                key={p.id}
                game={game}
                player={p}
                interactive
                onTapLetter={(l) => liveRemove(p, [l])}
                onRemoveOne={() => liveRemove(p, 1)}
                onUndo={() => update((g) => undoLast(g, p.id))}
              />
            ) : (
              <PlayerHand
                key={p.id}
                game={game}
                player={p}
                interactive
                selected={sel[p.id] ?? (settings.dealt ? [] : 0)}
                onTapLetter={(l) =>
                  setSel((s) => {
                    const cur = (s[p.id] as string[] | undefined) ?? [];
                    return { ...s, [p.id]: cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l] };
                  })
                }
                onRemoveOne={() => setSel((s) => ({ ...s, [p.id]: Math.min(p.count, ((s[p.id] as number) ?? 0) + 1) }))}
                onUndo={undefined}
              />
            ),
          )}
          {!live &&
            !settings.dealt &&
            Object.values(sel).some((v) => typeof v === "number" && v > 0) && (
              <li>
                <button className="btn-quiet text-sm" onClick={() => setSel({})}>
                  <Undo2 className="h-4 w-4" /> Auswahl zurücksetzen
                </button>
              </li>
            )}
        </ul>
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rim bg-night/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
          <button
            className="btn-primary mx-auto flex w-full max-w-xl py-3.5 text-base"
            onClick={live ? () => update((g) => finishIfDone({ ...g, phase: "category" })) : applyCheck}
          >
            <Check className="h-5 w-5" /> {live ? "Nächste Kategorie" : "Übernehmen"}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Läuft / Pause ----------
  const shownLeft = phase === "paused" ? Math.ceil((game.pausedLeft ?? 0) / 1000) : left;
  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-4 rounded-2xl border border-rim bg-deck p-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-tile text-tile-ink">
          <CategoryIcon name={category ?? ""} className="h-8 w-8" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-haze">Runde {game.rounds.length}</p>
          <p className="truncate font-display text-2xl font-semibold">{category}</p>
        </div>
        <TimerRing left={shownLeft} total={settings.roundTime} size={84} />
      </div>

      {live ? (
        <p className="text-sm text-haze">Wer ein Wort ruft, tippt seinen Buchstaben weg.</p>
      ) : (
        <p className="text-sm text-haze">Jeder sucht Wörter zu seinen Buchstaben. Geprüft wird nach Ablauf der Zeit.</p>
      )}

      <ul className="space-y-2">
        {active.map((p) => (
          <PlayerHand
            key={p.id}
            game={game}
            player={p}
            interactive={live && phase === "running"}
            onTapLetter={(l) => liveRemove(p, [l])}
            onRemoveOne={() => liveRemove(p, 1)}
            onUndo={live ? () => update((g) => undoLast(g, p.id)) : undefined}
          />
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rim bg-night/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-xl gap-2">
          {phase === "paused" ? (
            <button
              className="btn-primary flex-1 py-3.5 text-base"
              onClick={() => update((g) => ({ ...g, phase: "running", endsAt: Date.now() + (g.pausedLeft ?? 0), pausedLeft: null }))}
            >
              <Play className="h-5 w-5 fill-current" /> Weiter
            </button>
          ) : (
            <>
              <button
                className="btn-secondary py-3.5"
                aria-label="Pause"
                onClick={() => update((g) => ({ ...g, phase: "paused", pausedLeft: Math.max(0, (g.endsAt ?? 0) - Date.now()), endsAt: null }))}
              >
                <Pause className="h-5 w-5" />
              </button>
              <button
                className="btn-secondary flex-1 py-3.5"
                onClick={() => {
                  sfx.stop();
                  setSel({});
                  update((g) => ({ ...g, phase: "check", endsAt: null }));
                }}
              >
                Zeit vorzeitig beenden
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
