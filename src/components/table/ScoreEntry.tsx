"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { Tile } from "@/components/ui/Tile";
import { totals, type TableGame } from "./store";

type Update = (fn: (g: TableGame) => TableGame | null) => void;

const QUICK = [5, 10, 20];

export function ScoreEntry({
  game,
  update,
  roundIndex,
  onDone,
}: {
  game: TableGame;
  update: Update;
  /** Runde zum Bearbeiten; ohne Angabe die aktuelle */
  roundIndex?: number;
  onDone?: () => void;
}) {
  const idx = roundIndex ?? game.rounds.length - 1;
  const editing = roundIndex !== undefined;
  const round = game.rounds[idx];
  const [points, setPoints] = useState<Record<string, number>>(() =>
    Object.fromEntries(game.players.map((p) => [p.id, round.points[p.id] ?? 0])),
  );
  const before = totals({ players: game.players, rounds: game.rounds.filter((_, i) => i !== idx) });
  const last = !editing && game.settings.rounds > 0 && game.rounds.length >= game.settings.rounds;

  const set = (id: string, v: number) => setPoints((p) => ({ ...p, [id]: Math.max(0, Math.min(999, v)) }));

  const save = () => {
    update((g) => {
      const rounds = g.rounds.slice();
      rounds[idx] = { ...rounds[idx], points: { ...points } };
      return { ...g, rounds, phase: editing ? g.phase : last ? "finished" : "draw" };
    });
    onDone?.();
  };

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-4">
        <Tile size="md">{round.letter}</Tile>
        <div>
          <h1 className="font-display text-2xl font-semibold">{editing ? `Runde ${idx + 1} korrigieren` : "Punkte eintragen"}</h1>
          <p className="text-sm text-haze">Jeder zählt auf seinem Zettel, du trägst die Summe ein.</p>
        </div>
      </div>

      <ul className="space-y-3">
        {game.players.map((p) => {
          const v = points[p.id] ?? 0;
          return (
            <li key={p.id} className="panel p-4">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="text-xs text-dim">gesamt danach {(before[p.id] ?? 0) + v}</span>
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={999}
                  value={v === 0 ? "" : v}
                  placeholder="0"
                  onChange={(e) => set(p.id, Number(e.target.value) || 0)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="field w-24 text-center font-mono text-2xl font-medium"
                  aria-label={`Punkte für ${p.name}`}
                />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <button className="btn-secondary py-2" onClick={() => set(p.id, v - 5)} aria-label="5 abziehen" disabled={v === 0}>
                  <Minus className="h-4 w-4" />5
                </button>
                {QUICK.map((q) => (
                  <button key={q} className="btn-secondary py-2 font-mono" onClick={() => set(p.id, v + q)}>
                    +{q}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rim bg-night/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <button className="btn-primary mx-auto flex w-full max-w-xl py-3.5 text-base" onClick={save}>
          <Check className="h-5 w-5" /> {last ? "Speichern und Endstand zeigen" : editing ? "Änderung speichern" : "Speichern"}
        </button>
      </div>
    </div>
  );
}
