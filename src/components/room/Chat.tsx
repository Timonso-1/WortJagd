"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/server/game/types";

export function Chat({ messages, me, onSend }: { messages: ChatMessage[]; me: string; onSend: (t: string) => void }) {
  const [text, setText] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [messages]);

  return (
    <div className="card flex h-80 flex-col p-0">
      <h3 className="border-b border-line px-4 py-2 font-semibold">Chat</h3>
      <div ref={box} className="flex-1 space-y-1 overflow-y-auto px-4 py-2 text-sm">
        {messages.map((m) =>
          m.system ? (
            <p key={m.id} className="text-xs italic text-ink-soft">{m.text}</p>
          ) : (
            <p key={m.id} className="break-words">
              <b className={m.playerId === me ? "text-accent" : ""}>{m.nickname}:</b> {m.text}
            </p>
          ),
        )}
      </div>
      <form
        className="flex gap-2 border-t border-line p-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onSend(text);
          setText("");
        }}
      >
        <input className="input py-1 text-sm" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder="Nachricht …" />
        <button className="btn-ghost px-3 py-1 text-sm">Senden</button>
      </form>
    </div>
  );
}
