"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Link2, Loader2, LogOut } from "lucide-react";
import { emit, getNickname, getSocket, setNickname } from "@/lib/client/socket";
import type { ChatMessage, Phase, RoomState } from "@/server/game/types";
import { CodeTiles } from "@/components/ui/Tile";
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

const STEPS: { phase: Phase[]; label: string }[] = [
  { phase: ["lobby"], label: "Lobby" },
  { phase: ["playing"], label: "Schreiben" },
  { phase: ["voting"], label: "Prüfen" },
  { phase: ["results", "finished"], label: "Punkte" },
];

export function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<RoomState | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needNick, setNeedNick] = useState(false);
  const [nick, setNick] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
      const onKicked = () => setError("Der Spielleiter hat dich aus dem Raum entfernt.");
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
      <div className="panel mx-auto max-w-md p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-stop" />
        <p className="mt-3 font-display text-xl font-bold">{error}</p>
        <Link href="/" className="btn-primary mt-6">Zur Startseite</Link>
      </div>
    );
  }

  if (needNick) {
    return (
      <form
        className="panel mx-auto max-w-sm space-y-5 p-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nick.trim()) return;
          setNickname(nick.trim());
          join(nick.trim());
        }}
      >
        <div className="flex justify-center">
          <CodeTiles code={code} />
        </div>
        <h1 className="text-center font-display text-2xl font-bold">Wie heißt du?</h1>
        <input className="field text-lg" autoFocus maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Spielername" aria-label="Spielername" />
        <button className="btn-primary w-full py-3">Raum betreten</button>
      </form>
    );
  }

  if (!state) {
    return (
      <p className="flex items-center justify-center gap-2 py-20 text-haze">
        <Loader2 className="h-5 w-5 animate-spin" /> Verbinde mit Raum {code}
      </p>
    );
  }

  const ctx: RoomCtx = { state, isHost: state.hostId === state.you, offset: offset.current, act };
  const stepIndex = STEPS.findIndex((s) => s.phase.includes(state.phase));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <CodeTiles code={state.code} size="xs" />
        <ol className="flex items-center gap-1 text-sm" aria-label="Spielablauf">
          {STEPS.map((s, i) => (
            <li key={s.label} className="flex items-center gap-1">
              {i > 0 && <span className="h-px w-4 bg-rim" />}
              <span
                aria-current={i === stepIndex ? "step" : undefined}
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  i === stepIndex ? "bg-tile/15 text-tile" : i < stepIndex ? "text-haze" : "text-dim"
                }`}
              >
                {s.label}
              </span>
            </li>
          ))}
        </ol>
        <div className="ml-auto flex items-center gap-1">
          <button
            className="btn-quiet px-3 py-2 text-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(`${window.location.origin}/room/${state.code}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="h-4 w-4 text-go" /> : <Link2 className="h-4 w-4" />}
            {copied ? "Link kopiert" : "Einladen"}
          </button>
          <button
            className="btn-quiet px-3 py-2 text-sm"
            onClick={async () => {
              await act("room:leave");
              joined.current = false;
              router.push("/");
            }}
          >
            <LogOut className="h-4 w-4" />
            Verlassen
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {state.phase === "lobby" && <Lobby ctx={ctx} />}
          {state.phase === "playing" && <Playing ctx={ctx} />}
          {state.phase === "voting" && <Voting ctx={ctx} />}
          {state.phase === "results" && <Results ctx={ctx} />}
          {state.phase === "finished" && <Finished ctx={ctx} />}
        </div>
        <aside className="space-y-6">
          <Players ctx={ctx} />
          <Chat messages={chat} me={state.you} onSend={(text) => act("chat:send", { text })} />
        </aside>
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div role="status" className="animate-pop flex items-center gap-2 rounded-xl border border-stop/40 bg-deck-2 px-4 py-3 text-sm shadow-2xl">
            <AlertCircle className="h-4 w-4 text-stop" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
