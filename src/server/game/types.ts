export type Phase = "lobby" | "playing" | "voting" | "results" | "finished";

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
}

export interface Player {
  id: string; // clientId (Gast) oder userId
  userId: string | null;
  nickname: string;
  image: string | null;
  socketIds: Set<string>;
  score: number;
  connected: boolean;
  joinedAt: number;
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
  startedAt: number;
  endsAt: number;
  stoppedBy: string | null;
  answers: AnswerMap;
  votes: VoteMap;
  score: RoundScore | null;
}

export interface ChatMessage {
  id: string;
  playerId: string | null;
  nickname: string;
  text: string;
  at: number;
  system?: boolean;
}

// ---------- Client-Sicht ----------

export interface PublicPlayer {
  id: string;
  nickname: string;
  image: string | null;
  score: number;
  connected: boolean;
  isHost: boolean;
  isGuest: boolean;
  /** Während der Runde: Anzahl ausgefüllter Felder (keine Inhalte) */
  filled?: number;
  /** Während der Abstimmung: fertig */
  ready?: boolean;
}

export interface PublicRound {
  index: number;
  letter: string;
  startedAt: number;
  endsAt: number;
  stoppedBy: string | null;
  /** nur in voting/results/finished gefüllt */
  answers?: AnswerMap;
  /** votes als Liste der Ablehnenden */
  votes?: Record<string, string[]>;
  score?: RoundScore | null;
}

export interface RoomState {
  code: string;
  phase: Phase;
  settings: RoomSettings;
  players: PublicPlayer[];
  hostId: string;
  you: string;
  round: PublicRound | null;
  /** eigene Antworten in der laufenden Runde */
  myAnswers: string[];
  history: { letter: string; totals: Record<string, number> }[];
  serverTime: number;
}

export interface LobbyRoom {
  code: string;
  hostName: string;
  players: number;
  maxPlayers: number;
  rounds: number;
  categories: number;
  phase: Phase;
}
