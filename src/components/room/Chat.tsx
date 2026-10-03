"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, SendHorizontal } from "lucide-react";
import type { AvatarStyle, ChatMessage, PublicPlayer, PublicSpectator } from "@/server/game/types";
import { Avatar } from "@/components/ui/Avatar";

const time = (at: number) => new Date(at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

export function Chat({
  messages,
  me,
  players,
  onSend,
}: {
  messages: ChatMessage[];
  me: string;
  players: (PublicPlayer | PublicSpectator)[];
  onSend: (t: string) => void;
}) {
  const who = new Map<string, { image: string | null; avatar: AvatarStyle | null }>(players.map((p) => [p.id, p]));
  const [text, setText] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [messages]);

  return (
    <section className="panel flex h-96 flex-col overflow-hidden" aria-labelledby="chat-h">
      <h2 id="chat-h" className="flex items-center gap-2 border-b border-rim px-5 py-3 font-display text-lg font-bold">
        <MessageSquare className="h-4 w-4 text-haze" /> Chat
      </h2>
      <div ref={box} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
        {messages.length === 0 && <p className="pt-8 text-center text-dim">Noch keine Nachrichten.</p>}
        {messages.map((m) => {
          if (m.system) {
            return (
              <p key={m.id} className="flex items-center justify-center gap-2 text-xs text-dim">
                <span>{m.text}</span>
                <time className="tabular-nums opacity-70">{time(m.at)}</time>
              </p>
            );
          }
          const own = m.playerId === me;
          return (
            <div key={m.id} className={`flex gap-2 ${own ? "flex-row-reverse" : ""}`}>
              <Avatar name={m.nickname} image={m.playerId ? who.get(m.playerId)?.image : null} avatar={m.playerId ? who.get(m.playerId)?.avatar : null} seed={m.playerId ?? m.nickname} size={26} />
              <div className={`flex min-w-0 max-w-[80%] flex-col ${own ? "items-end" : "items-start"}`}>
                <span className="mb-0.5 flex items-baseline gap-1.5 px-1 text-xs">
                  <span className="font-semibold text-haze">{own ? "Du" : m.nickname}</span>
                  {m.spectator && <span className="text-sky">Zuschauer</span>}
                  <time className="tabular-nums text-dim">{time(m.at)}</time>
                </span>
                <p
                  className={`break-words rounded-2xl px-3 py-1.5 ${
                    own ? "rounded-tr-md bg-tile text-tile-ink" : "rounded-tl-md bg-night-2"
                  }`}
                >
                  {m.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <form
        className="flex gap-2 border-t border-rim p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onSend(text);
          setText("");
        }}
      >
        <input className="field py-2 text-sm" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder="Nachricht schreiben" aria-label="Nachricht" />
        <button className="icon-btn h-10 w-10 shrink-0 bg-deck-2 text-tile" aria-label="Senden">
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
