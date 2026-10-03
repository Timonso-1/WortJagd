import type { Server as HttpServer } from "node:http";
import { customAlphabet } from "nanoid";
import { Server, type Socket } from "socket.io";
import { db, schema } from "../db";
import { verifySocketToken } from "../lib/socket-token";
import { GameError, Room, type JoinInfo, type RoomHooks } from "./game/room";
import * as S from "./game/schemas";
import type { ChatMessage } from "./game/types";

const makeCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);
const rooms = new Map<string, Room>();

type Ack = (res: { ok: true; data?: unknown } | { ok: false; error: string }) => void;

interface SocketData {
  identity: Omit<JoinInfo, "nickname"> & { nickname: string | null };
  roomCode: string | null;
}

type GSocket = Socket<any, any, any, SocketData>;

export function attachSocket(http: HttpServer) {
  const io = new Server<any, any, any, SocketData>(http, {
    path: "/socket.io",
    cors: { origin: false },
  });

  // ---------- Broadcast, pro Raum gebündelt ----------
  const pending = new Set<string>();
  let lobbyDirty = false;

  function flush(code: string) {
    pending.delete(code);
    const room = rooms.get(code);
    if (!room) return;
    for (const p of room.players.values()) {
      for (const sid of p.socketIds) io.to(sid).emit("room:state", room.stateFor(p.id));
    }
  }

  const hooks: RoomHooks = {
    changed(room) {
      lobbyDirty = true;
      if (pending.has(room.code)) return;
      pending.add(room.code);
      setImmediate(() => flush(room.code));
    },
    chat(room, msg: ChatMessage) {
      io.to(`room:${room.code}`).emit("chat:message", msg);
    },
    finished(room) {
      persistGame(room).catch((e) => console.error("[persist]", e));
    },
  };

  setInterval(() => {
    if (!lobbyDirty) return;
    lobbyDirty = false;
    io.to("lobby").emit("lobby:list", publicRooms());
  }, 2000);

  // Verwaiste Räume aufräumen
  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (room.connectedPlayers.length === 0 && now - room.lastActivity > 10 * 60_000) {
        room.dispose();
        rooms.delete(code);
        lobbyDirty = true;
      }
    }
  }, 60_000);

  // ---------- Identität ----------
  io.use(async (socket, next) => {
    const { token, clientId } = socket.handshake.auth as { token?: string; clientId?: string };
    if (token) {
      const user = await verifySocketToken(token);
      if (user) {
        socket.data.identity = { id: `u_${user.uid}`, userId: user.uid, nickname: user.name, image: user.image };
        socket.data.roomCode = null;
        return next();
      }
    }
    if (typeof clientId !== "string" || !/^[A-Za-z0-9_-]{10,64}$/.test(clientId)) {
      return next(new Error("Ungültige Client-ID"));
    }
    socket.data.identity = { id: `g_${clientId}`, userId: null, nickname: null, image: null };
    socket.data.roomCode = null;
    next();
  });

  io.on("connection", (socket: GSocket) => {
    const pid = socket.data.identity.id;

    const handle =
      <T>(fn: (payload: T) => unknown | Promise<unknown>) =>
      async (payload: T, ack?: Ack) => {
        try {
          const data = await fn(payload);
          ack?.({ ok: true, data });
        } catch (e) {
          const msg =
            e instanceof GameError ? e.message : e instanceof Error && e.name === "ZodError" ? "Ungültige Eingabe." : "Serverfehler.";
          if (!(e instanceof GameError) && msg === "Serverfehler.") console.error(e);
          ack?.({ ok: false, error: msg });
        }
      };

    const room = () => {
      const r = socket.data.roomCode ? rooms.get(socket.data.roomCode) : undefined;
      if (!r) throw new GameError("Du bist in keinem Raum.");
      return r;
    };

    const enter = (r: Room, nickname: string) => {
      leaveCurrent();
      const info: JoinInfo = {
        id: pid,
        userId: socket.data.identity.userId,
        nickname: socket.data.identity.nickname ?? nickname,
        image: socket.data.identity.image,
      };
      r.join(info, socket.id);
      socket.data.roomCode = r.code;
      socket.join(`room:${r.code}`);
      socket.emit("chat:history", r.chat);
    };

    const leaveCurrent = () => {
      const code = socket.data.roomCode;
      if (!code) return;
      socket.leave(`room:${code}`);
      rooms.get(code)?.disconnect(pid, socket.id);
      socket.data.roomCode = null;
    };

    socket.on(
      "room:create",
      handle((p: unknown) => {
        const { nickname, settings } = S.createPayload.parse(p);
        let code = makeCode();
        while (rooms.has(code)) code = makeCode();
        const r = new Room(code, { id: pid, userId: null, nickname, image: null }, hooks, settings);
        rooms.set(code, r);
        enter(r, nickname);
        return { code };
      }),
    );

    socket.on(
      "room:join",
      handle((p: unknown) => {
        const { code, nickname } = S.joinPayload.parse(p);
        const r = rooms.get(code);
        if (!r) throw new GameError("Raum nicht gefunden.");
        enter(r, nickname);
        return { code };
      }),
    );

    socket.on("room:leave", handle(() => leaveCurrent()));

    socket.on("settings:update", handle((p: unknown) => room().updateSettings(pid, S.settingsPatch.parse(p))));
    socket.on("game:start", handle(() => room().start(pid)));
    socket.on("answers:set", handle((p: unknown) => room().setAnswers(pid, S.answersPayload.parse(p))));
    socket.on("round:stop", handle(() => room().stop(pid)));
    socket.on(
      "vote:toggle",
      handle((p: unknown) => {
        const { target, category } = S.votePayload.parse(p);
        room().toggleVote(pid, target, category);
      }),
    );
    socket.on("vote:ready", handle((p: unknown) => room().setReady(pid, Boolean(p))));
    socket.on("results:force", handle(() => room().forceResults(pid)));
    socket.on("round:next", handle(() => room().next(pid)));
    socket.on("game:lobby", handle(() => room().backToLobby(pid)));
    socket.on("chat:send", handle((p: unknown) => room().say(pid, S.chatPayload.parse(p).text)));

    socket.on(
      "player:kick",
      handle((p: unknown) => {
        const r = room();
        const kicked = r.kick(pid, S.targetPayload.parse(p).target);
        if (kicked) {
          for (const sid of kicked.socketIds) {
            const s = io.sockets.sockets.get(sid) as GSocket | undefined;
            s?.leave(`room:${r.code}`);
            if (s) s.data.roomCode = null;
            io.to(sid).emit("room:kicked");
          }
        }
      }),
    );
    socket.on("host:transfer", handle((p: unknown) => room().transferHost(pid, S.targetPayload.parse(p).target)));

    socket.on("lobby:subscribe", handle(() => {
      socket.join("lobby");
      return publicRooms();
    }));
    socket.on("lobby:unsubscribe", handle(() => socket.leave("lobby")));

    socket.on("disconnect", () => leaveCurrent());
  });

  return io;
}

function publicRooms() {
  return [...rooms.values()]
    .filter((r) => r.settings.isPublic && r.connectedPlayers.length > 0)
    .map((r) => r.lobbyInfo())
    .sort((a, b) => b.players - a.players)
    .slice(0, 50);
}

async function persistGame(room: Room) {
  if (!process.env.DATABASE_URL) return;
  const ranked = [...room.players.values()].sort((a, b) => b.score - a.score);
  await db.transaction(async (tx) => {
    const [game] = await tx
      .insert(schema.games)
      .values({
        roomCode: room.code,
        categories: room.settings.categories,
        letters: room.rounds.map((r) => r.letter),
        rounds: room.rounds.length,
        startedAt: new Date(room.gameStartedAt),
      })
      .returning({ id: schema.games.id });
    let rank = 0;
    let last = Number.NaN;
    const rows = ranked.map((p, i) => {
      if (p.score !== last) rank = i + 1;
      last = p.score;
      return { gameId: game.id, userId: p.userId, nickname: p.nickname, score: p.score, rank };
    });
    if (rows.length) await tx.insert(schema.gamePlayers).values(rows);
  });
}
