import { nanoid } from "nanoid";
import { pickLetter, scoreRound, voteKey } from "./scoring";
import type {
  ChatMessage,
  LobbyRoom,
  Phase,
  Player,
  PublicPlayer,
  RoomSettings,
  RoomState,
  Round,
} from "./types";

export const DEFAULT_CATEGORIES = ["Stadt", "Land", "Fluss", "Name", "Tier", "Beruf"];

export const DEFAULT_SETTINGS: RoomSettings = {
  rounds: 5,
  roundTime: 90,
  categories: DEFAULT_CATEGORIES,
  excludedLetters: ["Q", "X", "Y"],
  allowStop: true,
  stopGrace: 10,
  isPublic: false,
  maxPlayers: 12,
};

export interface JoinInfo {
  id: string;
  userId: string | null;
  nickname: string;
  image: string | null;
}

export class GameError extends Error {}

export interface RoomHooks {
  changed(room: Room): void;
  chat(room: Room, msg: ChatMessage): void;
  finished(room: Room): void;
}

const CHAT_LIMIT = 100;

export class Room {
  readonly code: string;
  readonly createdAt = Date.now();
  hostId: string;
  settings: RoomSettings;
  phase: Phase = "lobby";
  players = new Map<string, Player>();
  rounds: Round[] = [];
  chat: ChatMessage[] = [];
  readyForResults = new Set<string>();
  gameStartedAt = 0;
  lastActivity = Date.now();
  private timer: NodeJS.Timeout | null = null;
  private revealTimer: NodeJS.Timeout | null = null;

  constructor(code: string, host: JoinInfo, private hooks: RoomHooks, settings?: Partial<RoomSettings>) {
    this.code = code;
    this.hostId = host.id;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  get currentRound(): Round | null {
    return this.rounds.at(-1) ?? null;
  }

  get connectedPlayers(): Player[] {
    return [...this.players.values()].filter((p) => p.connected);
  }

  // ---------- Spieler ----------

  join(info: JoinInfo, socketId: string): Player {
    this.lastActivity = Date.now();
    let p = this.players.get(info.id);
    if (!p) {
      if (this.connectedPlayers.length >= this.settings.maxPlayers) {
        throw new GameError("Der Raum ist voll.");
      }
      p = {
        id: info.id,
        userId: info.userId,
        nickname: uniqueNick(info.nickname, [...this.players.values()].map((x) => x.nickname)),
        image: info.image,
        socketIds: new Set(),
        score: 0,
        connected: true,
        joinedAt: Date.now(),
      };
      this.players.set(p.id, p);
      this.system(`${p.nickname} ist beigetreten.`);
    } else if (!p.connected) {
      this.system(`${p.nickname} ist wieder da.`);
    }
    p.socketIds.add(socketId);
    p.connected = true;
    if (!this.players.get(this.hostId)?.connected) this.hostId = p.id;
    this.hooks.changed(this);
    return p;
  }

  disconnect(playerId: string, socketId: string) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.socketIds.delete(socketId);
    if (p.socketIds.size > 0) return;
    p.connected = false;
    this.system(`${p.nickname} hat den Raum verlassen.`);
    // In der Lobby fliegen Getrennte direkt raus
    if (this.phase === "lobby") this.players.delete(p.id);
    if (this.hostId === p.id) {
      const next = this.connectedPlayers.sort((a, b) => a.joinedAt - b.joinedAt)[0];
      if (next) {
        this.hostId = next.id;
        this.system(`${next.nickname} ist jetzt Spielleiter.`);
      }
    }
    this.readyForResults.delete(p.id);
    this.hooks.changed(this);
    this.maybeFinishVoting();
  }

  kick(by: string, target: string) {
    this.requireHost(by);
    if (target === by) throw new GameError("Du kannst dich nicht selbst entfernen.");
    const p = this.players.get(target);
    if (!p) return null;
    this.players.delete(target);
    this.system(`${p.nickname} wurde entfernt.`);
    this.hooks.changed(this);
    return p;
  }

  transferHost(by: string, target: string) {
    this.requireHost(by);
    const p = this.players.get(target);
    if (!p?.connected) throw new GameError("Spieler nicht verfügbar.");
    this.hostId = target;
    this.system(`${p.nickname} ist jetzt Spielleiter.`);
    this.hooks.changed(this);
  }

  // ---------- Einstellungen ----------

  updateSettings(by: string, patch: Partial<RoomSettings>) {
    this.requireHost(by);
    if (this.phase !== "lobby" && this.phase !== "finished") {
      throw new GameError("Einstellungen nur vor Spielbeginn änderbar.");
    }
    this.settings = { ...this.settings, ...patch };
    this.hooks.changed(this);
  }

  // ---------- Ablauf ----------

  start(by: string) {
    this.requireHost(by);
    if (this.phase !== "lobby" && this.phase !== "finished") throw new GameError("Spiel läuft bereits.");
    if (this.settings.categories.length === 0) throw new GameError("Mindestens eine Kategorie nötig.");
    // Getrennte Spieler aus der letzten Partie entfernen, Punkte zurücksetzen
    for (const p of this.players.values()) {
      if (!p.connected) this.players.delete(p.id);
      else p.score = 0;
    }
    this.rounds = [];
    this.gameStartedAt = Date.now();
    this.system("Das Spiel beginnt.");
    this.startRound();
  }

  private startRound() {
    const used = this.rounds.map((r) => r.letter);
    const letter = pickLetter(this.settings.excludedLetters, used);
    const now = Date.now();
    // 3 Sekunden Countdown vor Start
    const startedAt = now + 3000;
    this.rounds.push({
      index: this.rounds.length,
      letter,
      startedAt,
      endsAt: startedAt + this.settings.roundTime * 1000,
      stoppedBy: null,
      answers: {},
      votes: {},
      score: null,
    });
    this.phase = "playing";
    this.readyForResults.clear();
    this.schedule(this.currentRound!.endsAt - now, () => this.endRound());
    if (this.revealTimer) clearTimeout(this.revealTimer);
    this.revealTimer = setTimeout(() => this.hooks.changed(this), startedAt - now);
    this.hooks.changed(this);
  }

  setAnswers(playerId: string, answers: string[]) {
    const r = this.currentRound;
    if (this.phase !== "playing" || !r || !this.players.has(playerId)) return;
    if (Date.now() < r.startedAt) return;
    const n = this.settings.categories.length;
    r.answers[playerId] = Array.from({ length: n }, (_, i) => String(answers[i] ?? "").slice(0, 60));
    this.lastActivity = Date.now();
    this.hooks.changed(this);
  }

  stop(playerId: string) {
    const r = this.currentRound;
    if (this.phase !== "playing" || !r || r.stoppedBy) return;
    if (!this.settings.allowStop) throw new GameError("Stopp ist deaktiviert.");
    const mine = r.answers[playerId] ?? [];
    const filled = mine.filter((a) => a.trim().length > 0).length;
    if (filled < this.settings.categories.length) throw new GameError("Erst alle Felder ausfüllen.");
    const p = this.players.get(playerId)!;
    r.stoppedBy = playerId;
    const newEnd = Math.min(r.endsAt, Date.now() + this.settings.stopGrace * 1000);
    r.endsAt = newEnd;
    this.system(`${p.nickname} hat Stopp gerufen.`);
    this.schedule(newEnd - Date.now(), () => this.endRound());
    this.hooks.changed(this);
  }

  private endRound() {
    if (this.phase !== "playing") return;
    this.clearTimer();
    this.phase = "voting";
    this.hooks.changed(this);
    this.maybeFinishVoting();
  }

  toggleVote(voter: string, target: string, categoryIndex: number) {
    const r = this.currentRound;
    if (this.phase !== "voting" || !r) return;
    if (voter === target || !this.players.has(voter) || !this.players.has(target)) return;
    if (!(r.answers[target]?.[categoryIndex] ?? "").trim()) return;
    const key = voteKey(target, categoryIndex);
    const set = (r.votes[key] ??= new Set());
    if (set.has(voter)) set.delete(voter);
    else set.add(voter);
    this.readyForResults.delete(voter);
    this.hooks.changed(this);
  }

  setReady(playerId: string, ready: boolean) {
    if (this.phase !== "voting") return;
    if (ready) this.readyForResults.add(playerId);
    else this.readyForResults.delete(playerId);
    this.hooks.changed(this);
    this.maybeFinishVoting();
  }

  forceResults(by: string) {
    this.requireHost(by);
    if (this.phase === "voting") this.finishVoting();
  }

  private maybeFinishVoting() {
    if (this.phase !== "voting") return;
    const connected = this.connectedPlayers;
    if (connected.length > 0 && connected.every((p) => this.readyForResults.has(p.id))) {
      this.finishVoting();
    }
  }

  private finishVoting() {
    const r = this.currentRound!;
    const ids = [...this.players.keys()];
    r.score = scoreRound(r.letter, this.settings.categories.length, ids, r.answers, r.votes);
    for (const id of ids) this.players.get(id)!.score += r.score.total[id] ?? 0;
    this.phase = "results";
    this.hooks.changed(this);
  }

  next(by: string) {
    this.requireHost(by);
    if (this.phase !== "results") return;
    if (this.rounds.length >= this.settings.rounds) {
      this.phase = "finished";
      this.system("Spiel beendet.");
      this.hooks.changed(this);
      this.hooks.finished(this);
    } else {
      this.startRound();
    }
  }

  backToLobby(by: string) {
    this.requireHost(by);
    this.clearTimer();
    this.phase = "lobby";
    this.rounds = [];
    for (const p of this.players.values()) {
      if (!p.connected) this.players.delete(p.id);
      else p.score = 0;
    }
    this.hooks.changed(this);
  }

  // ---------- Chat ----------

  say(playerId: string, text: string) {
    const p = this.players.get(playerId);
    const clean = text.trim().slice(0, 300);
    if (!p || !clean) return;
    this.pushChat({ id: nanoid(8), playerId, nickname: p.nickname, text: clean, at: Date.now() });
  }

  private system(text: string) {
    this.pushChat({ id: nanoid(8), playerId: null, nickname: "", text, at: Date.now(), system: true });
  }

  private pushChat(msg: ChatMessage) {
    this.chat.push(msg);
    if (this.chat.length > CHAT_LIMIT) this.chat.splice(0, this.chat.length - CHAT_LIMIT);
    this.hooks.chat(this, msg);
  }

  // ---------- Sichten ----------

  stateFor(playerId: string): RoomState {
    const r = this.currentRound;
    const reveal = this.phase !== "playing";
    const players: PublicPlayer[] = [...this.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => ({
        id: p.id,
        nickname: p.nickname,
        image: p.image,
        score: p.score,
        connected: p.connected,
        isHost: p.id === this.hostId,
        isGuest: p.userId === null,
        filled:
          this.phase === "playing" && r
            ? (r.answers[p.id] ?? []).filter((a) => a.trim()).length
            : undefined,
        ready: this.phase === "voting" ? this.readyForResults.has(p.id) : undefined,
      }));

    return {
      code: this.code,
      phase: this.phase,
      settings: this.settings,
      players,
      hostId: this.hostId,
      you: playerId,
      round: r
        ? {
            index: r.index,
            letter: Date.now() >= r.startedAt || reveal ? r.letter : "",
            startedAt: r.startedAt,
            endsAt: r.endsAt,
            stoppedBy: r.stoppedBy,
            answers: reveal ? r.answers : undefined,
            votes: reveal
              ? Object.fromEntries(Object.entries(r.votes).map(([k, v]) => [k, [...v]]))
              : undefined,
            score: reveal ? r.score : undefined,
          }
        : null,
      myAnswers: r?.answers[playerId] ?? [],
      history: this.rounds
        .filter((x) => x.score)
        .map((x) => ({ letter: x.letter, totals: x.score!.total })),
      serverTime: Date.now(),
    };
  }

  lobbyInfo(): LobbyRoom {
    return {
      code: this.code,
      hostName: this.players.get(this.hostId)?.nickname ?? "?",
      players: this.connectedPlayers.length,
      maxPlayers: this.settings.maxPlayers,
      rounds: this.settings.rounds,
      categories: this.settings.categories.length,
      phase: this.phase,
    };
  }

  // ---------- intern ----------

  private requireHost(id: string) {
    if (id !== this.hostId) throw new GameError("Nur der Spielleiter darf das.");
  }

  private schedule(ms: number, fn: () => void) {
    this.clearTimer();
    this.timer = setTimeout(fn, Math.max(0, ms));
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  dispose() {
    this.clearTimer();
    if (this.revealTimer) clearTimeout(this.revealTimer);
  }
}

function uniqueNick(nick: string, taken: string[]): string {
  const base = nick.trim().slice(0, 20) || "Gast";
  if (!taken.includes(base)) return base;
  for (let i = 2; ; i++) if (!taken.includes(`${base} ${i}`)) return `${base} ${i}`;
}
