import type { AnswerMap, RoundScore, VoteMap } from "./types";

export const POINTS = { ONLY: 20, UNIQUE: 10, DUPLICATE: 5, INVALID: 0 } as const;

/** Vergleichsform: klein, ohne Diakritika, ß->ss, Leerzeichen normalisiert */
export function normalize(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function startsWithLetter(word: string, letter: string): boolean {
  const n = normalize(word);
  return n.length >= 2 && n.startsWith(letter.toLowerCase());
}

export function voteKey(playerId: string, categoryIndex: number): string {
  return `${playerId}:${categoryIndex}`;
}

/**
 * Ein Wort ist ungültig, wenn es leer ist, nicht mit dem Buchstaben beginnt,
 * oder mehr als die Hälfte der stimmberechtigten Mitspieler es ablehnt.
 */
export function isValid(
  word: string,
  letter: string,
  rejectVotes: number,
  eligibleVoters: number,
): boolean {
  if (!startsWithLetter(word, letter)) return false;
  if (eligibleVoters <= 0) return true;
  return rejectVotes * 2 <= eligibleVoters;
}

export interface ScoreOptions {
  /** Joker: playerId -> Kategorie-Index mit doppelten Punkten */
  jokers?: Record<string, number>;
  /** Faktor für die ganze Runde (z. B. 2 bei doppelter Schlussrunde) */
  multiplier?: number;
}

export function scoreRound(
  letter: string,
  categoryCount: number,
  playerIds: string[],
  answers: AnswerMap,
  votes: VoteMap,
  opts: ScoreOptions = {},
): RoundScore {
  const valid: Record<string, boolean[]> = {};
  const points: Record<string, number[]> = {};
  const total: Record<string, number> = {};

  for (const pid of playerIds) {
    valid[pid] = [];
    const eligible = playerIds.length - 1;
    for (let c = 0; c < categoryCount; c++) {
      const word = answers[pid]?.[c] ?? "";
      const rejects = votes[voteKey(pid, c)];
      // Eigene Stimme zählt nicht
      const count = rejects ? [...rejects].filter((v) => v !== pid).length : 0;
      valid[pid][c] = isValid(word, letter, count, eligible);
    }
  }

  for (let c = 0; c < categoryCount; c++) {
    const validPlayers = playerIds.filter((p) => valid[p][c]);
    const counts = new Map<string, number>();
    for (const p of validPlayers) {
      const n = normalize(answers[p][c]);
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    for (const p of playerIds) {
      points[p] ??= [];
      if (!valid[p][c]) {
        points[p][c] = POINTS.INVALID;
      } else if (validPlayers.length === 1) {
        points[p][c] = POINTS.ONLY;
      } else if ((counts.get(normalize(answers[p][c])) ?? 0) > 1) {
        points[p][c] = POINTS.DUPLICATE;
      } else {
        points[p][c] = POINTS.UNIQUE;
      }
    }
  }

  const mult = opts.multiplier ?? 1;
  for (const p of playerIds) {
    const joker = opts.jokers?.[p];
    points[p] = points[p].map((pts, c) => pts * mult * (joker === c ? 2 : 1));
    total[p] = points[p].reduce((a, b) => a + b, 0);
  }
  return { points, valid, total };
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function pickLetter(excluded: string[], used: string[]): string {
  const ex = new Set(excluded.map((l) => l.toUpperCase()));
  let pool = ALPHABET.filter((l) => !ex.has(l) && !used.includes(l));
  if (pool.length === 0) pool = ALPHABET.filter((l) => !ex.has(l));
  if (pool.length === 0) pool = ALPHABET;
  return pool[Math.floor(Math.random() * pool.length)];
}
