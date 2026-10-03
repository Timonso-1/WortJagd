"use client";

import type { RoomCtx } from "./RoomClient";

export function Finished({ ctx }: { ctx: RoomCtx }) {
  const { state, isHost, act } = ctx;
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  const podium = ranked.slice(0, 3);
  const heights = ["h-32", "h-24", "h-16"];
  const order = [1, 0, 2].filter((i) => podium[i]);

  return (
    <div className="space-y-4">
      <div className="card text-center">
        <h2 className="font-display text-4xl">Endstand</h2>
        <div className="mt-6 flex items-end justify-center gap-4">
          {order.map((i) => (
            <div key={podium[i].id} className="flex w-28 flex-col items-center">
              <span className="truncate font-semibold">{podium[i].nickname}</span>
              <span className="text-sm text-ink-soft">{podium[i].score} P.</span>
              <div className={`mt-1 flex w-full items-start justify-center rounded-t-lg bg-accent pt-2 text-2xl font-bold text-white ${heights[i]}`}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-soft">
              <th className="py-2">#</th>
              <th>Spieler</th>
              {state.history.map((h, i) => (
                <th key={i} className="px-2 text-center font-mono">{h.letter}</th>
              ))}
              <th className="text-right">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={p.id} className="border-t border-line">
                <td className="py-2 font-semibold">{i + 1}</td>
                <td>{p.nickname}</td>
                {state.history.map((h, j) => (
                  <td key={j} className="px-2 text-center tabular-nums">{h.totals[p.id] ?? 0}</td>
                ))}
                <td className="text-right font-bold text-accent">{p.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isHost ? (
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => act("game:start")}>Nochmal mit gleichen Einstellungen</button>
          <button className="btn-ghost" onClick={() => act("game:lobby")}>Zurück zur Lobby</button>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">Der Spielleiter kann eine neue Partie starten.</p>
      )}
    </div>
  );
}
