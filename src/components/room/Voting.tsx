"use client";

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
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-display text-2xl">Abstimmung – Buchstabe {round.letter}</h2>
          <p className="text-sm text-ink-soft">
            Klick auf ein Wort, um es abzulehnen. Mehr als die Hälfte Ablehnungen = 0 Punkte.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-ink-soft">{readyCount}/{connected} fertig</span>
          <button className={me?.ready ? "btn-ghost" : "btn-primary"} onClick={() => act("vote:ready", !me?.ready)}>
            {me?.ready ? "Doch nicht fertig" : "Fertig"}
          </button>
          {isHost && (
            <button className="btn-ghost" onClick={() => act("results:force")}>Auswerten</button>
          )}
        </div>
      </div>

      {state.settings.categories.map((cat, ci) => {
        const counts = new Map<string, number>();
        for (const p of state.players) {
          const n = norm(answers[p.id]?.[ci] ?? "");
          if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
        }
        return (
          <div key={cat} className="card">
            <h3 className="mb-2 font-semibold">{cat}</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {state.players.map((p) => {
                const word = answers[p.id]?.[ci] ?? "";
                const n = norm(word);
                const wrongLetter = n.length < 2 || !n.startsWith(letter);
                const rejecters = (votes[`${p.id}:${ci}`] ?? []).filter((v) => v !== p.id);
                const iRejected = rejecters.includes(state.you);
                const rejected = eligible > 0 && rejecters.length * 2 > eligible;
                const dup = n && (counts.get(n) ?? 0) > 1;
                const own = p.id === state.you;
                const clickable = !own && word.trim().length > 0;
                return (
                  <li key={p.id}>
                    <button
                      disabled={!clickable}
                      onClick={() => act("vote:toggle", { target: p.id, category: ci })}
                      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                        wrongLetter || rejected
                          ? "border-bad/40 bg-bad/10"
                          : iRejected
                            ? "border-bad/40 bg-paper"
                            : "border-line bg-paper hover:border-accent"
                      } ${clickable ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <span className="w-24 shrink-0 truncate text-xs text-ink-soft">{p.nickname}</span>
                      <span className={`truncate font-medium ${wrongLetter || rejected ? "line-through opacity-60" : ""}`}>
                        {word || <i className="text-ink-soft">leer</i>}
                      </span>
                      {dup && !wrongLetter && <span className="text-xs text-accent-2">doppelt</span>}
                      {rejecters.length > 0 && (
                        <span className="ml-auto text-xs text-bad" title={`${rejecters.length} Ablehnung(en)`}>
                          ✗ {rejecters.length}
                        </span>
                      )}
                      {iRejected && <span className="text-xs text-bad">(du)</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
