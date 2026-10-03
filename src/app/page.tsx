"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { emit, getNickname, getSocket, setNickname } from "@/lib/client/socket";
import type { LobbyRoom } from "@/server/game/types";

const PHASE_LABEL: Record<LobbyRoom["phase"], string> = {
  lobby: "Wartet",
  playing: "Läuft",
  voting: "Läuft",
  results: "Läuft",
  finished: "Beendet",
};

export default function Home() {
  const router = useRouter();
  const [nick, setNick] = useState("");
  const [code, setCode] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNick(getNickname());
    let off = () => {};
    getSocket().then((s) => {
      const onList = (list: LobbyRoom[]) => setRooms(list);
      s.on("lobby:list", onList);
      emit<LobbyRoom[]>("lobby:subscribe").then(setRooms).catch(() => {});
      off = () => {
        s.off("lobby:list", onList);
        s.emit("lobby:unsubscribe");
      };
    });
    return () => off();
  }, []);

  async function go(action: "create" | "join", joinCode?: string) {
    const n = nick.trim();
    if (!n) return setError("Bitte einen Namen eingeben.");
    setNickname(n);
    setBusy(true);
    setError(null);
    try {
      if (action === "create") {
        const { code } = await emit<{ code: string }>("room:create", { nickname: n, settings: { isPublic } });
        router.push(`/room/${code}`);
      } else {
        const c = (joinCode ?? code).trim().toUpperCase();
        if (!/^[A-Z0-9]{5}$/.test(c)) throw new Error("Raumcode hat 5 Zeichen.");
        router.push(`/room/${c}`);
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section className="card space-y-5">
        <div>
          <h1 className="font-display text-4xl font-bold leading-tight">
            Stadt, Land, Fluss <span className="text-accent">online</span>
          </h1>
          <p className="mt-1 text-ink-soft">Raum erstellen, Link teilen, losspielen. Kein Konto nötig.</p>
        </div>

        <div>
          <label className="label" htmlFor="nick">Dein Name</label>
          <input
            id="nick"
            className="input"
            maxLength={20}
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="z. B. Timo"
          />
        </div>

        <div className="space-y-2">
          <button className="btn-primary w-full" disabled={busy} onClick={() => go("create")}>
            Neuen Raum erstellen
          </button>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            In öffentlicher Lobby anzeigen
          </label>
        </div>

        <div className="flex gap-2">
          <input
            className="input font-mono uppercase tracking-widest"
            maxLength={5}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go("join")}
            placeholder="CODE"
          />
          <button className="btn-ghost" disabled={busy} onClick={() => go("join")}>
            Beitreten
          </button>
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}
      </section>

      <section className="card">
        <h2 className="mb-3 font-display text-2xl">Öffentliche Räume</h2>
        {rooms.length === 0 ? (
          <p className="text-sm text-ink-soft">Gerade keine offenen Räume. Erstell doch einen.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rooms.map((r) => (
              <li key={r.code} className="flex items-center gap-3 py-2">
                <span className="font-mono font-semibold tracking-widest">{r.code}</span>
                <span className="truncate text-sm text-ink-soft">
                  von {r.hostName} · {r.categories} Kategorien · {r.rounds} Runden
                </span>
                <span className="ml-auto text-xs text-ink-soft">{PHASE_LABEL[r.phase]}</span>
                <span className="text-sm">
                  {r.players}/{r.maxPlayers}
                </span>
                <button
                  className="btn-ghost px-3 py-1 text-sm"
                  disabled={busy || r.players >= r.maxPlayers}
                  onClick={() => go("join", r.code)}
                >
                  Rein
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card text-sm text-ink-soft lg:col-span-2">
        <h2 className="mb-2 font-display text-xl text-ink">Punkte</h2>
        <p>
          <b className="text-ink">20</b> – als Einziger ein gültiges Wort in der Kategorie ·{" "}
          <b className="text-ink">10</b> – eigenes, einzigartiges Wort · <b className="text-ink">5</b> – gleiches
          Wort wie jemand anderes · <b className="text-ink">0</b> – leer, falscher Buchstabe oder von der Mehrheit
          abgelehnt.
        </p>
      </section>
    </div>
  );
}
