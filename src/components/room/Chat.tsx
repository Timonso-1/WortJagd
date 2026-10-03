"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, SendHorizontal } from "lucide-react";
import type { ChatMessage } from "@/server/game/types";

export function Chat({ messages, me, onSend }: { messages: ChatMessage[]; me: string; onSend: (t: string) => void }) {
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
      <div ref={box} className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
        {messages.length === 0 && <p className="pt-8 text-center text-dim">Noch keine Nachrichten.</p>}
        {messages.map((m) =>
          m.system ? (
            <p key={m.id} className="text-center text-xs text-dim">{m.text}</p>
          ) : (
            <div key={m.id} className={`flex flex-col ${m.playerId === me ? "items-end" : "items-start"}`}>
              {m.playerId !== me && <span className="mb-0.5 px-1 text-xs font-semibold text-haze">{m.nickname}</span>}
              <p
                className={`max-w-[85%] break-words rounded-2xl px-3 py-1.5 ${
                  m.playerId === me ? "rounded-br-md bg-tile text-tile-ink" : "rounded-bl-md bg-night-2"
                }`}
              >
                {m.text}
              </p>
            </div>
          ),
        )}
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
