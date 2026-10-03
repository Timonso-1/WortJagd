"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Eye, Hand, Shuffle, Sparkles, Zap } from "lucide-react";
import { sfx } from "@/lib/client/sound";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Tile } from "@/components/ui/Tile";
import { TimerRing } from "@/components/ui/TimerRing";
import type { PublicRound } from "@/server/game/types";
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

export function ModifierBadge({ round, large = false }: { round: Pick<PublicRound, "modifier">; large?: boolean }) {
  if (!round.modifier) return null;
  const cls = large ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  if (round.modifier === "blitz")
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-sky/15 font-semibold text-sky ${cls}`}>
        <Zap className="h-3.5 w-3.5" /> Blitzrunde: halbe Zeit
      </span>
    );
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-tile/15 font-semibold text-tile ${cls}`}>
      <Sparkles className="h-3.5 w-3.5" /> Finale: doppelte Punkte
    </span>
  );
}

function PlayingRound({ ctx }: { ctx: RoomCtx }) {
  const { state, act, offset, isSpectator } = ctx;
  const round = state.round!;
  const cats = round.categories;
  const me = state.players.find((p) => p.id === state.you);
  const [answers, setAnswers] = useState<string[]>(() => cats.map((_, i) => state.myAnswers[i] ?? ""));
  const pre = useCountdown(round.startedAt, offset);
  const left = useCountdown(round.endsAt, offset);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const started = pre === 0 && round.letter !== "";

  // Klänge: Countdown, Start, Ticken in den letzten 10 Sekunden
  useEffect(() => {
    if (pre > 0) sfx.countdown();
  }, [pre]);
  useEffect(() => {
    if (started) {
      sfx.start();
      inputs.current[0]?.focus();
    }
  }, [started]);
  useEffect(() => {
    if (started && left > 0 && left <= 10) sfx.tick(left <= 5);
  }, [left, started]);

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
  const jokersOn = state.settings.jokers && !isSpectator;
  const canJoker = jokersOn && (!me?.jokerUsed || state.myJoker !== null);

  if (!started) {
    return (
      <section className="panel flex flex-col items-center justify-center gap-5 px-6 py-14 text-center">
        <p className="text-haze">
          Runde {round.index + 1} von {state.settings.rounds}
        </p>
        <ModifierBadge round={round} large />
        <Tile size="xl" className="animate-pulse !bg-rim text-dim">?</Tile>
        <p className="font-display text-6xl font-semibold tabular-nums" aria-live="assertive">
          {pre || ""}
        </p>
        {round.bonusIndex !== null && (
          <p className="flex items-center gap-2 text-sm text-haze">
            <Shuffle className="h-4 w-4 text-tile" /> Bonuskategorie: <b className="text-chalk">{cats[round.bonusIndex]}</b>
          </p>
        )}
      </section>
    );
  }

  const header = (
    <section className={`panel flex flex-wrap items-center gap-4 p-5 sm:gap-6 sm:p-6 ${left <= 5 && left > 0 ? "border-stop/50" : ""}`}>
      <Tile size="lg" className="animate-tile-land max-sm:h-20 max-sm:w-20 max-sm:text-5xl">{round.letter}</Tile>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm text-haze">
          Runde {round.index + 1} von {state.settings.rounds}
          <ModifierBadge round={round} />
        </p>
        <p className="font-display text-xl font-semibold sm:text-2xl">
          {isSpectator ? "Die Spieler schreiben" : `${filled}/${cats.length} ausgefüllt`}
        </p>
        {stopper ? (
          <p className="mt-1 flex animate-shake items-center gap-1.5 text-sm font-semibold text-stop">
            <Hand className="h-4 w-4" /> {stopper} hat Stopp gerufen
          </p>
        ) : (
          <p className="mt-1 hidden text-sm text-dim sm:block">Jedes Wort muss mit {round.letter} beginnen.</p>
        )}
      </div>
      <TimerRing left={left} total={round.duration} size={84} />
      {!isSpectator && state.settings.allowStop && !round.stoppedBy && (
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
  );

  if (isSpectator) {
    return (
      <div className="space-y-6">
        {header}
        <section className="panel p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <Eye className="h-5 w-5 text-sky" /> Fortschritt
          </h2>
          <ul className="space-y-3">
            {state.players.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <Avatar name={p.nickname} image={p.image} avatar={p.avatar} seed={p.id} size={32} />
                <span className="w-28 truncate font-medium">{p.nickname}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-rim">
                  <span className="block h-full rounded-full bg-tile transition-all duration-500" style={{ width: `${((p.filled ?? 0) / cats.length) * 100}%` }} />
                </span>
                <span className="w-10 text-right text-sm tabular-nums text-haze">{p.filled ?? 0}/{cats.length}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
      {jokersOn && (
        <p className="flex items-center gap-2 text-sm text-haze">
          <Sparkles className="h-4 w-4 text-tile" />
          {state.myJoker !== null
            ? `Joker liegt auf „${cats[state.myJoker]}“. Klick erneut auf den Stern, um ihn zurückzunehmen.`
            : me?.jokerUsed
              ? "Dein Joker ist für dieses Spiel verbraucht."
              : "Du hast einen Joker: Klick auf den Stern an einem Feld, um dessen Punkte zu verdoppeln."}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Deine Antworten">
        {cats.map((c, i) => {
          const v = answers[i] ?? "";
          const wrong = v.trim().length > 0 && !normalizeStart(v).startsWith(letter);
          const ok = v.trim().length > 1 && !wrong;
          const isBonus = round.bonusIndex === i;
          const hasJoker = state.myJoker === i;
          return (
            <div key={c} className={`panel block p-4 ${hasJoker ? "!border-chalk" : ""}`}>
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-haze">
                <CategoryIcon name={c} className={`h-4 w-4 ${ok ? "text-tile" : ""}`} />
                <label htmlFor={`a-${i}`}>{c}</label>
                {isBonus && (
                  <span className="flex items-center gap-1 rounded-full bg-tile/15 px-2 py-0.5 text-xs text-tile">
                    <Shuffle className="h-3 w-3" /> Bonus
                  </span>
                )}
                {wrong && (
                  <span className="flex items-center gap-1 text-xs text-stop">
                    <AlertTriangle className="h-3.5 w-3.5" /> nicht {round.letter}
                  </span>
                )}
                {jokersOn && (canJoker || hasJoker) && (
                  <button
                    type="button"
                    onClick={() => {
                      sfx.pop();
                      act("joker:set", { category: hasJoker ? null : i });
                    }}
                    className={`ml-auto rounded-md p-1 transition ${hasJoker ? "bg-tile text-tile-ink" : "text-dim hover:bg-tile/15 hover:text-tile"}`}
                    title={hasJoker ? "Joker zurücknehmen" : "Joker hier einsetzen (doppelte Punkte)"}
                    aria-pressed={hasJoker}
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                )}
              </span>
              <input
                id={`a-${i}`}
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
            </div>
          );
        })}
      </section>
    </div>
  );
}
