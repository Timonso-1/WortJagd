"use client";

import { useEffect, useState } from "react";
import type { RoomCtx } from "./RoomClient";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const PRESETS: Record<string, string[]> = {
  Klassisch: ["Stadt", "Land", "Fluss", "Name", "Tier", "Beruf"],
  Erweitert: ["Stadt", "Land", "Fluss", "Name", "Tier", "Beruf", "Pflanze", "Essen", "Marke", "Sportart"],
  Popkultur: ["Film", "Serie", "Band", "Videospiel", "Promi", "Comicfigur"],
  Schwer: ["Krankheit", "Chemisches Element", "Körperteil", "Werkzeug", "Musikinstrument", "Gebirge"],
};

interface Pack {
  id: string;
  name: string;
  categories: string[];
}

export function Lobby({ ctx }: { ctx: RoomCtx }) {
  const { state, isHost, act } = ctx;
  const s = state.settings;
  const [newCat, setNewCat] = useState("");
  const [packs, setPacks] = useState<{ mine: Pack[]; community: Pack[] }>({ mine: [], community: [] });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isHost) return;
    fetch("/api/packs")
      .then((r) => (r.ok ? r.json() : { mine: [], community: [] }))
      .then(setPacks)
      .catch(() => {});
  }, [isHost]);

  const update = (patch: Partial<typeof s>) => act("settings:update", patch);

  const addCategory = () => {
    const c = newCat.trim();
    if (!c || s.categories.includes(c) || s.categories.length >= 20) return;
    update({ categories: [...s.categories, c] });
    setNewCat("");
  };

  const loadPack = (p: Pack) => {
    update({ categories: p.categories.slice(0, 20) });
    fetch(`/api/packs/${p.id}`, { method: "POST" }).catch(() => {});
  };

  const link = typeof window !== "undefined" ? `${window.location.origin}/room/${state.code}` : "";

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3">
        <div>
          <p className="text-sm text-ink-soft">Raumcode</p>
          <p className="font-mono text-3xl font-bold tracking-[0.3em]">{state.code}</p>
        </div>
        <button
          className="btn-ghost ml-auto"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Kopiert" : "Einladungslink kopieren"}
        </button>
        {isHost ? (
          <button className="btn-primary" onClick={() => act("game:start")}>
            Spiel starten
          </button>
        ) : (
          <p className="text-sm text-ink-soft">Warte auf den Spielleiter …</p>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="font-display text-2xl">Einstellungen</h2>
        <fieldset disabled={!isHost} className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Runden" value={s.rounds} min={1} max={26} onChange={(v) => update({ rounds: v })} />
          <NumberField label="Zeit pro Runde (s)" value={s.roundTime} min={20} max={600} step={10} onChange={(v) => update({ roundTime: v })} />
          <NumberField label="Max. Spieler" value={s.maxPlayers} min={2} max={30} onChange={(v) => update({ maxPlayers: v })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.allowStop} onChange={(e) => update({ allowStop: e.target.checked })} />
            Stopp erlaubt
          </label>
          {s.allowStop && (
            <NumberField label="Restzeit nach Stopp (s)" value={s.stopGrace} min={0} max={60} onChange={(v) => update({ stopGrace: v })} />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.isPublic} onChange={(e) => update({ isPublic: e.target.checked })} />
            Öffentlich in Lobby
          </label>
        </fieldset>

        <div>
          <p className="label">Ausgeschlossene Buchstaben</p>
          <div className="flex flex-wrap gap-1">
            {ALPHABET.map((l) => {
              const ex = s.excludedLetters.includes(l);
              return (
                <button
                  key={l}
                  disabled={!isHost}
                  onClick={() =>
                    update({ excludedLetters: ex ? s.excludedLetters.filter((x) => x !== l) : [...s.excludedLetters, l] })
                  }
                  className={`h-8 w-8 rounded font-mono text-sm font-semibold transition ${
                    ex ? "bg-ink-soft/20 text-ink-soft line-through" : "bg-paper text-ink border border-line"
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="label">Kategorien ({s.categories.length}/20)</p>
          <div className="flex flex-wrap gap-2">
            {s.categories.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-3 py-1 text-sm">
                {c}
                {isHost && s.categories.length > 1 && (
                  <button className="text-ink-soft hover:text-bad" onClick={() => update({ categories: s.categories.filter((x) => x !== c) })}>
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {isHost && (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <input
                  className="input"
                  maxLength={30}
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  placeholder="Neue Kategorie"
                />
                <button className="btn-ghost" onClick={addCategory}>Hinzufügen</button>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="text-ink-soft">Vorlagen:</span>
                {Object.entries(PRESETS).map(([name, cats]) => (
                  <button key={name} className="underline decoration-dotted hover:text-accent" onClick={() => update({ categories: cats })}>
                    {name}
                  </button>
                ))}
              </div>
              {(packs.mine.length > 0 || packs.community.length > 0) && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-ink-soft">Pakete:</span>
                  <select
                    className="input w-auto py-1"
                    defaultValue=""
                    onChange={(e) => {
                      const p = [...packs.mine, ...packs.community].find((x) => x.id === e.target.value);
                      if (p) loadPack(p);
                      e.target.value = "";
                    }}
                  >
                    <option value="" disabled>Paket laden …</option>
                    {packs.mine.length > 0 && (
                      <optgroup label="Meine">
                        {packs.mine.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.categories.length})</option>)}
                      </optgroup>
                    )}
                    {packs.community.length > 0 && (
                      <optgroup label="Community">
                        {packs.community.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.categories.length})</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NumberField(props: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  const [v, setV] = useState(String(props.value));
  useEffect(() => setV(String(props.value)), [props.value]);
  const commit = () => {
    const n = Math.min(props.max, Math.max(props.min, Math.round(Number(v))));
    if (Number.isFinite(n) && n !== props.value) props.onChange(n);
    else setV(String(props.value));
  };
  return (
    <label className="block">
      <span className="label">{props.label}</span>
      <input
        type="number"
        className="input"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
      />
    </label>
  );
}
