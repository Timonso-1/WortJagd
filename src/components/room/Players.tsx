"use client";

import type { RoomCtx } from "./RoomClient";

export function Players({ ctx }: { ctx: RoomCtx }) {
  const { state, isHost, act } = ctx;
  const total = state.settings.categories.length;
  const sorted = state.phase === "lobby" ? state.players : [...state.players].sort((a, b) => b.score - a.score);
  return (
    <div className="card">
      <h3 className="mb-2 font-semibold">
        Spieler <span className="text-ink-soft">({state.players.filter((p) => p.connected).length}/{state.settings.maxPlayers})</span>
      </h3>
      <ul className="space-y-1">
        {sorted.map((p) => (
          <li key={p.id} className={`group flex items-center gap-2 text-sm ${p.connected ? "" : "opacity-40"}`}>
            <span className={`h-2 w-2 rounded-full ${p.connected ? "bg-ok" : "bg-ink-soft"}`} />
            <span className={`truncate ${p.id === state.you ? "font-bold" : ""}`}>{p.nickname}</span>
            {p.isHost && <span className="rounded bg-accent/15 px-1 text-xs text-accent">Leiter</span>}
            {!p.isGuest && <span className="text-xs text-ink-soft" title="Angemeldet">✓</span>}
            {p.filled !== undefined && (
              <span className="text-xs text-ink-soft">{p.filled}/{total}</span>
            )}
            {p.ready && <span className="text-xs text-ok">fertig</span>}
            <span className="ml-auto font-semibold tabular-nums">{state.phase !== "lobby" ? p.score : ""}</span>
            {isHost && p.id !== state.you && (
              <span className="hidden gap-1 group-hover:flex">
                <button className="text-xs text-ink-soft hover:text-ink" title="Zum Leiter machen" onClick={() => act("host:transfer", { target: p.id })}>
                  ↑
                </button>
                <button className="text-xs text-bad" title="Entfernen" onClick={() => act("player:kick", { target: p.id })}>
                  ×
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
