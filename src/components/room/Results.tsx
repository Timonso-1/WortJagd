"use client";

import { ArrowRightCircle, Flag, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Tile } from "@/components/ui/Tile";
import { CountUp } from "@/components/fx/useCountUp";
import { ModifierBadge } from "./Playing";
import type { RoomCtx } from "./RoomClient";

function pointStyle(pts: number) {
  if (pts >= 20) return "bg-tile text-tile-ink";
  if (pts >= 10) return "bg-go/20 text-go";
  if (pts > 0) return "bg-sky/20 text-sky";
  return "bg-chalk/5 text-dim";
}

export function Results({ ctx }: { ctx: RoomCtx }) {
  const { state, isHost, act } = ctx;
  const round = state.round!;
  const score = round.score!;
  const answers = round.answers ?? {};
  const jokers = round.jokers ?? {};
  const reactions = round.reactions ?? {};
  const last = round.index + 1 >= state.settings.rounds;
  const players = [...state.players].sort((a, b) => (score.total[b.id] ?? 0) - (score.total[a.id] ?? 0));
  const best = Math.max(0, ...players.map((p) => score.total[p.id] ?? 0));

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-center gap-5 p-6">
        <Tile size="md">{round.letter}</Tile>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold">
            Runde {round.index + 1} ausgewertet <ModifierBadge round={round} />
          </h1>
          <p className="text-sm text-haze">
            {last ? "Das war die letzte Runde." : `Noch ${state.settings.rounds - round.index - 1} ${state.settings.rounds - round.index - 1 === 1 ? "Runde" : "Runden"}.`}
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
        {players.map((p, idx) => {
          const gained = score.total[p.id] ?? 0;
          return (
            <li key={p.id} className="panel animate-reveal p-5" style={{ animationDelay: `${idx * 120}ms` }}>
              <div className="flex items-center gap-3">
                <Avatar name={p.nickname} image={p.image} avatar={p.avatar} seed={p.id} size={36} />
                <p className="min-w-0 flex-1 truncate font-semibold">
                  {p.nickname}
                  {p.id === state.you && <span className="ml-1.5 text-sm font-normal text-dim">(du)</span>}
                </p>
                <span className={`font-display text-2xl font-semibold tabular-nums ${gained === best && best > 0 ? "text-tile" : ""}`}>
                  <CountUp value={gained} prefix="+" delay={idx * 120 + 200} />
                </span>
                <span className="w-24 text-right text-sm text-dim tabular-nums">{p.score} gesamt</span>
              </div>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {round.categories.map((c, ci) => {
                  const pts = score.points[p.id]?.[ci] ?? 0;
                  const valid = score.valid[p.id]?.[ci];
                  const word = answers[p.id]?.[ci];
                  const reacts = Object.entries(reactions[`${p.id}:${ci}`] ?? {}).filter(([, who]) => who && who.length > 0);
                  return (
                    <li key={c} className="flex items-center gap-2.5 rounded-lg bg-night-2 px-3 py-2">
                      <CategoryIcon name={c} className="h-4 w-4 shrink-0 text-dim" />
                      <span className={`min-w-0 flex-1 truncate text-sm ${valid ? "" : "text-dim line-through"}`} title={c}>
                        {word || "–"}
                      </span>
                      {reacts.length > 0 && (
                        <span className="text-xs" title="Reaktionen">
                          {reacts.map(([e, who]) => `${e}${who!.length > 1 ? who!.length : ""}`).join(" ")}
                        </span>
                      )}
                      {jokers[p.id] === ci && <Sparkles className="h-3.5 w-3.5 shrink-0 text-tile" aria-label="Joker" />}
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
