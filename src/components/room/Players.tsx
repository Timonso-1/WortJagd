"use client";

import { BadgeCheck, CheckCircle2, Crown, Eye, PenLine, Sparkles, UserMinus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { RoomCtx } from "./RoomClient";

export function Players({ ctx }: { ctx: RoomCtx }) {
  const { state, isHost, act } = ctx;
  const total = state.round?.categories.length ?? state.settings.categories.length;
  const online = state.players.filter((p) => p.connected).length;
  const inLobby = state.phase === "lobby";
  const showScore = !inLobby;
  const sorted = showScore ? [...state.players].sort((a, b) => b.score - a.score) : state.players;

  return (
    <section className="panel p-5" aria-labelledby="players-h">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="players-h" className="font-display text-lg font-semibold">Spieler</h2>
        <span className="text-sm text-dim">{online} von {state.settings.maxPlayers}</span>
      </div>
      <ul className="space-y-1">
        {sorted.map((p, i) => {
          const me = p.id === state.you;
          const lobbyReady = (inLobby || state.phase === "finished") && (p.isHost || p.lobbyReady);
          return (
            <li key={p.id} className={`group flex items-center gap-3 rounded-xl px-2 py-2 ${me ? "bg-chalk/[0.05]" : ""}`}>
              {showScore && <span className="w-4 text-right text-sm font-semibold tabular-nums text-dim">{i + 1}</span>}
              <span className="relative">
                <Avatar name={p.nickname} image={p.image} avatar={p.avatar} seed={p.id} size={34} dim={!p.connected} />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-deck ${p.connected ? "bg-go" : "bg-dim"}`}
                  title={p.connected ? "Online" : "Offline"}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`flex items-center gap-1.5 truncate ${me ? "font-bold" : "font-medium"} ${p.connected ? "" : "text-dim"}`}>
                  <span className="truncate">{p.nickname}</span>
                  {p.isHost && <Crown className="h-3.5 w-3.5 shrink-0 text-tile" aria-label="Spielleiter" />}
                  {!p.isGuest && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky" aria-label="Angemeldet" />}
                  {state.settings.jokers && !inLobby && (
                    <Sparkles
                      className={`h-3.5 w-3.5 shrink-0 ${p.jokerUsed ? "text-dim/50" : "text-tile"}`}
                      aria-label={p.jokerUsed ? "Joker verbraucht" : "Joker verfügbar"}
                    />
                  )}
                </p>
                {p.filled !== undefined && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-rim">
                      <span className="block h-full rounded-full bg-tile transition-all duration-500" style={{ width: `${(p.filled / total) * 100}%` }} />
                    </span>
                    <PenLine className="h-3 w-3 text-dim" aria-label={`${p.filled} von ${total} ausgefüllt`} />
                  </div>
                )}
                {state.phase === "voting" && (
                  <p className={`text-xs ${p.ready ? "text-go" : "text-dim"}`}>{p.ready ? "Fertig geprüft" : "Prüft noch"}</p>
                )}
                {(inLobby || state.phase === "finished") && !p.isHost && (
                  <p className={`text-xs ${p.lobbyReady ? "text-go" : "text-dim"}`}>{p.lobbyReady ? "Bereit" : "Noch nicht bereit"}</p>
                )}
              </div>
              {(p.ready || (lobbyReady && !p.isHost)) && <CheckCircle2 className="h-4 w-4 text-go" aria-hidden="true" />}
              {showScore && <span className="font-display text-lg font-semibold tabular-nums">{p.score}</span>}
              {isHost && !me && (
                <span className="hidden items-center group-hover:flex group-focus-within:flex">
                  <button className="icon-btn h-7 w-7" title="Zum Spielleiter machen" onClick={() => act("host:transfer", { target: p.id })}>
                    <Crown className="h-3.5 w-3.5" />
                  </button>
                  <button className="icon-btn h-7 w-7 hover:!text-stop" title="Aus dem Raum entfernen" onClick={() => act("player:kick", { target: p.id })}>
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {state.spectators.length > 0 && (
        <div className="mt-4 border-t border-rim pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm text-dim">
            <Eye className="h-4 w-4" /> {state.spectators.length} {state.spectators.length === 1 ? "Zuschauer" : "Zuschauer"}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {state.spectators.map((s) => (
              <li key={s.id} title={s.nickname}>
                <Avatar name={s.nickname} image={s.image} avatar={s.avatar} seed={s.id} size={26} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
