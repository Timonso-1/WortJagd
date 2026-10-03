"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Hand } from "lucide-react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Tile } from "@/components/ui/Tile";
import { TimerRing } from "@/components/ui/TimerRing";
import type { RoomCtx } from "./RoomClient";
import { useCountdown } from "./useCountdown";

export function Playing({ ctx }: { ctx: RoomCtx }) {
  const round = ctx.state.round!;
  // Pro Runde neu initialisieren
  return <PlayingRound key={round.index} ctx={ctx} />;
}

function normalizeStart(w: string) {
  return w.trim().toLowerCase().replace(/ß/g, "ss").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function PlayingRound({ ctx }: { ctx: RoomCtx }) {
  const { state, act, offset } = ctx;
  const round = state.round!;
  const cats = state.settings.categories;
  const [answers, setAnswers] = useState<string[]>(() => cats.map((_, i) => state.myAnswers[i] ?? ""));
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
  const filled = answers.filter((a) => a.trim().length > 0).length;
  const allFilled = filled === cats.length;
  const stopper = round.stoppedBy ? state.players.find((p) => p.id === round.stoppedBy)?.nickname : null;

  if (!started) {
    return (
      <section className="panel flex flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <p className="text-haze">
          Runde {round.index + 1} von {state.settings.rounds}
        </p>
        <Tile size="xl" className="animate-pulse text-tile-ink/40">?</Tile>
        <p className="font-display text-6xl font-extrabold tabular-nums" aria-live="assertive">
          {pre || ""}
        </p>
        <p className="text-sm text-dim">Gleich steht der Buchstabe fest.</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-center gap-4 p-5 sm:gap-6 sm:p-6">
        <Tile size="lg" className="animate-tile-land max-sm:h-20 max-sm:w-20 max-sm:text-5xl">{round.letter}</Tile>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-haze">
            Runde {round.index + 1} von {state.settings.rounds}
          </p>
          <p className="font-display text-xl font-bold sm:text-2xl">
            {filled}/{cats.length} ausgefüllt
          </p>
          {stopper ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-stop">
              <Hand className="h-4 w-4" /> {stopper} hat Stopp gerufen
            </p>
          ) : (
            <p className="mt-1 hidden text-sm text-dim sm:block">Jedes Wort muss mit {round.letter} beginnen.</p>
          )}
        </div>
        <TimerRing left={left} total={state.settings.roundTime} size={84} />
        {state.settings.allowStop && !round.stoppedBy && (
          <button
            className="btn-danger px-5 py-3 text-base max-sm:w-full"
            disabled={!allFilled}
            onClick={() => {
              push(answers, true);
              act("round:stop");
            }}
            title={allFilled ? "Runde für alle beenden" : "Erst alle Felder ausfüllen"}
          >
            <Hand className="h-5 w-5" />
            Stopp
          </button>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Deine Antworten">
        {cats.map((c, i) => {
          const v = answers[i];
          const wrong = v.trim().length > 0 && !normalizeStart(v).startsWith(letter);
          const ok = v.trim().length > 1 && !wrong;
          return (
            <label key={c} className="panel block p-4">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-haze">
                <CategoryIcon name={c} className={`h-4 w-4 ${ok ? "text-tile" : ""}`} />
                {c}
                {wrong && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-stop">
                    <AlertTriangle className="h-3.5 w-3.5" /> beginnt nicht mit {round.letter}
                  </span>
                )}
              </span>
              <input
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                className={`field font-display text-xl font-semibold ${wrong ? "!border-stop focus:!shadow-[0_0_0_3px_rgb(255_107_90/0.2)]" : ""}`}
                value={v}
                maxLength={60}
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                onChange={(e) => set(i, e.target.value)}
                onBlur={() => push(answers, true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    inputs.current[i + 1]?.focus();
                  }
                }}
                placeholder={`${round.letter}…`}
              />
            </label>
          );
        })}
      </section>
    </div>
  );
}
