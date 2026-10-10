"use client";

import { useCallback, useEffect, useState } from "react";

export type CheckMode = "after" | "live";

export interface CardsSettings {
  cardsPerPlayer: number;
  /** Sekunden pro Kategorie */
  roundTime: number;
  /** true = App teilt Buchstaben aus, false = echte Karten, App zählt nur */
  dealt: boolean;
  check: CheckMode;
  categories: string[];
  excludedLetters: string[];
}

export interface CardsPlayer {
  id: string;
  name: string;
  /** Nur bei dealt: Buchstaben auf der Hand */
  letters: string[];
  /** Karten auf der Hand */
  count: number;
  /** Runde, in der der Spieler fertig wurde (1-basiert) */
  finishedRound: number | null;
  /** Reihenfolge des Fertigwerdens (1 = zuerst) */
  finishedOrder: number | null;
}

export interface CardsRound {
  category: string;
  /** dealt: abgelegte Buchstaben, sonst Anzahl */
  removed: Record<string, string[] | number>;
}

export type CardsPhase = "category" | "running" | "paused" | "check" | "finished";

export interface CardsGame {
  id: string;
  startedAt: number;
  settings: CardsSettings;
  players: CardsPlayer[];
  rounds: CardsRound[];
  phase: CardsPhase;
  endsAt: number | null;
  pausedLeft: number | null;
  pendingCategory: string | null;
  usedCategories: string[];
  /** Zählt fertige Spieler für die Platzierung */
  finishedCount: number;
}

export const CARD_CATEGORIES = [
  "Stadt", "Land", "Fluss", "Name", "Tier", "Beruf", "Pflanze", "Essen", "Getränk", "Marke",
  "Sportart", "Film", "Serie", "Band", "Videospiel", "Promi", "Körperteil", "Werkzeug",
  "Musikinstrument", "Kleidung", "Hobby", "Farbe", "Gemüse", "Obst", "Süßigkeit", "Spielzeug",
  "Möbelstück", "Märchenfigur", "Superheld", "Automarke",
];

export const DEFAULT_CARDS_SETTINGS: CardsSettings = {
  cardsPerPlayer: 3,
  roundTime: 60,
  dealt: true,
  check: "after",
  categories: CARD_CATEGORIES,
  excludedLetters: ["Q", "X", "Y"],
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const KEY_GAME = "wj.cards.game";
const KEY_LAST = "wj.cards.last";

export function playableLetters(s: Pick<CardsSettings, "excludedLetters">) {
  return ALPHABET.filter((l) => !s.excludedLetters.includes(l));
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function newCardsGame(settings: CardsSettings, players: { id: string; name: string }[]): CardsGame {
  const deck = shuffle(playableLetters(settings));
  return {
    id: crypto.randomUUID(),
    startedAt: Date.now(),
    settings,
    players: players.map((p, i) => {
      const letters = settings.dealt ? deck.slice(i * settings.cardsPerPlayer, (i + 1) * settings.cardsPerPlayer).sort() : [];
      return { id: p.id, name: p.name, letters, count: settings.cardsPerPlayer, finishedRound: null, finishedOrder: null };
    }),
    rounds: [],
    phase: "category",
    endsAt: null,
    pausedLeft: null,
    pendingCategory: null,
    usedCategories: [],
    finishedCount: 0,
  };
}

export function drawCategory(g: CardsGame): string {
  let pool = g.settings.categories.filter((c) => !g.usedCategories.includes(c));
  if (pool.length === 0) pool = g.settings.categories;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Karten eines Spielers entfernen; markiert ihn als fertig, wenn keine mehr übrig sind */
export function removeCards(g: CardsGame, playerId: string, letters: string[] | number): CardsGame {
  const roundNo = g.rounds.length;
  let finishedCount = g.finishedCount;
  const players = g.players.map((p) => {
    if (p.id !== playerId || p.finishedRound !== null) return p;
    const n = typeof letters === "number" ? letters : letters.length;
    const remaining = typeof letters === "number" ? p.letters : p.letters.filter((l) => !letters.includes(l));
    const count = Math.max(0, p.count - n);
    const done = count === 0;
    if (done) finishedCount++;
    return { ...p, letters: remaining, count, finishedRound: done ? roundNo : null, finishedOrder: done ? finishedCount : null };
  });
  const rounds = g.rounds.slice();
  const cur = rounds[rounds.length - 1];
  if (cur) {
    const prev = cur.removed[playerId];
    const merged =
      typeof letters === "number"
        ? (typeof prev === "number" ? prev : 0) + letters
        : [...(Array.isArray(prev) ? prev : []), ...letters];
    rounds[rounds.length - 1] = { ...cur, removed: { ...cur.removed, [playerId]: merged } };
  }
  return { ...g, players, rounds, finishedCount };
}

/** Letztes Ablegen eines Spielers in der laufenden Runde rückgängig machen */
export function undoLast(g: CardsGame, playerId: string): CardsGame {
  const rounds = g.rounds.slice();
  const cur = rounds[rounds.length - 1];
  if (!cur) return g;
  const prev = cur.removed[playerId];
  let restored: string | null = null;
  let restoreCount = 0;
  if (Array.isArray(prev) && prev.length) {
    restored = prev[prev.length - 1];
    restoreCount = 1;
    rounds[rounds.length - 1] = { ...cur, removed: { ...cur.removed, [playerId]: prev.slice(0, -1) } };
  } else if (typeof prev === "number" && prev > 0) {
    restoreCount = 1;
    rounds[rounds.length - 1] = { ...cur, removed: { ...cur.removed, [playerId]: prev - 1 } };
  } else return g;
  let finishedCount = g.finishedCount;
  const players = g.players.map((p) => {
    if (p.id !== playerId) return p;
    const wasDone = p.finishedOrder !== null;
    if (wasDone) finishedCount--;
    return {
      ...p,
      letters: restored ? [...p.letters, restored].sort() : p.letters,
      count: p.count + restoreCount,
      finishedRound: null,
      finishedOrder: null,
    };
  });
  return { ...g, players, rounds, finishedCount };
}

export function allDone(g: CardsGame) {
  return g.players.every((p) => p.finishedRound !== null);
}

export function useCardsStore() {
  const [game, setGame] = useState<CardsGame | null>(null);
  const [last, setLast] = useState<{ settings: CardsSettings; players: { id: string; name: string }[] } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setGame(JSON.parse(localStorage.getItem(KEY_GAME) ?? "null"));
      setLast(JSON.parse(localStorage.getItem(KEY_LAST) ?? "null"));
    } catch {
      /* ungültig */
    }
    setLoaded(true);
  }, []);

  const save = (g: CardsGame | null) => {
    try {
      if (g) localStorage.setItem(KEY_GAME, JSON.stringify(g));
      else localStorage.removeItem(KEY_GAME);
    } catch {
      /* Speicher gesperrt */
    }
  };

  const update = useCallback((fn: (g: CardsGame) => CardsGame | null) => {
    setGame((g) => {
      if (!g) return g;
      const next = fn(g);
      save(next);
      return next;
    });
  }, []);

  const start = useCallback((settings: CardsSettings, players: { id: string; name: string }[]) => {
    const g = newCardsGame(settings, players);
    save(g);
    try {
      localStorage.setItem(KEY_LAST, JSON.stringify({ settings, players }));
    } catch {
      /* egal */
    }
    setLast({ settings, players });
    setGame(g);
  }, []);

  const clear = useCallback(() => {
    save(null);
    setGame(null);
  }, []);

  return { game, last, loaded, start, update, clear };
}
