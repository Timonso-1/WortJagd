"use client";

import { useState } from "react";
import { BookCheck, BookX, Check, CircleCheck, Copy, Gavel, Shuffle, SmilePlus, Sparkles, ThumbsDown, Undo2, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Tile } from "@/components/ui/Tile";
import { sfx } from "@/lib/client/sound";
import { REACTIONS, type PublicRound } from "@/server/game/types";
import { ModifierBadge } from "./Playing";
import type { RoomCtx } from "./RoomClient";

function norm(w: string) {
  return w.trim().toLowerCase().replace(/ß/g, "ss").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export function Reactions({
  round,
  target,
  category,
  me,
  act,
}: {
  round: PublicRound;
  target: string;
  category: number;
  me: string;
  act: RoomCtx["act"];
}) {
  const [open, setOpen] = useState(false);
  const bucket = round.reactions?.[`${target}:${category}`] ?? {};
  const used = REACTIONS.filter((e) => (bucket[e]?.length ?? 0) > 0);
  const toggle = (e: (typeof REACTIONS)[number]) => {
    sfx.pop();
    act("reaction:toggle", { target, category, emoji: e });
  };
  return (
    <div className="flex flex-wrap items-center gap-1">
      {used.map((e) => {
        const who = bucket[e] ?? [];
        const mine = who.includes(me);
        return (
          <button
            key={e}
            onClick={() => toggle(e)}
            aria-pressed={mine}
            title={mine ? "Reaktion zurücknehmen" : `Auch mit ${e} reagieren`}
            className={`animate-pop flex items-center gap-1 rounded-full px-2 py-0.5 text-sm ${mine ? "bg-chalk/15 ring-1 ring-chalk/50" : "bg-chalk/[0.07]"}`}
          >
            <span aria-hidden="true">{e}</span>
            <span className="text-xs font-semibold tabular-nums">{who.length}</span>
          </button>
        );
      })}
      {open ? (
        <span className="animate-pop flex items-center gap-0.5 rounded-full border border-rim bg-deck px-1 py-0.5">
          {REACTIONS.map((e) => (
            <button
              key={e}
              className="rounded-full px-1 text-base transition hover:scale-125"
              onClick={() => {
                toggle(e);
                setOpen(false);
              }}
              aria-label={`Mit ${e} reagieren`}
            >
              {e}
            </button>
          ))}
          <button className="rounded-full p-0.5 text-dim hover:text-chalk" onClick={() => setOpen(false)} aria-label="Schließen">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ) : (
        <button
          className="rounded-full p-1 text-dim transition hover:bg-chalk/[0.07] hover:text-chalk"
          onClick={() => setOpen(true)}
          aria-label="Reagieren"
          title="Reagieren"
        >
          <SmilePlus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function Voting({ ctx }: { ctx: RoomCtx }) {
  const { state, isHost, act, isSpectator } = ctx;
  const round = state.round!;
  const answers = round.answers ?? {};
  const votes = round.votes ?? {};
  const hints = round.hints ?? {};
  const jokers = round.jokers ?? {};
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
          <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold">
            Antworten prüfen <ModifierBadge round={round} />
          </h1>
          <p className="text-sm text-haze">
            {isSpectator
              ? "Die Spieler stimmen ab. Reagieren kannst du trotzdem."
              : "Lehne Wörter ab, die nicht passen. Lehnt mehr als die Hälfte ab, gibt es 0 Punkte."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-1 text-sm text-dim tabular-nums">{readyCount}/{connected} fertig</span>
          {isHost && (
            <button className="btn-quiet border border-rim" onClick={() => act("results:force")} title="Abstimmung sofort beenden">
              <Gavel className="h-4 w-4" /> Auswerten
            </button>
          )}
          {!isSpectator && (
            <button className={me?.ready ? "btn-secondary" : "btn-primary"} onClick={() => act("vote:ready", !me?.ready)}>
              {me?.ready ? <Undo2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {me?.ready ? "Weiter prüfen" : "Fertig"}
            </button>
          )}
        </div>
      </section>

      {round.categories.map((cat, ci) => {
        const counts = new Map<string, number>();
        for (const p of state.players) {
          const n = norm(answers[p.id]?.[ci] ?? "");
          if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
        }
        return (
          <section
            key={cat}
            className="panel animate-reveal p-5"
            style={{ animationDelay: `${ci * 90}ms` }}
            aria-labelledby={`cat-${ci}`}
          >
            <h2 id={`cat-${ci}`} className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <CategoryIcon name={cat} className="h-5 w-5 text-tile" /> {cat}
              {round.bonusIndex === ci && (
                <span className="flex items-center gap-1 rounded-full bg-tile/15 px-2 py-0.5 font-sans text-xs text-tile">
                  <Shuffle className="h-3 w-3" /> Bonus
                </span>
              )}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {state.players.map((p) => {
                const key = `${p.id}:${ci}`;
                const word = answers[p.id]?.[ci] ?? "";
                const n = norm(word);
                const empty = !word.trim();
                const wrongLetter = !empty && (n.length < 2 || !n.startsWith(letter));
                const rejecters = (votes[key] ?? []).filter((v) => v !== p.id);
                const iRejected = rejecters.includes(state.you);
                const rejected = eligible > 0 && rejecters.length * 2 > eligible;
                const dup = !!n && (counts.get(n) ?? 0) > 1;
                const own = p.id === state.you;
                const dead = empty || wrongLetter || rejected;
                const hint = hints[key];
                return (
                  <li
                    key={p.id}
                    className={`rounded-xl border px-3 py-2.5 transition-colors ${dead ? "border-stop/30 bg-stop/[0.07]" : "border-rim bg-night-2"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={p.nickname} image={p.image} avatar={p.avatar} seed={p.id} size={28} />
                      <div className="min-w-0 flex-1">
                        {empty ? (
                          <p className="py-0.5 text-sm italic text-dim">nichts eingetragen</p>
                        ) : (
                          <p className={`flex items-center gap-1.5 truncate font-display text-lg font-semibold ${dead ? "text-dim line-through" : ""}`}>
                            <span className="truncate">{word}</span>
                            {jokers[p.id] === ci && <Sparkles className="h-4 w-4 shrink-0 text-tile" aria-label="Joker" />}
                          </p>
                        )}
                        <p className="flex flex-wrap items-center gap-x-2 text-xs text-dim">
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
                          {!empty && !wrongLetter && hint === "known" && (
                            <span className="flex items-center gap-1 text-go" title="Steht in unserer Wortliste">
                              <BookCheck className="h-3 w-3" /> in der Liste
                            </span>
                          )}
                          {!empty && !wrongLetter && hint === "unknown" && (
                            <span className="flex items-center gap-1" title="Nicht in unserer Wortliste. Das heißt nicht, dass es falsch ist.">
                              <BookX className="h-3 w-3" /> nicht in der Liste
                            </span>
                          )}
                        </p>
                      </div>
                      {!own && !empty && !isSpectator && (
                        <button
                          onClick={() => act("vote:toggle", { target: p.id, category: ci })}
                          aria-pressed={iRejected}
                          title={iRejected ? "Ablehnung zurücknehmen" : "Wort ablehnen"}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition ${
                            iRejected ? "bg-stop text-white" : "text-haze hover:bg-stop/15 hover:text-stop"
                          }`}
                        >
                          <ThumbsDown className="h-4 w-4" />
                          {rejecters.length > 0 && <span className="tabular-nums">{rejecters.length}</span>}
                        </button>
                      )}
                      {(own || isSpectator) && rejecters.length > 0 && (
                        <span className="flex items-center gap-1 text-sm text-stop" title="Ablehnungen">
                          <ThumbsDown className="h-4 w-4" /> {rejecters.length}
                        </span>
                      )}
                    </div>
                    {!empty && (
                      <div className="mt-1.5 pl-10">
                        <Reactions round={round} target={p.id} category={ci} me={state.you} act={act} />
                      </div>
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
