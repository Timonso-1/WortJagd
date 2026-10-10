"use client";

import { useCallback, useEffect, useState } from "react";

export interface TableSettings {
  /** Sekunden pro Runde */
  roundTime: number;
  /** 0 = ohne Limit */
  rounds: number;
  categories: string[];
  excludedLetters: string[];
  /** Sekunden nach "Stopp" */
  stopGrace: number;
  bonusCategory: boolean;
}

export interface TablePlayer {
  id: string;
  name: string;
}

export interface TableRound {
  letter: string;
  bonus: string | null;
  /** null = noch nicht eingetragen */
  points: Record<string, number | null>;
}

export type TablePhase = "draw" | "running" | "paused" | "grace" | "timeup" | "scoring" | "finished";

export interface TableGame {
  id: string;
  startedAt: number;
  settings: TableSettings;
  players: TablePlayer[];
  rounds: TableRound[];
  phase: TablePhase;
  /** Ende des Timers (ms), in running/grace */
  endsAt: number | null;
  /** Restzeit beim Pausieren (ms) */
  pausedLeft: number | null;
  /** Gezogener Buchstabe, noch nicht gestartet */
  pending: { letter: string; bonus: string | null } | null;
}

export interface TableHistoryEntry {
  id: string;
  mode?: "classic" | "cards";
  startedAt: number;
  finishedAt: number;
  players: { name: string; total: number }[];
  letters: string[];
}

export const DEFAULT_TABLE_SETTINGS: TableSettings = {
  roundTime: 90,
  rounds: 8,
  categories: ["Stadt", "Land", "Fluss", "Name", "Tier", "Beruf"],
  excludedLetters: ["Q", "X", "Y"],
  stopGrace: 10,
  bonusCategory: false,
};

const KEY_GAME = "wj.table.game";
const KEY_HISTORY = "wj.table.history";
const KEY_LAST = "wj.table.last";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Speicher voll oder gesperrt */
  }
}

export function totals(game: Pick<TableGame, "players" | "rounds">): Record<string, number> {
  const t: Record<string, number> = {};
  for (const p of game.players) t[p.id] = 0;
  for (const r of game.rounds) for (const [pid, v] of Object.entries(r.points)) t[pid] = (t[pid] ?? 0) + (v ?? 0);
  return t;
}

/** Ergebnis einer Partie "Karten loswerden" für den gemeinsamen Verlauf */
export interface CardsArchive {
  id: string;
  startedAt: number;
  mode: "cards";
  players: TablePlayer[];
  rounds: never[];
  cardsResult: { name: string; total: number }[];
  categories: string[];
}

/** Spielstand mit automatischer Speicherung im Gerät */
export function useTableStore() {
  const [game, setGame] = useState<TableGame | null>(null);
  const [history, setHistory] = useState<TableHistoryEntry[]>([]);
  const [last, setLast] = useState<{ settings: TableSettings; players: TablePlayer[] } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setGame(read<TableGame | null>(KEY_GAME, null));
    setHistory(read<TableHistoryEntry[]>(KEY_HISTORY, []));
    setLast(read(KEY_LAST, null));
    setLoaded(true);
  }, []);

  const update = useCallback((fn: (g: TableGame) => TableGame | null) => {
    setGame((g) => {
      if (!g) return g;
      const next = fn(g);
      write(KEY_GAME, next);
      return next;
    });
  }, []);

  const start = useCallback((settings: TableSettings, players: TablePlayer[]) => {
    const g: TableGame = {
      id: crypto.randomUUID(),
      startedAt: Date.now(),
      settings,
      players,
      rounds: [],
      phase: "draw",
      endsAt: null,
      pausedLeft: null,
      pending: null,
    };
    write(KEY_GAME, g);
    write(KEY_LAST, { settings, players });
    setLast({ settings, players });
    setGame(g);
  }, []);

  const archive = useCallback((g: TableGame | CardsArchive) => {
    let entry: TableHistoryEntry;
    if ("mode" in g && g.mode === "cards") {
      entry = { id: g.id, mode: "cards", startedAt: g.startedAt, finishedAt: Date.now(), players: g.cardsResult, letters: g.categories };
    } else {
      const tg = g as TableGame;
      if (tg.rounds.length === 0) return;
      const t = totals(tg);
      entry = {
        id: tg.id,
        startedAt: tg.startedAt,
        finishedAt: Date.now(),
        players: tg.players.map((p) => ({ name: p.name, total: t[p.id] ?? 0 })).sort((a, b) => b.total - a.total),
        letters: tg.rounds.map((r) => r.letter),
      };
    }
    setHistory((h) => {
      const next = [entry, ...h.filter((x) => x.id !== g.id)].slice(0, 30);
      write(KEY_HISTORY, next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    write(KEY_GAME, null);
    setGame(null);
  }, []);

  return { game, history, last, loaded, start, update, archive, clear };
}
