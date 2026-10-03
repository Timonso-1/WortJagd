"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { emit, getNickname, getSocket, setNickname } from "@/lib/client/socket";
import type { ChatMessage, RoomState } from "@/server/game/types";
import { Chat } from "./Chat";
import { Finished } from "./Finished";
import { Lobby } from "./Lobby";
import { Playing } from "./Playing";
import { Players } from "./Players";
import { Results } from "./Results";
import { Voting } from "./Voting";

export interface RoomCtx {
  state: RoomState;
  isHost: boolean;
  /** Serverzeit-Offset in ms */
  offset: number;
  act: (event: string, payload?: unknown) => Promise<void>;
}

export function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<RoomState | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needNick, setNeedNick] = useState(false);
  const [nick, setNick] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const offset = useRef(0);
  const joined = useRef(false);

  useEffect(() => {
    let cleanup = () => {};
    getSocket().then((s) => {
      const onState = (st: RoomState) => {
        offset.current = st.serverTime - Date.now();
        setState(st);
      };
      const onMsg = (m: ChatMessage) => setChat((c) => [...c.slice(-99), m]);
      const onHistory = (h: ChatMessage[]) => setChat(h);
      const onKicked = () => setError("Du wurdest aus dem Raum entfernt.");
      const onReconnect = () => {
        if (joined.current) join(getNickname());
      };
      s.on("room:state", onState);
      s.on("chat:message", onMsg);
      s.on("chat:history", onHistory);
      s.on("room:kicked", onKicked);
      s.io.on("reconnect", onReconnect);
      cleanup = () => {
        s.off("room:state", onState);
        s.off("chat:message", onMsg);
        s.off("chat:history", onHistory);
        s.off("room:kicked", onKicked);
        s.io.off("reconnect", onReconnect);
        if (joined.current) s.emit("room:leave");
      };

      const n = getNickname();
      if (n) join(n);
      else setNeedNick(true);
    });
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function join(n: string) {
    try {
      await emit("room:join", { code, nickname: n });
      joined.current = true;
      setNeedNick(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const act = async (event: string, payload?: unknown) => {
    try {
      await emit(event, payload);
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (error) {
    return (
      <div className="card mx-auto max-w-md space-y-3 text-center">
        <p className="text-lg">{error}</p>
        <Link href="/" className="btn-primary">Zur Startseite</Link>
      </div>
    );
  }

  if (needNick) {
    return (
      <form
        className="card mx-auto max-w-sm space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nick.trim()) return;
          setNickname(nick.trim());
          join(nick.trim());
        }}
      >
        <h1 className="font-display text-2xl">Raum {code} beitreten</h1>
        <input className="input" autoFocus maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Dein Name" />
        <button className="btn-primary w-full">Beitreten</button>
      </form>
    );
  }

  if (!state) return <p className="text-center text-ink-soft">Verbinde …</p>;

  const ctx: RoomCtx = { state, isHost: state.hostId === state.you, offset: offset.current, act };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-4">
        {state.phase === "lobby" && <Lobby ctx={ctx} />}
        {state.phase === "playing" && <Playing ctx={ctx} />}
        {state.phase === "voting" && <Voting ctx={ctx} />}
        {state.phase === "results" && <Results ctx={ctx} />}
        {state.phase === "finished" && <Finished ctx={ctx} />}
      </div>
      <aside className="space-y-4">
        <Players ctx={ctx} />
        <Chat messages={chat} me={state.you} onSend={(text) => act("chat:send", { text })} />
        <button
          className="btn-ghost w-full text-sm"
          onClick={async () => {
            await act("room:leave");
            joined.current = false;
            router.push("/");
          }}
        >
          Raum verlassen
        </button>
      </aside>
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-sm text-paper shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
