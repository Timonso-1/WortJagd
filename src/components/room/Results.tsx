"use client";

import type { RoomCtx } from "./RoomClient";

export function Results({ ctx }: { ctx: RoomCtx }) {
  const { state, isHost, act } = ctx;
  const round = state.round!;
  const score = round.score!;
  const answers = round.answers ?? {};
  const last = round.index + 1 >= state.settings.rounds;
  const players = [...state.players].sort((a, b) => (score.total[b.id] ?? 0) - (score.total[a.id] ?? 0));

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl">
          Ergebnis Runde {round.index + 1} – {round.letter}
        </h2>
        {isHost ? (
          <button className="btn-primary ml-auto" onClick={() => act("round:next")}>
            {last ? "Zum Endstand" : "Nächste Runde"}
          </button>
        ) : (
          <p className="ml-auto text-sm text-ink-soft">Warte auf den Spielleiter …</p>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-soft">
              <th className="py-2 pr-3">Spieler</th>
              {state.settings.categories.map((c) => (
                <th key={c} className="px-2">{c}</th>
              ))}
              <th className="px-2 text-right">Runde</th>
              <th className="px-2 text-right">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-t border-line align-top">
                <td className="py-2 pr-3 font-semibold">{p.nickname}</td>
                {state.settings.categories.map((c, ci) => {
                  const pts = score.points[p.id]?.[ci] ?? 0;
                  return (
                    <td key={c} className="px-2 py-2">
                      <div className={score.valid[p.id]?.[ci] ? "" : "text-ink-soft line-through"}>
                        {answers[p.id]?.[ci] || "–"}
                      </div>
                      <div className={`text-xs font-bold ${pts === 20 ? "text-ok" : pts === 0 ? "text-bad" : "text-ink-soft"}`}>
                        {pts}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-right font-bold">+{score.total[p.id] ?? 0}</td>
                <td className="px-2 py-2 text-right font-bold text-accent">{p.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
