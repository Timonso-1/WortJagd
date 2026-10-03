"use client";

import { useEffect, useState } from "react";
import {
  Globe2,
  Hand,
  Hourglass,
  Library,
  Lock,
  Minus,
  Play,
  Plus,
  Repeat,
  Timer,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
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
  const online = state.players.filter((p) => p.connected).length;

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

  const playable = 26 - s.excludedLetters.length;

  return (
    <div className="space-y-6">
      <section className="panel flex flex-wrap items-center gap-5 p-6">
        <div className="flex -space-x-3">
          {state.players
            .filter((p) => p.connected)
            .slice(0, 5)
            .map((p) => (
              <span key={p.id} className="rounded-full ring-4 ring-deck-2">
                <Avatar name={p.nickname} image={p.image} seed={p.id} size={40} />
              </span>
            ))}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold">
            {online < 2 ? "Warte auf Mitspieler" : `${online} Spieler bereit`}
          </h1>
          <p className="text-sm text-haze">
            {isHost
              ? online < 2
                ? "Teile den Einladungslink. Du kannst auch allein eine Proberunde starten."
                : "Passe die Regeln an und starte, wenn alle da sind."
              : "Der Spielleiter legt die Regeln fest und startet das Spiel."}
          </p>
        </div>
        {isHost && (
          <button className="btn-primary px-6 py-3 text-base" onClick={() => act("game:start")}>
            <Play className="h-5 w-5 fill-current" />
            Spiel starten
          </button>
        )}
      </section>

      <section className="panel p-6" aria-labelledby="rules-h">
        <h2 id="rules-h" className="mb-5 font-display text-xl font-bold">Regeln</h2>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Stepper icon={Repeat} label="Runden" value={s.rounds} min={1} max={26} disabled={!isHost} onChange={(v) => update({ rounds: v })} />
          <Stepper icon={Timer} label="Zeit pro Runde" unit="s" value={s.roundTime} min={20} max={600} step={10} disabled={!isHost} onChange={(v) => update({ roundTime: v })} />
          <Stepper icon={Users} label="Max. Spieler" value={s.maxPlayers} min={2} max={30} disabled={!isHost} onChange={(v) => update({ maxPlayers: v })} />
          <Toggle
            icon={s.isPublic ? Globe2 : Lock}
            label="Sichtbarkeit"
            on={s.isPublic}
            onText="Öffentlich"
            offText="Privat"
            disabled={!isHost}
            onChange={(v) => update({ isPublic: v })}
          />
          <Toggle icon={Hand} label="Stopp rufen" on={s.allowStop} onText="Erlaubt" offText="Aus" disabled={!isHost} onChange={(v) => update({ allowStop: v })} />
          {s.allowStop && (
            <Stepper icon={Hourglass} label="Restzeit nach Stopp" unit="s" value={s.stopGrace} min={0} max={60} step={5} disabled={!isHost} onChange={(v) => update({ stopGrace: v })} />
          )}
        </div>

        <div className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-semibold">Buchstaben</h3>
            <span className="text-sm text-dim">{playable} im Spiel</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1.5">
            {ALPHABET.map((l) => {
              const ex = s.excludedLetters.includes(l);
              return (
                <button
                  key={l}
                  disabled={!isHost}
                  aria-pressed={!ex}
                  title={ex ? `${l} wieder aufnehmen` : `${l} ausschließen`}
                  onClick={() =>
                    update({ excludedLetters: ex ? s.excludedLetters.filter((x) => x !== l) : [...s.excludedLetters, l] })
                  }
                  className={`aspect-square rounded-lg font-display text-base font-bold transition disabled:cursor-default ${
                    ex ? "border border-dashed border-rim text-dim/70" : "bg-tile/90 text-tile-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.2)] hover:bg-tile"
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel p-6" aria-labelledby="cats-h">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="cats-h" className="font-display text-xl font-bold">Kategorien</h2>
          <span className="text-sm text-dim">{s.categories.length} von 20</span>
        </div>
        <ul className="flex flex-wrap gap-2">
          {s.categories.map((c) => (
            <li key={c} className="chip py-1.5 pl-2.5">
              <CategoryIcon name={c} className="h-4 w-4 text-tile" />
              <span className="font-medium">{c}</span>
              {isHost && s.categories.length > 1 && (
                <button className="-mr-1 rounded-full p-0.5 text-dim hover:bg-white/10 hover:text-stop" aria-label={`${c} entfernen`} onClick={() => update({ categories: s.categories.filter((x) => x !== c) })}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>

        {isHost && (
          <div className="mt-5 space-y-4">
            <div className="flex gap-2">
              <input
                className="field"
                maxLength={30}
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                placeholder="Eigene Kategorie, z. B. Automarke"
                aria-label="Neue Kategorie"
              />
              <button className="btn-secondary shrink-0" onClick={addCategory} disabled={!newCat.trim()}>
                <Plus className="h-4 w-4" /> Hinzufügen
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-dim">Vorlage laden:</span>
              {Object.entries(PRESETS).map(([name, cats]) => (
                <button key={name} className="btn-quiet border border-rim px-3 py-1.5 text-sm" onClick={() => update({ categories: cats })}>
                  {name}
                </button>
              ))}
              {(packs.mine.length > 0 || packs.community.length > 0) && (
                <label className="relative ml-auto flex items-center">
                  <Library className="pointer-events-none absolute left-3 h-4 w-4 text-haze" />
                  <select
                    className="field w-auto py-1.5 pl-9 text-sm"
                    defaultValue=""
                    aria-label="Gespeichertes Paket laden"
                    onChange={(e) => {
                      const p = [...packs.mine, ...packs.community].find((x) => x.id === e.target.value);
                      if (p) loadPack(p);
                      e.target.value = "";
                    }}
                  >
                    <option value="" disabled>Paket laden</option>
                    {packs.mine.length > 0 && (
                      <optgroup label="Meine Pakete">
                        {packs.mine.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.categories.length})</option>)}
                      </optgroup>
                    )}
                    {packs.community.length > 0 && (
                      <optgroup label="Community">
                        {packs.community.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.categories.length})</option>)}
                      </optgroup>
                    )}
                  </select>
                </label>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-rim/60 pb-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-night-2 text-haze">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 font-medium">{label}</span>
      {children}
    </div>
  );
}

function Stepper(props: {
  icon: LucideIcon;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const step = props.step ?? 1;
  const set = (v: number) => props.onChange(Math.min(props.max, Math.max(props.min, v)));
  return (
    <Row icon={props.icon} label={props.label}>
      <div className="flex items-center gap-1">
        {!props.disabled && (
          <button className="icon-btn h-8 w-8 border border-rim" aria-label={`${props.label} verringern`} disabled={props.value <= props.min} onClick={() => set(props.value - step)}>
            <Minus className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="min-w-14 text-center font-display text-lg font-bold tabular-nums">
          {props.value}
          {props.unit && <span className="ml-0.5 text-sm font-medium text-dim">{props.unit}</span>}
        </span>
        {!props.disabled && (
          <button className="icon-btn h-8 w-8 border border-rim" aria-label={`${props.label} erhöhen`} disabled={props.value >= props.max} onClick={() => set(props.value + step)}>
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </Row>
  );
}

function Toggle(props: {
  icon: LucideIcon;
  label: string;
  on: boolean;
  onText: string;
  offText: string;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Row icon={props.icon} label={props.label}>
      <button
        role="switch"
        aria-checked={props.on}
        aria-label={props.label}
        disabled={props.disabled}
        onClick={() => props.onChange(!props.on)}
        className="flex items-center gap-2.5 text-sm font-semibold disabled:cursor-default"
      >
        <span className={props.on ? "text-chalk" : "text-dim"}>{props.on ? props.onText : props.offText}</span>
        <span className={`relative h-6 w-11 rounded-full transition-colors ${props.on ? "bg-tile" : "bg-rim"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-chalk shadow transition-all ${props.on ? "left-[1.375rem]" : "left-0.5"}`} />
        </span>
      </button>
    </Row>
  );
}
