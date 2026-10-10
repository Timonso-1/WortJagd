"use client";

import { Pencil } from "lucide-react";
import { Tile } from "@/components/ui/Tile";
import { totals, type TableGame } from "./store";

export function Scoreboard({ game, onEditRound }: { game: TableGame; onEditRound?: (index: number) => void }) {
  const t = totals(game);
  const ranked = [...game.players].sort((a, b) => (t[b.id] ?? 0) - (t[a.id] ?? 0));
  const done = game.rounds.filter((r) => Object.values(r.points).some((v) => v !== null));
  if (game.players.length === 0) {
    return <p className="text-sm text-dim">Ohne Mitspieler gibt es keine Punkteliste.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-dim">
            <th className="pb-2 pr-2 font-medium">Spieler</th>
            {done.map((r, i) => (
              <th key={i} className="px-1 pb-2 text-center">
                <button
                  className="inline-flex flex-col items-center gap-0.5"
                  onClick={() => onEditRound?.(game.rounds.indexOf(r))}
                  title={`Runde ${i + 1} bearbeiten`}
                  disabled={!onEditRound}
                >
                  <Tile size="xs">{r.letter}</Tile>
                  {onEditRound && <Pencil className="h-2.5 w-2.5 text-dim" />}
                </button>
              </th>
            ))}
            <th className="pb-2 text-right font-medium">Summe</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((p, i) => (
            <tr key={p.id} className="border-t border-rim">
              <td className="py-2.5 pr-2">
                <span className="mr-2 font-mono text-dim">{i + 1}.</span>
                <span className="font-medium">{p.name}</span>
              </td>
              {done.map((r, j) => (
                <td key={j} className="px-1 py-2.5 text-center font-mono tabular-nums text-haze">{r.points[p.id] ?? "–"}</td>
              ))}
              <td className="py-2.5 text-right font-mono text-base font-semibold tabular-nums">{t[p.id] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
