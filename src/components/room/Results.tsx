"use client";

import { ArrowRightCircle, Flag } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Tile } from "@/components/ui/Tile";
import type { RoomCtx } from "./RoomClient";

function pointStyle(pts: number) {
  if (pts === 20) return "bg-tile text-tile-ink";
  if (pts === 10) return "bg-go/20 text-go";
  if (pts === 5) return "bg-sky/20 text-sky";
  return "bg-white/5 text-dim";
}

export function Results({ ctx }: { ctx: RoomCtx }) {
  const { state, isHost, act } = ctx;
  const round = state.round!;
  const score = round.score!;
  const answers = round.answers ?? {};
  const last = round.index + 1 >= state.settings.rounds;
  const players = [...state.players].sort((a, b) => (score.total[b.id] ?? 0) - (score.total[a.id] ?? 0));
  const best = Math.max(0, ...players.map((p) => score.total[p.id] ?? 0));

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-center gap-5 p-6">
        <Tile size="md">{round.letter}</Tile>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold">Runde {round.index + 1} ausgewertet</h1>
          <p className="text-sm text-haze">
            {last ? "Das war die letzte Runde." : `Noch ${state.settings.rounds - round.index - 1} Runden.`}
          </p>
        </div>
        {isHost ? (
          <button className="btn-primary px-5 py-3 text-base" onClick={() => act("round:next")}>
            {last ? <Flag className="h-5 w-5" /> : <ArrowRightCircle className="h-5 w-5" />}
            {last ? "Endstand zeigen" : "Nächste Runde"}
          </button>
        ) : (
          <p className="text-sm text-dim">Der Spielleiter startet die nächste Runde.</p>
        )}
      </section>

      <ul className="space-y-3">
        {players.map((p) => {
          const gained = score.total[p.id] ?? 0;
          return (
            <li key={p.id} className="panel p-5">
              <div className="flex items-center gap-3">
                <Avatar name={p.nickname} image={p.image} seed={p.id} size={36} />
                <p className="min-w-0 flex-1 truncate font-semibold">
                  {p.nickname}
                  {p.id === state.you && <span className="ml-1.5 text-sm font-normal text-dim">(du)</span>}
                </p>
                <span className={`font-display text-2xl font-extrabold tabular-nums ${gained === best && best > 0 ? "text-tile" : ""}`}>
                  +{gained}
                </span>
                <span className="w-20 text-right text-sm text-dim tabular-nums">{p.score} gesamt</span>
              </div>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {state.settings.categories.map((c, ci) => {
                  const pts = score.points[p.id]?.[ci] ?? 0;
                  const valid = score.valid[p.id]?.[ci];
                  const word = answers[p.id]?.[ci];
                  return (
                    <li key={c} className="flex items-center gap-2.5 rounded-lg bg-night-2 px-3 py-2">
                      <CategoryIcon name={c} className="h-4 w-4 shrink-0 text-dim" />
                      <span className={`min-w-0 flex-1 truncate text-sm ${valid ? "" : "text-dim line-through"}`} title={c}>
                        {word || "–"}
                      </span>
                      <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${pointStyle(pts)}`}>{pts}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
