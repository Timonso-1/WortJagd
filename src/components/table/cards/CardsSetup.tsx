"use client";

import { useState } from "react";
import { Copy, Layers, Play, Plus, Shuffle, Timer, X } from "lucide-react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { PlayerEditor, Segmented, Stepper, Switch, formatTime } from "../ui";
import { CARD_CATEGORIES, DEFAULT_CARDS_SETTINGS, deckSize as calcDeck, type CardsSettings, type CheckMode } from "./store";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function CardsSetup({
  initial,
  onStart,
}: {
  initial: { settings: CardsSettings; players: { id: string; name: string }[] } | null;
  onStart: (s: CardsSettings, p: { id: string; name: string }[]) => void;
}) {
  const [s, setS] = useState<CardsSettings>({ ...DEFAULT_CARDS_SETTINGS, ...initial?.settings });
  const [players, setPlayers] = useState(initial?.players ?? []);
  const [cat, setCat] = useState("");
  const deckSize = calcDeck(s);
  const needed = players.length * s.cardsPerPlayer;
  const tooFew = s.dealt && needed > deckSize;

  const addCat = () => {
    const c = cat.trim().slice(0, 30);
    if (!c || s.categories.includes(c) || s.categories.length >= 60) return;
    setS({ ...s, categories: [...s.categories, c] });
    setCat("");
  };

  return (
    <div className="space-y-5 pb-28">
      <section className="panel p-5 text-sm text-haze">
        Jeder hat Buchstaben auf der Hand. Pro Runde gibt es eine Kategorie und eine feste Zeit. Wer zu einem seiner
        Buchstaben ein passendes Wort findet, legt die Karte ab. Wer keine Karten mehr hat, ist fertig. Gespielt wird,
        bis alle fertig sind.
      </section>

      <PlayerEditor players={players} onChange={setPlayers} hint="Mindestens zwei Spieler." />

      <section className="panel px-5 py-2">
        <Stepper icon={Layers} label="Karten pro Spieler" value={s.cardsPerPlayer} min={1} max={10} onChange={(v) => setS({ ...s, cardsPerPlayer: v })} />
        <Stepper icon={Timer} label="Zeit pro Kategorie" value={s.roundTime} min={15} max={300} step={15} format={formatTime} onChange={(v) => setS({ ...s, roundTime: v })} />
        <Switch
          icon={Shuffle}
          label="App teilt Buchstaben aus"
          hint={s.dealt ? "Die App zieht für jeden Spieler Buchstaben" : "Ihr nutzt echte Karten, die App zählt nur mit"}
          on={s.dealt}
          onChange={(v) => setS({ ...s, dealt: v })}
        />
        {s.dealt && (
          <Stepper
            icon={Copy}
            label="Karten pro Buchstabe"
            hint="Wie oft jeder Buchstabe im Stapel liegt"
            value={s.copies}
            min={1}
            max={4}
            format={(v) => `${v}×`}
            onChange={(v) => setS({ ...s, copies: v })}
          />
        )}
        <div className="pb-3 pt-3">
          <p className="mb-2 font-medium">Karten ablegen</p>
          <Segmented<CheckMode>
            label="Wann werden Karten abgelegt"
            value={s.check}
            onChange={(v) => setS({ ...s, check: v })}
            options={[
              { value: "after", label: "Nach der Zeit" },
              { value: "live", label: "Sofort beim Rufen" },
            ]}
          />
          <p className="mt-2 text-xs text-dim">
            {s.check === "after"
              ? "Nach Ablauf prüft die Gruppe die Wörter und tippt die abgelegten Karten an."
              : "Wer ein Wort ruft, tippt seine Karte sofort weg."}
          </p>
        </div>
      </section>

      {s.dealt && (
        <section className="panel p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">Buchstaben im Stapel</h2>
            <span className={`text-sm ${tooFew ? "text-stop" : "text-dim"}`}>
              {deckSize} Karten{players.length > 0 && `, ${needed} gebraucht`}
            </span>
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
          {tooFew && <p className="mt-3 text-sm text-stop">Zu wenige Karten für alle. „Karten pro Buchstabe“ erhöhen, weniger Karten pro Spieler wählen oder Buchstaben dazunehmen.</p>}
        </section>
      )}

      <section className="panel p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold">Kategorien</h2>
          <span className="text-sm text-dim">{s.categories.length} im Topf</span>
        </div>
        <ul className="mb-3 flex flex-wrap gap-2">
          {s.categories.map((c) => (
            <li key={c} className="chip py-1 pl-2.5 text-sm">
              <CategoryIcon name={c} className="h-3.5 w-3.5 text-haze" />
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
        {s.categories.length !== CARD_CATEGORIES.length && (
          <button className="btn-quiet mt-3 border border-rim px-3 py-1.5 text-sm" onClick={() => setS({ ...s, categories: CARD_CATEGORIES })}>
            Standard-Kategorien wiederherstellen
          </button>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rim bg-night/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <button
          className="btn-primary mx-auto flex w-full max-w-xl py-3.5 text-base"
          disabled={players.length < 2 || tooFew}
          onClick={() => onStart(s, players)}
        >
          <Play className="h-5 w-5 fill-current" /> {s.dealt ? "Austeilen und starten" : "Partie starten"}
        </button>
      </div>
    </div>
  );
}
