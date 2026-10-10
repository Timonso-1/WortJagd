"use client";

import { useState } from "react";
import { Hourglass, Play, Plus, Repeat, Shuffle, Timer, UserPlus, X } from "lucide-react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { DEFAULT_TABLE_SETTINGS, type TablePlayer, type TableSettings } from "./store";
import { Stepper, Switch, formatTime } from "./ui";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const PRESETS: Record<string, string[]> = {
  Klassisch: ["Stadt", "Land", "Fluss", "Name", "Tier", "Beruf"],
  Erweitert: ["Stadt", "Land", "Fluss", "Name", "Tier", "Beruf", "Pflanze", "Essen", "Marke", "Sportart"],
  Popkultur: ["Film", "Serie", "Band", "Videospiel", "Promi", "Comicfigur"],
  Kinder: ["Tier", "Essen", "Farbe", "Spielzeug", "Name", "Körperteil"],
};

export function Setup({
  initial,
  onStart,
}: {
  initial: { settings: TableSettings; players: TablePlayer[] } | null;
  onStart: (s: TableSettings, p: TablePlayer[]) => void;
}) {
  const [s, setS] = useState<TableSettings>(initial?.settings ?? DEFAULT_TABLE_SETTINGS);
  const [players, setPlayers] = useState<TablePlayer[]>(initial?.players ?? []);
  const [name, setName] = useState("");
  const [cat, setCat] = useState("");

  const addPlayer = () => {
    const n = name.trim().slice(0, 20);
    if (!n || players.some((p) => p.name === n) || players.length >= 12) return;
    setPlayers([...players, { id: crypto.randomUUID(), name: n }]);
    setName("");
  };
  const addCat = () => {
    const c = cat.trim().slice(0, 30);
    if (!c || s.categories.includes(c) || s.categories.length >= 20) return;
    setS({ ...s, categories: [...s.categories, c] });
    setCat("");
  };
  const playable = 26 - s.excludedLetters.length;

  return (
    <div className="space-y-5 pb-28">
      <section className="panel p-5">
        <h2 className="mb-1 font-display text-lg font-semibold">Mitspieler</h2>
        <p className="mb-4 text-sm text-dim">Für die Punkteliste. Ohne Spieler zählt die App nur Buchstaben und Zeit.</p>
        <ul className="mb-3 flex flex-wrap gap-2">
          {players.map((p) => (
            <li key={p.id} className="chip py-1.5 pl-3">
              {p.name}
              <button aria-label={`${p.name} entfernen`} className="-mr-1 rounded-full p-0.5 text-dim hover:text-stop" onClick={() => setPlayers(players.filter((x) => x.id !== p.id))}>
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            className="field"
            placeholder="Name"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            aria-label="Spielername"
            enterKeyHint="done"
          />
          <button className="btn-secondary shrink-0" onClick={addPlayer} disabled={!name.trim()}>
            <UserPlus className="h-4 w-4" /> Hinzufügen
          </button>
        </div>
      </section>

      <section className="panel px-5 py-2">
        <Stepper icon={Timer} label="Zeit pro Runde" value={s.roundTime} min={20} max={600} step={10} format={formatTime} onChange={(v) => setS({ ...s, roundTime: v })} />
        <Stepper icon={Repeat} label="Runden" hint="0 = ohne Limit" value={s.rounds} min={0} max={26} format={(v) => (v === 0 ? "∞" : String(v))} onChange={(v) => setS({ ...s, rounds: v })} />
        <Stepper icon={Hourglass} label="Restzeit nach Stopp" value={s.stopGrace} min={0} max={60} step={5} format={(v) => `${v} s`} onChange={(v) => setS({ ...s, stopGrace: v })} />
        <Switch icon={Shuffle} label="Bonuskategorie" hint="Jede Runde eine Überraschungskategorie" on={s.bonusCategory} onChange={(v) => setS({ ...s, bonusCategory: v })} />
      </section>

      <section className="panel p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold">Kategorien</h2>
          <span className="text-sm text-dim">{s.categories.length}</span>
        </div>
        <ul className="mb-3 flex flex-wrap gap-2">
          {s.categories.map((c) => (
            <li key={c} className="chip py-1.5 pl-2.5">
              <CategoryIcon name={c} className="h-4 w-4 text-haze" />
              {c}
              {s.categories.length > 1 && (
                <button aria-label={`${c} entfernen`} className="-mr-1 rounded-full p-0.5 text-dim hover:text-stop" onClick={() => setS({ ...s, categories: s.categories.filter((x) => x !== c) })}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input className="field" placeholder="Eigene Kategorie" maxLength={30} value={cat} onChange={(e) => setCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} aria-label="Neue Kategorie" enterKeyHint="done" />
          <button className="icon-btn h-11 w-11 shrink-0 border border-rim-2" onClick={addCat} aria-label="Kategorie hinzufügen" disabled={!cat.trim()}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([n, cats]) => (
            <button key={n} className="btn-quiet border border-rim px-3 py-1.5 text-sm" onClick={() => setS({ ...s, categories: cats })}>
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold">Buchstaben</h2>
          <span className="text-sm text-dim">{playable} im Stapel</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-13">
          {ALPHABET.map((l) => {
            const ex = s.excludedLetters.includes(l);
            return (
              <button
                key={l}
                aria-pressed={!ex}
                onClick={() => setS({ ...s, excludedLetters: ex ? s.excludedLetters.filter((x) => x !== l) : [...s.excludedLetters, l] })}
                className={`aspect-square rounded-md font-mono text-sm font-semibold transition ${ex ? "border border-dashed border-rim text-dim/70" : "bg-chalk text-night"}`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rim bg-night/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <button className="btn-primary mx-auto flex w-full max-w-xl py-3.5 text-base" disabled={playable === 0} onClick={() => onStart(s, players)}>
          <Play className="h-5 w-5 fill-current" /> Partie starten
        </button>
      </div>
    </div>
  );
}
