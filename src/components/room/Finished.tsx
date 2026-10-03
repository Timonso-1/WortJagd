"use client";

import Link from "next/link";
import { History, Home, Medal, RotateCcw, Sparkles, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Tile } from "@/components/ui/Tile";
import { Confetti } from "@/components/fx/Confetti";
import { CountUp } from "@/components/fx/useCountUp";
import type { RoomCtx } from "./RoomClient";

const PODIUM = [
  { place: 1, height: "h-40", ring: "#ffc83d", delay: 700 },
  { place: 2, height: "h-28", ring: "#c9d1f5", delay: 350 },
  { place: 3, height: "h-20", ring: "#e0915a", delay: 0 },
];

export function Finished({ ctx }: { ctx: RoomCtx }) {
  const { state, isHost, act } = ctx;
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 3);
  const order = [1, 0, 2].filter((i) => top[i]);
  const winner = top[0];
  const me = state.players.find((p) => p.id === state.you);
  const notReady = state.players.filter((p) => p.connected && !p.isHost && !p.lobbyReady);

  return (
    <div className="space-y-6">
      <Confetti />
      <section className="panel overflow-hidden px-6 pt-8">
        <h1 className="text-center font-display text-3xl font-extrabold">
          {winner ? (winner.id === state.you ? "Du gewinnst!" : `${winner.nickname} gewinnt`) : "Spiel beendet"}
        </h1>
        <p className="mt-1 text-center text-haze">
          {state.history.length === 1 ? "1 Runde" : `${state.history.length} Runden`} mit {state.history.map((h) => h.letter).join(", ")}
        </p>
        <div className="mt-8 flex items-end justify-center gap-3 sm:gap-6">
          {order.map((i) => {
            const p = top[i];
            const cfg = PODIUM[i];
            return (
              <div key={p.id} className="flex w-24 flex-col items-center sm:w-32">
                <div className="animate-reveal flex flex-col items-center" style={{ animationDelay: `${cfg.delay + 500}ms` }}>
                  <span className="rounded-full p-1" style={{ boxShadow: `0 0 0 3px ${cfg.ring}` }}>
                    <Avatar name={p.nickname} image={p.image} avatar={p.avatar} seed={p.id} size={i === 0 ? 64 : 48} />
                  </span>
                  <span className="mt-2 w-full truncate text-center font-semibold">{p.nickname}</span>
                  <span className="font-display text-xl font-bold tabular-nums">
                    <CountUp value={p.score} delay={cfg.delay + 500} />
                  </span>
                </div>
                <div
                  className={`animate-rise mt-3 flex w-full items-start justify-center rounded-t-2xl border border-b-0 border-rim bg-gradient-to-b from-deck-2 to-night-2 pt-3 ${cfg.height}`}
                  style={{ animationDelay: `${cfg.delay}ms` }}
                >
                  <Tile size={i === 0 ? "md" : "sm"}>{cfg.place}</Tile>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel p-6" aria-labelledby="table-h">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 id="table-h" className="flex items-center gap-2 font-display text-xl font-bold">
            <Medal className="h-5 w-5 text-tile" /> Punkte pro Runde
          </h2>
          {state.savedGameId && (
            <Link href={`/games/${state.savedGameId}`} target="_blank" className="btn-quiet ml-auto border border-rim px-3 py-1.5 text-sm">
              <History className="h-4 w-4" /> Alle Antworten ansehen
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-dim">
                <th className="pb-3 pr-2 font-medium">Platz</th>
                <th className="pb-3 font-medium">Spieler</th>
                {state.history.map((h, i) => (
                  <th key={i} className="px-1 pb-3 text-center">
                    <span className="relative inline-flex">
                      <Tile size="xs">{h.letter}</Tile>
                      {h.modifier === "blitz" && <Zap className="absolute -right-2 -top-2 h-3.5 w-3.5 text-sky" aria-label="Blitzrunde" />}
                      {h.modifier === "double" && <Sparkles className="absolute -right-2 -top-2 h-3.5 w-3.5 text-tile" aria-label="Doppelte Punkte" />}
                    </span>
                  </th>
                ))}
                <th className="pb-3 text-right font-medium">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p, i) => (
                <tr key={p.id} className="border-t border-rim/60">
                  <td className="py-3 pr-2 font-display font-bold text-haze">{i + 1}.</td>
                  <td className="py-3">
                    <span className="flex items-center gap-2">
                      <Avatar name={p.nickname} image={p.image} avatar={p.avatar} seed={p.id} size={24} />
                      <span className="font-medium">{p.nickname}</span>
                    </span>
                  </td>
                  {state.history.map((h, j) => (
                    <td key={j} className="px-1 py-3 text-center tabular-nums text-haze">{h.totals[p.id] ?? 0}</td>
                  ))}
                  <td className="py-3 text-right font-display text-lg font-bold tabular-nums text-tile">{p.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isHost ? (
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary px-5 py-3 text-base" disabled={notReady.length > 0} onClick={() => act("game:start")}>
            <RotateCcw className="h-5 w-5" /> Revanche mit gleichen Regeln
          </button>
          <button className="btn-secondary px-5 py-3 text-base" onClick={() => act("game:lobby")}>
            <Home className="h-5 w-5" /> Zurück zur Lobby
          </button>
          {notReady.length > 0 && <span className="text-sm text-dim">Warte auf: {notReady.map((p) => p.nickname).join(", ")}</span>}
        </div>
      ) : me ? (
        <div className="flex flex-wrap items-center gap-3">
          <button className={me.lobbyReady ? "btn-secondary px-5 py-3" : "btn-primary px-5 py-3"} onClick={() => act("lobby:ready", !me.lobbyReady)}>
            <RotateCcw className="h-5 w-5" /> {me.lobbyReady ? "Doch keine Revanche" : "Bereit für Revanche"}
          </button>
          <span className="text-sm text-dim">Der Spielleiter startet die Revanche, wenn alle bereit sind.</span>
        </div>
      ) : null}
    </div>
  );
}
