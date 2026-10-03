"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomCtx } from "./RoomClient";
import { useCountdown } from "./useCountdown";

export function Playing({ ctx }: { ctx: RoomCtx }) {
  const { state, act, offset } = ctx;
  const round = state.round!;
  const cats = state.settings.categories;
  // Pro Runde neu initialisieren
  return <PlayingRound key={round.index} ctx={ctx} initial={state.myAnswers} cats={cats} act={act} offset={offset} />;
}

function PlayingRound({
  ctx,
  initial,
  cats,
  act,
  offset,
}: {
  ctx: RoomCtx;
  initial: string[];
  cats: string[];
  act: RoomCtx["act"];
  offset: number;
}) {
  const { state } = ctx;
  const round = state.round!;
  const [answers, setAnswers] = useState<string[]>(() => cats.map((_, i) => initial[i] ?? ""));
  const pre = useCountdown(round.startedAt, offset);
  const left = useCountdown(round.endsAt, offset);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const started = pre === 0 && round.letter !== "";

  useEffect(() => {
    if (started) inputs.current[0]?.focus();
  }, [started]);

  const push = (next: string[], immediate = false) => {
    if (timer.current) clearTimeout(timer.current);
    if (immediate) act("answers:set", next);
    else timer.current = setTimeout(() => act("answers:set", next), 300);
  };

  const set = (i: number, v: string) => {
    const next = answers.slice();
    next[i] = v;
    setAnswers(next);
    push(next);
  };

  const letter = round.letter.toLowerCase();
  const allFilled = answers.every((a) => a.trim().length > 0);
  const stopper = round.stoppedBy ? state.players.find((p) => p.id === round.stoppedBy)?.nickname : null;
  const total = state.settings.roundTime;
  const pct = Math.min(100, (left / total) * 100);

  if (!started) {
    return (
      <div className="card flex h-72 flex-col items-center justify-center gap-2">
        <p className="text-ink-soft">Runde {round.index + 1} von {state.settings.rounds}</p>
        <p className="font-display text-8xl font-bold text-accent tabular-nums">{pre || "…"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-accent font-display text-6xl font-bold text-white shadow-inner">
          {round.letter}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-soft">
            Runde {round.index + 1} von {state.settings.rounds}
            {stopper && <span className="ml-2 font-semibold text-bad">{stopper} hat Stopp gerufen</span>}
          </p>
          <p className={`text-3xl font-bold tabular-nums ${left <= 10 ? "text-bad" : ""}`}>
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
            <div className={`h-full transition-all duration-300 ${left <= 10 ? "bg-bad" : "bg-accent-2"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        {state.settings.allowStop && !round.stoppedBy && (
          <button className="btn-primary" disabled={!allFilled} onClick={() => { push(answers, true); act("round:stop"); }} title={allFilled ? "" : "Erst alle Felder ausfüllen"}>
            Stopp!
          </button>
        )}
      </div>

      <div className="card grid gap-3 sm:grid-cols-2">
        {cats.map((c, i) => {
          const v = answers[i];
          const wrong = v.trim().length > 0 && !normalizeStart(v).startsWith(letter);
          return (
            <label key={c} className="block">
              <span className="label">{c}</span>
              <input
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                className={`input text-lg ${wrong ? "border-bad focus:border-bad focus:ring-bad/30" : ""}`}
                value={v}
                maxLength={60}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => set(i, e.target.value)}
                onBlur={() => push(answers, true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    inputs.current[i + 1]?.focus();
                  }
                }}
                placeholder={`${round.letter} …`}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function normalizeStart(w: string) {
  return w.trim().toLowerCase().replace(/ß/g, "ss").normalize("NFD").replace(/[̀-ͯ]/g, "");
}
