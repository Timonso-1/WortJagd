"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Flag, History, ListOrdered, Loader2, RotateCcw, Settings2, X } from "lucide-react";
import { Confetti } from "@/components/fx/Confetti";
import { sfx } from "@/lib/client/sound";
import { RoundView } from "./RoundView";
import { ScoreEntry } from "./ScoreEntry";
import { Scoreboard } from "./Scoreboard";
import { Setup } from "./Setup";
import { totals, useTableStore, type TableGame } from "./store";

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="panel mx-auto mb-0 mt-auto w-full max-w-xl rounded-b-none p-0 text-chalk backdrop:bg-black/70 sm:mb-auto sm:rounded-b-[var(--radius-panel)]"
    >
      <div className="max-h-[80dvh] overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Schließen">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function Finished({ game, onRematch, onNew }: { game: TableGame; onRematch: () => void; onNew: () => void }) {
  const t = totals(game);
  const ranked = [...game.players].sort((a, b) => (t[b.id] ?? 0) - (t[a.id] ?? 0));
  useEffect(() => {
    sfx.win();
  }, []);
  return (
    <div className="space-y-5 pb-28">
      {ranked.length > 0 && <Confetti />}
      <div className="pt-4 text-center">
        <h1 className="font-display text-4xl font-semibold">{ranked[0] ? `${ranked[0].name} gewinnt` : "Partie beendet"}</h1>
        <p className="mt-1 text-haze">
          {game.rounds.length} {game.rounds.length === 1 ? "Runde" : "Runden"}: {game.rounds.map((r) => r.letter).join(" ")}
        </p>
      </div>
      {ranked.length > 0 && (
        <ol className="space-y-2">
          {ranked.map((p, i) => (
            <li
              key={p.id}
              className={`animate-reveal flex items-center gap-4 rounded-xl border px-4 py-3 ${i === 0 ? "border-chalk bg-chalk text-night" : "border-rim"}`}
              style={{ animationDelay: `${(ranked.length - i) * 150}ms` }}
            >
              <span className="w-6 font-mono text-lg font-semibold">{i + 1}.</span>
              <span className="flex-1 truncate text-lg font-medium">{p.name}</span>
              <span className="font-mono text-2xl font-semibold tabular-nums">{t[p.id] ?? 0}</span>
            </li>
          ))}
        </ol>
      )}
      <section className="panel p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Alle Runden</h2>
        <Scoreboard game={game} />
      </section>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rim bg-night/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-xl gap-2">
          <button className="btn-secondary flex-1 py-3.5" onClick={onNew}>
            <Settings2 className="h-5 w-5" /> Neue Partie
          </button>
          <button className="btn-primary flex-1 py-3.5" onClick={onRematch}>
            <RotateCcw className="h-5 w-5" /> Revanche
          </button>
        </div>
      </div>
    </div>
  );
}

export function TableApp({ header }: { header?: (actions: React.ReactNode) => React.ReactNode }) {
  const { game, history, last, loaded, start, update, archive, clear } = useTableStore();
  const [board, setBoard] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [editRound, setEditRound] = useState<number | null>(null);
  const archived = useRef<string | null>(null);

  useEffect(() => {
    if (game?.phase === "finished" && archived.current !== game.id) {
      archived.current = game.id;
      archive(game);
    }
  }, [game, archive]);

  const hasPoints = !!game?.rounds.some((r) => Object.values(r.points).some((v) => v !== null));

  const actions = game ? (
    <>
      {game.players.length > 0 && game.phase !== "finished" && (
        <button className="icon-btn" onClick={() => setBoard(true)} title="Punkteliste" aria-label="Punkteliste">
          <ListOrdered className="h-5 w-5" />
        </button>
      )}
      {game.phase !== "finished" && (
        <button className="icon-btn" onClick={() => setConfirmEnd(true)} title="Partie beenden" aria-label="Partie beenden">
          <Flag className="h-5 w-5" />
        </button>
      )}
    </>
  ) : history.length > 0 ? (
    <button className="icon-btn" onClick={() => setHistoryOpen(true)} title="Letzte Partien" aria-label="Letzte Partien">
      <History className="h-5 w-5" />
    </button>
  ) : null;

  let body: React.ReactNode;
  if (!loaded) {
    body = (
      <p className="flex justify-center py-20 text-haze">
        <Loader2 className="h-5 w-5 animate-spin" />
      </p>
    );
  } else if (!game) {
    body = <Setup initial={last} onStart={start} />;
  } else if (editRound !== null) {
    body = <ScoreEntry game={game} update={update} roundIndex={editRound} onDone={() => setEditRound(null)} />;
  } else if (game.phase === "finished") {
    body = (
      <Finished
        game={game}
        onRematch={() => start(game.settings, game.players)}
        onNew={clear}
      />
    );
  } else if (game.phase === "scoring") {
    body = <ScoreEntry game={game} update={update} />;
  } else {
    body = <RoundView game={game} update={update} />;
  }

  return (
    <>
      {header?.(actions)}
      {!header && actions && <div className="mb-4 flex justify-end gap-1">{actions}</div>}
      {body}

      {game && (
        <Sheet open={board} onClose={() => setBoard(false)} title="Punkteliste">
          <Scoreboard
            game={game}
            onEditRound={(i) => {
              setBoard(false);
              setEditRound(i);
            }}
          />
          <p className="mt-3 text-xs text-dim">Tippe auf einen Buchstaben, um die Punkte der Runde zu korrigieren.</p>
        </Sheet>
      )}

      <Sheet open={confirmEnd} onClose={() => setConfirmEnd(false)} title="Partie beenden?">
        <p className="text-haze">
          {hasPoints ? "Der aktuelle Stand wird als Endstand gespeichert." : "Es wurden noch keine Punkte eingetragen. Die Partie wird verworfen."}
        </p>
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => setConfirmEnd(false)}>Weiterspielen</button>
          <button
            className="btn-danger flex-1"
            onClick={() => {
              setConfirmEnd(false);
              if (hasPoints) {
                update((g) => ({
                  ...g,
                  // Runde ohne Punkte am Ende entfernen
                  rounds: g.rounds.filter((r) => Object.values(r.points).some((v) => v !== null)),
                  phase: "finished",
                  endsAt: null,
                  pending: null,
                }));
              } else clear();
            }}
          >
            Beenden
          </button>
        </div>
      </Sheet>

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Letzte Partien">
        <ul className="space-y-2">
          {history.map((h) => (
            <li key={h.id} className="well px-4 py-3">
              <p className="text-xs text-dim">
                {new Date(h.finishedAt).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })} – {h.letters.join(" ")}
              </p>
              <p className="mt-1 text-sm">
                {h.players.length === 0
                  ? "Ohne Punkteliste"
                  : h.players.map((p, i) => (
                      <span key={i} className={i === 0 ? "font-semibold" : "text-haze"}>
                        {i > 0 && ", "}
                        {p.name} {p.total}
                      </span>
                    ))}
              </p>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

export function BackButton({ onClick, label = "Zurück" }: { onClick: () => void; label?: string }) {
  return (
    <button className="icon-btn" onClick={onClick} aria-label={label} title={label}>
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
}
