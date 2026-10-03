import type { Hint } from "./wordcheck";

export type Phase = "lobby" | "playing" | "voting" | "results" | "finished";
export type RoundModifier = "blitz" | "double" | null;

export const REACTIONS = ["😂", "🔥", "🤯", "👏", "🤔"] as const;
export type Reaction = (typeof REACTIONS)[number];

export interface AvatarStyle {
  color: string;
  icon: string;
}

export interface RoomSettings {
  rounds: number;
  /** Sekunden pro Runde */
  roundTime: number;
  categories: string[];
  excludedLetters: string[];
  /** Spieler darf Runde vorzeitig beenden, wenn alle Felder ausgefüllt sind */
  allowStop: boolean;
  /** Nach "Stopp" bleiben noch so viele Sekunden */
  stopGrace: number;
  isPublic: boolean;
  maxPlayers: number;
  /** Zufällige Blitzrunden mit halber Zeit */
  blitz: boolean;
  /** Letzte Runde zählt doppelt */
  doubleFinal: boolean;
  /** Jede Runde eine zusätzliche Zufallskategorie */
  bonusCategory: boolean;
  /** Jeder Spieler hat pro Spiel einen Joker (doppelte Punkte in einer Kategorie) */
  jokers: boolean;
}

export interface Player {
  id: string; // clientId (Gast) oder userId
  userId: string | null;
  nickname: string;
  image: string | null;
  avatar: AvatarStyle | null;
  socketIds: Set<string>;
  score: number;
  connected: boolean;
  joinedAt: number;
  lobbyReady: boolean;
  jokerUsed: boolean;
}

export interface Spectator {
  id: string;
  nickname: string;
  image: string | null;
  avatar: AvatarStyle | null;
  socketIds: Set<string>;
}

/** answers[playerId][categoryIndex] */
export type AnswerMap = Record<string, string[]>;

/** votes[`${playerId}:${categoryIndex}`] = Set der Spieler, die das Wort ablehnen */
export type VoteMap = Record<string, Set<string>>;

export interface RoundScore {
  /** points[playerId][categoryIndex] */
  points: Record<string, number[]>;
  valid: Record<string, boolean[]>;
  total: Record<string, number>;
}

export interface Round {
  index: number;
  letter: string;
  categories: string[];
  /** Index der Bonuskategorie in `categories`, falls vorhanden */
  bonusIndex: number | null;
  modifier: RoundModifier;
  duration: number;
  startedAt: number;
  endsAt: number;
  stoppedBy: string | null;
  answers: AnswerMap;
  votes: VoteMap;
  /** playerId -> Kategorie-Index */
  jokers: Record<string, number>;
  /** key -> emoji -> Spieler */
  reactions: Record<string, Partial<Record<Reaction, Set<string>>>>;
  /** key -> Hinweis aus Wortliste */
  hints: Record<string, Hint>;
  score: RoundScore | null;
}

export interface ChatMessage {
  id: string;
  playerId: string | null;
  nickname: string;
  text: string;
  at: number;
  system?: boolean;
  spectator?: boolean;
}

// ---------- Client-Sicht ----------

export interface PublicPlayer {
  id: string;
  nickname: string;
  image: string | null;
  avatar: AvatarStyle | null;
  score: number;
  connected: boolean;
  isHost: boolean;
  isGuest: boolean;
  /** Lobby: bereit */
  lobbyReady: boolean;
  jokerUsed: boolean;
  /** Während der Runde: Anzahl ausgefüllter Felder (keine Inhalte) */
  filled?: number;
  /** Während der Abstimmung: fertig */
  ready?: boolean;
}

export interface PublicSpectator {
  id: string;
  nickname: string;
  image: string | null;
  avatar: AvatarStyle | null;
}

export interface PublicRound {
  index: number;
  letter: string;
  categories: string[];
  bonusIndex: number | null;
  modifier: RoundModifier;
  duration: number;
  startedAt: number;
  endsAt: number;
  stoppedBy: string | null;
  /** nur in voting/results/finished gefüllt */
  answers?: AnswerMap;
  /** votes als Liste der Ablehnenden */
  votes?: Record<string, string[]>;
  jokers?: Record<string, number>;
  reactions?: Record<string, Partial<Record<Reaction, string[]>>>;
  hints?: Record<string, Hint>;
  score?: RoundScore | null;
}

export interface RoomState {
  code: string;
  phase: Phase;
  settings: RoomSettings;
  players: PublicPlayer[];
  spectators: PublicSpectator[];
  hostId: string;
  you: string;
  isSpectator: boolean;
  round: PublicRound | null;
  /** eigene Antworten in der laufenden Runde */
  myAnswers: string[];
  /** eigener Joker in der laufenden Runde */
  myJoker: number | null;
  history: { letter: string; modifier: RoundModifier; totals: Record<string, number> }[];
  savedGameId: string | null;
  serverTime: number;
}

export interface LobbyRoom {
  code: string;
  hostName: string;
  players: number;
  spectators: number;
  maxPlayers: number;
  rounds: number;
  categories: number;
  phase: Phase;
}
