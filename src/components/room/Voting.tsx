"use client";

import { Check, CircleCheck, Copy, Gavel, ThumbsDown, Undo2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Tile } from "@/components/ui/Tile";
import type { RoomCtx } from "./RoomClient";

function norm(w: string) {
  return w.trim().toLowerCase().replace(/ß/g, "ss").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export function Voting({ ctx }: { ctx: RoomCtx }) {
  const { state, isHost, act } = ctx;
  const round = state.round!;
  const answers = round.answers ?? {};
  const votes = round.votes ?? {};
  const letter = round.letter.toLowerCase();
  const me = state.players.find((p) => p.id === state.you);
  const eligible = state.players.length - 1;
  const readyCount = state.players.filter((p) => p.ready).length;
  const connected = state.players.filter((p) => p.connected).length;

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-center gap-5 p-6">
        <Tile size="md">{round.letter}</Tile>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold">Antworten prüfen</h1>
          <p className="text-sm text-haze">
            Lehne Wörter ab, die nicht passen. Lehnt mehr als die Hälfte ab, gibt es 0 Punkte.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-1 text-sm text-dim tabular-nums">{readyCount}/{connected} fertig</span>
          {isHost && (
            <button className="btn-quiet border border-rim" onClick={() => act("results:force")} title="Abstimmung sofort beenden">
              <Gavel className="h-4 w-4" /> Auswerten
            </button>
          )}
          <button className={me?.ready ? "btn-secondary" : "btn-primary"} onClick={() => act("vote:ready", !me?.ready)}>
            {me?.ready ? <Undo2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {me?.ready ? "Weiter prüfen" : "Fertig"}
          </button>
        </div>
      </section>

      {state.settings.categories.map((cat, ci) => {
        const counts = new Map<string, number>();
        for (const p of state.players) {
          const n = norm(answers[p.id]?.[ci] ?? "");
          if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
        }
        return (
          <section key={cat} className="panel p-5" aria-labelledby={`cat-${ci}`}>
            <h2 id={`cat-${ci}`} className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
              <CategoryIcon name={cat} className="h-5 w-5 text-tile" /> {cat}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {state.players.map((p) => {
                const word = answers[p.id]?.[ci] ?? "";
                const n = norm(word);
                const empty = !word.trim();
                const wrongLetter = !empty && (n.length < 2 || !n.startsWith(letter));
                const rejecters = (votes[`${p.id}:${ci}`] ?? []).filter((v) => v !== p.id);
                const iRejected = rejecters.includes(state.you);
                const rejected = eligible > 0 && rejecters.length * 2 > eligible;
                const dup = !!n && (counts.get(n) ?? 0) > 1;
                const own = p.id === state.you;
                const dead = empty || wrongLetter || rejected;
                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      dead ? "border-stop/30 bg-stop/[0.07]" : "border-rim bg-night-2"
                    }`}
                  >
                    <Avatar name={p.nickname} image={p.image} seed={p.id} size={28} />
                    <div className="min-w-0 flex-1">
                      {empty ? (
                        <p className="py-0.5 text-sm italic text-dim">nichts eingetragen</p>
                      ) : (
                        <p className={`truncate font-display text-lg font-semibold ${dead ? "text-dim line-through" : ""}`}>{word}</p>
                      )}
                      <p className="flex items-center gap-2 text-xs text-dim">
                        <span className="truncate">{own ? "Du" : p.nickname}</span>
                        {wrongLetter && <span className="text-stop">falscher Buchstabe</span>}
                        {dup && !dead && (
                          <span className="flex items-center gap-1 text-sky">
                            <Copy className="h-3 w-3" /> doppelt
                          </span>
                        )}
                        {!dead && !dup && !empty && (
                          <span className="flex items-center gap-1 text-go">
                            <CircleCheck className="h-3 w-3" /> gültig
                          </span>
                        )}
                      </p>
                    </div>
                    {!own && !empty && (
                      <button
                        onClick={() => act("vote:toggle", { target: p.id, category: ci })}
                        aria-pressed={iRejected}
                        title={iRejected ? "Ablehnung zurücknehmen" : "Wort ablehnen"}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition ${
                          iRejected ? "bg-stop text-[#2b0700]" : "text-haze hover:bg-stop/15 hover:text-stop"
                        }`}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        {rejecters.length > 0 && <span className="tabular-nums">{rejecters.length}</span>}
                      </button>
                    )}
                    {own && rejecters.length > 0 && (
                      <span className="flex items-center gap-1 text-sm text-stop" title="Ablehnungen">
                        <ThumbsDown className="h-4 w-4" /> {rejecters.length}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
