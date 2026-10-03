"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

export function getClientId(): string {
  const KEY = "wj.clientId";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getNickname(): string {
  return localStorage.getItem("wj.nickname") ?? "";
}

export function setNickname(n: string) {
  localStorage.setItem("wj.nickname", n);
}

export function getSocket(): Promise<Socket> {
  if (socket) return Promise.resolve(socket);
  connecting ??= (async () => {
    let token: string | null = null;
    try {
      const res = await fetch("/api/socket-token", { cache: "no-store" });
      if (res.ok) token = (await res.json()).token;
    } catch {
      /* Gastmodus */
    }
    socket = io({ path: "/socket.io", auth: { token, clientId: getClientId() } });
    return socket;
  })();
  return connecting;
}

export async function emit<T = unknown>(event: string, payload?: unknown): Promise<T> {
  const s = await getSocket();
  const res = await s.timeout(8000).emitWithAck(event, payload ?? null);
  if (!res.ok) throw new Error(res.error);
  return res.data as T;
}
