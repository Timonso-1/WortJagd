import { nanoid } from "nanoid";
import { pickLetter, scoreRound, voteKey } from "./scoring";
import { checkWord } from "./wordcheck";
import {
  REACTIONS,
  type AvatarStyle,
  type ChatMessage,
  type LobbyRoom,
  type Phase,
  type Player,
  type PublicPlayer,
  type Reaction,
  type RoomSettings,
  type RoomState,
  type Round,
  type RoundModifier,
  type Spectator,
} from "./types";

export const DEFAULT_CATEGORIES = ["Stadt", "Land", "Fluss", "Name", "Tier", "Beruf"];

export const BONUS_POOL = [
  "Pflanze", "Essen", "Getränk", "Marke", "Sportart", "Film", "Serie", "Band", "Videospiel", "Promi",
  "Körperteil", "Werkzeug", "Musikinstrument", "Kleidung", "Automarke", "Hobby", "Farbe", "Sehenswürdigkeit",
  "Gemüse", "Obst", "Superheld", "Märchenfigur", "Spielzeug", "Süßigkeit", "Gebirge", "Insel", "Krankheit",
  "Möbelstück", "Comicfigur", "Ausrede fürs Zuspätkommen",
];

export const DEFAULT_SETTINGS: RoomSettings = {
  rounds: 5,
  roundTime: 90,
  categories: DEFAULT_CATEGORIES,
  excludedLetters: ["Q", "X", "Y"],
  allowStop: true,
  stopGrace: 10,
  isPublic: false,
  maxPlayers: 12,
  blitz: false,
  doubleFinal: false,
  bonusCategory: false,
  jokers: false,
};

const BLITZ_CHANCE = 0.3;
const COUNTDOWN_MS = 3000;
const CHAT_LIMIT = 100;
const MAX_SPECTATORS = 50;

export interface JoinInfo {
  id: string;
  userId: string | null;
  nickname: string;
  image: string | null;
  avatar: AvatarStyle | null;
}

export class GameError extends Error {}

export interface RoomHooks {
  changed(room: Room): void;
  chat(room: Room, msg: ChatMessage): void;
  finished(room: Room): void;
}

export class Room {
  readonly code: string;
  readonly createdAt = Date.now();
  hostId: string;
  settings: RoomSettings;
  phase: Phase = "lobby";
  players = new Map<string, Player>();
  spectators = new Map<string, Spectator>();
  rounds: Round[] = [];
  chat: ChatMessage[] = [];
  readyForResults = new Set<string>();
  gameStartedAt = 0;
  /** ID der gespeicherten letzten Partie (für den Spielverlauf) */
  savedGameId: string | null = null;
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

  get connectedSpectators(): Spectator[] {
    return [...this.spectators.values()].filter((s) => s.socketIds.size > 0);
  }

  // ---------- Spieler ----------

  join(info: JoinInfo, socketId: string): Player {
    this.lastActivity = Date.now();
    this.removeSpectatorSocket(info.id, socketId, true);
    let p = this.players.get(info.id);
    if (!p) {
      if (this.connectedPlayers.length >= this.settings.maxPlayers) {
        throw new GameError("Der Raum ist voll. Du kannst zuschauen.");
      }
      p = {
        id: info.id,
        userId: info.userId,
        nickname: uniqueNick(info.nickname, [...this.players.values()].map((x) => x.nickname)),
        image: info.image,
        avatar: info.avatar,
        socketIds: new Set(),
        score: 0,
        connected: true,
        joinedAt: Date.now(),
        lobbyReady: false,
        jokerUsed: false,
      };
      this.players.set(p.id, p);
      this.system(`${p.nickname} ist beigetreten.`);
    } else {
      if (!p.connected) this.system(`${p.nickname} ist wieder da.`);
      p.avatar = info.avatar ?? p.avatar;
    }
    p.socketIds.add(socketId);
    p.connected = true;
    if (!this.players.get(this.hostId)?.connected) this.hostId = p.id;
    this.hooks.changed(this);
    return p;
  }

  watch(info: JoinInfo, socketId: string): Spectator {
    this.lastActivity = Date.now();
    const existing = this.players.get(info.id);
    if (existing?.connected) throw new GameError("Du spielst in diesem Raum bereits mit.");
    let s = this.spectators.get(info.id);
    if (!s) {
      if (this.spectators.size >= MAX_SPECTATORS) throw new GameError("Zu viele Zuschauer.");
      s = { id: info.id, nickname: info.nickname.trim().slice(0, 20) || "Gast", image: info.image, avatar: info.avatar, socketIds: new Set() };
      this.spectators.set(s.id, s);
      this.system(`${s.nickname} schaut zu.`);
    }
    s.socketIds.add(socketId);
    this.hooks.changed(this);
    return s;
  }

  private removeSpectatorSocket(id: string, socketId: string, silent = false) {
    const s = this.spectators.get(id);
    if (!s) return false;
    s.socketIds.delete(socketId);
    if (s.socketIds.size === 0) {
      this.spectators.delete(id);
      if (!silent) this.system(`${s.nickname} schaut nicht mehr zu.`);
    }
    return true;
  }

  disconnect(playerId: string, socketId: string) {
    if (this.removeSpectatorSocket(playerId, socketId)) {
      this.hooks.changed(this);
      return;
    }
    const p = this.players.get(playerId);
    if (!p) return;
    p.socketIds.delete(socketId);
    if (p.socketIds.size > 0) return;
    p.connected = false;
    p.lobbyReady = false;
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

  setLobbyReady(playerId: string, ready: boolean) {
    const p = this.players.get(playerId);
    if (!p || (this.phase !== "lobby" && this.phase !== "finished")) return;
    p.lobbyReady = ready;
    this.hooks.changed(this);
  }

  setAvatar(playerId: string, avatar: AvatarStyle) {
    const p = this.players.get(playerId) ?? this.spectators.get(playerId);
    if (!p) return;
    p.avatar = avatar;
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

  /** Spieler außer dem Host, die noch nicht bereit sind */
  get notReady(): Player[] {
    return this.connectedPlayers.filter((p) => p.id !== this.hostId && !p.lobbyReady);
  }

  start(by: string) {
    this.requireHost(by);
    if (this.phase !== "lobby" && this.phase !== "finished") throw new GameError("Spiel läuft bereits.");
    if (this.settings.categories.length === 0) throw new GameError("Mindestens eine Kategorie nötig.");
    const waiting = this.notReady;
    if (waiting.length > 0) {
      throw new GameError(`Noch nicht bereit: ${waiting.map((p) => p.nickname).join(", ")}`);
    }
    // Getrennte Spieler aus der letzten Partie entfernen, Werte zurücksetzen
    for (const p of this.players.values()) {
      if (!p.connected) this.players.delete(p.id);
      else {
        p.score = 0;
        p.jokerUsed = false;
        p.lobbyReady = false;
      }
    }
    this.rounds = [];
    this.savedGameId = null;
    this.gameStartedAt = Date.now();
    this.system("Das Spiel beginnt.");
    this.startRound();
  }

  private startRound() {
    const s = this.settings;
    const index = this.rounds.length;
    const used = this.rounds.map((r) => r.letter);
    const letter = pickLetter(s.excludedLetters, used);
    const isFinal = index === s.rounds - 1;

    let modifier: RoundModifier = null;
    if (s.doubleFinal && isFinal && s.rounds > 1) modifier = "double";
    else if (s.blitz && index > 0 && Math.random() < BLITZ_CHANCE) modifier = "blitz";

    const categories = [...s.categories];
    let bonusIndex: number | null = null;
    if (s.bonusCategory) {
      const usedBonus = new Set(this.rounds.map((r) => (r.bonusIndex !== null ? r.categories[r.bonusIndex] : "")));
      const pool = BONUS_POOL.filter((c) => !categories.includes(c) && !usedBonus.has(c));
      if (pool.length > 0) {
        categories.push(pool[Math.floor(Math.random() * pool.length)]);
        bonusIndex = categories.length - 1;
      }
    }

    const duration = modifier === "blitz" ? Math.max(15, Math.round(s.roundTime / 2)) : s.roundTime;
    const now = Date.now();
    const startedAt = now + COUNTDOWN_MS;
    this.rounds.push({
      index,
      letter,
      categories,
      bonusIndex,
      modifier,
      duration,
      startedAt,
      endsAt: startedAt + duration * 1000,
      stoppedBy: null,
      answers: {},
      votes: {},
      jokers: {},
      reactions: {},
      hints: {},
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
    const n = r.categories.length;
    r.answers[playerId] = Array.from({ length: n }, (_, i) => String(answers[i] ?? "").slice(0, 60));
    this.lastActivity = Date.now();
    this.hooks.changed(this);
  }

  setJoker(playerId: string, categoryIndex: number | null) {
    const r = this.currentRound;
    const p = this.players.get(playerId);
    if (this.phase !== "playing" || !r || !p) return;
    if (!this.settings.jokers) throw new GameError("Joker sind in diesem Raum aus.");
    if (categoryIndex === null) {
      if (r.jokers[playerId] !== undefined) {
        delete r.jokers[playerId];
        p.jokerUsed = false;
      }
    } else {
      if (categoryIndex < 0 || categoryIndex >= r.categories.length) return;
      if (p.jokerUsed && r.jokers[playerId] === undefined) throw new GameError("Deinen Joker hast du schon eingesetzt.");
      r.jokers[playerId] = categoryIndex;
      p.jokerUsed = true;
    }
    this.hooks.changed(this);
  }

  stop(playerId: string) {
    const r = this.currentRound;
    if (this.phase !== "playing" || !r || r.stoppedBy) return;
    if (!this.settings.allowStop) throw new GameError("Stopp ist deaktiviert.");
    const mine = r.answers[playerId] ?? [];
    const filled = mine.filter((a) => a.trim().length > 0).length;
    if (filled < r.categories.length) throw new GameError("Erst alle Felder ausfüllen.");
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
    const r = this.currentRound!;
    for (const [pid, words] of Object.entries(r.answers)) {
      words.forEach((w, ci) => {
        const hint = checkWord(r.categories[ci], w);
        if (hint) r.hints[voteKey(pid, ci)] = hint;
      });
    }
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

  react(by: string, target: string, categoryIndex: number, emoji: string) {
    const r = this.currentRound;
    if (!r || (this.phase !== "voting" && this.phase !== "results")) return;
    if (!this.players.has(by) && !this.spectators.has(by)) return;
    if (!REACTIONS.includes(emoji as Reaction)) return;
    if (!(r.answers[target]?.[categoryIndex] ?? "").trim()) return;
    const key = voteKey(target, categoryIndex);
    const bucket = (r.reactions[key] ??= {});
    const set = (bucket[emoji as Reaction] ??= new Set());
    if (set.has(by)) set.delete(by);
    else set.add(by);
    this.hooks.changed(this);
  }

  setReady(playerId: string, ready: boolean) {
    if (this.phase !== "voting" || !this.players.has(playerId)) return;
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
    r.score = scoreRound(r.letter, r.categories.length, ids, r.answers, r.votes, {
      jokers: r.jokers,
      multiplier: r.modifier === "double" ? 2 : 1,
    });
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
      else {
        p.score = 0;
        p.lobbyReady = false;
        p.jokerUsed = false;
      }
    }
    this.hooks.changed(this);
  }

  // ---------- Chat ----------

  say(senderId: string, text: string) {
    const p = this.players.get(senderId);
    const s = p ? null : this.spectators.get(senderId);
    const clean = text.trim().slice(0, 300);
    if ((!p && !s) || !clean) return;
    this.pushChat({
      id: nanoid(8),
      playerId: senderId,
      nickname: (p ?? s)!.nickname,
      text: clean,
      at: Date.now(),
      spectator: !p,
    });
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

  /** Alle Empfänger: Spieler und Zuschauer mit ihren Sockets */
  *recipients(): Generator<[string, Set<string>]> {
    for (const p of this.players.values()) yield [p.id, p.socketIds];
    for (const s of this.spectators.values()) yield [s.id, s.socketIds];
  }

  stateFor(viewerId: string): RoomState {
    const r = this.currentRound;
    const reveal = this.phase !== "playing";
    const spectator = !this.players.has(viewerId);
    const players: PublicPlayer[] = [...this.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => ({
        id: p.id,
        nickname: p.nickname,
        image: p.image,
        avatar: p.avatar,
        score: p.score,
        connected: p.connected,
        isHost: p.id === this.hostId,
        isGuest: p.userId === null,
        lobbyReady: p.lobbyReady,
        jokerUsed: p.jokerUsed,
        filled: this.phase === "playing" && r ? (r.answers[p.id] ?? []).filter((a) => a.trim()).length : undefined,
        ready: this.phase === "voting" ? this.readyForResults.has(p.id) : undefined,
      }));

    return {
      code: this.code,
      phase: this.phase,
      settings: this.settings,
      players,
      spectators: this.connectedSpectators.map((s) => ({ id: s.id, nickname: s.nickname, image: s.image, avatar: s.avatar })),
      hostId: this.hostId,
      you: viewerId,
      isSpectator: spectator,
      round: r
        ? {
            index: r.index,
            letter: Date.now() >= r.startedAt || reveal ? r.letter : "",
            categories: r.categories,
            bonusIndex: r.bonusIndex,
            modifier: r.modifier,
            duration: r.duration,
            startedAt: r.startedAt,
            endsAt: r.endsAt,
            stoppedBy: r.stoppedBy,
            answers: reveal ? r.answers : undefined,
            votes: reveal ? Object.fromEntries(Object.entries(r.votes).map(([k, v]) => [k, [...v]])) : undefined,
            jokers: reveal ? r.jokers : undefined,
            reactions: reveal
              ? Object.fromEntries(
                  Object.entries(r.reactions).map(([k, v]) => [
                    k,
                    Object.fromEntries(Object.entries(v).map(([e, set]) => [e, [...(set as Set<string>)]])),
                  ]),
                )
              : undefined,
            hints: reveal ? r.hints : undefined,
            score: reveal ? r.score : undefined,
          }
        : null,
      myAnswers: r?.answers[viewerId] ?? [],
      myJoker: r?.jokers[viewerId] ?? null,
      history: this.rounds.filter((x) => x.score).map((x) => ({ letter: x.letter, modifier: x.modifier, totals: x.score!.total })),
      savedGameId: this.savedGameId,
      serverTime: Date.now(),
    };
  }

  lobbyInfo(): LobbyRoom {
    return {
      code: this.code,
      hostName: this.players.get(this.hostId)?.nickname ?? "?",
      players: this.connectedPlayers.length,
      spectators: this.connectedSpectators.length,
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
