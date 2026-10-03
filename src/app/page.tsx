"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DoorOpen, Globe2, Loader2, Lock, Plus, Users } from "lucide-react";
import { emit, getNickname, getSocket, setNickname } from "@/lib/client/socket";
import type { LobbyRoom } from "@/server/game/types";
import { Tile } from "@/components/ui/Tile";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

const SAMPLES: Record<string, [string, string][]> = {
  B: [["Stadt", "Bremen"], ["Land", "Belgien"], ["Fluss", "Bode"], ["Tier", "Biber"]],
  M: [["Stadt", "München"], ["Land", "Mexiko"], ["Fluss", "Main"], ["Tier", "Murmeltier"]],
  S: [["Stadt", "Stuttgart"], ["Land", "Spanien"], ["Fluss", "Saale"], ["Tier", "Seepferdchen"]],
};
const ROLL = "KQWHTZGLRPDAFN".split("");

const PHASE_LABEL: Record<LobbyRoom["phase"], string> = {
  lobby: "Wartet auf Spieler",
  playing: "Läuft",
  voting: "Läuft",
  results: "Läuft",
  finished: "Beendet",
};

function useLetterRoll() {
  const [letter, setLetter] = useState("B");
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const target = Object.keys(SAMPLES)[Math.floor(Math.random() * 3)];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLetter(target);
      setLanded(true);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      if (i >= ROLL.length) {
        clearInterval(id);
        setLetter(target);
        setLanded(true);
        return;
      }
      setLetter(ROLL[i++]);
    }, 70);
    return () => clearInterval(id);
  }, []);
  return { letter, landed };
}

export default function Home() {
  const router = useRouter();
  const [nick, setNick] = useState("");
  const [code, setCode] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const { letter, landed } = useLetterRoll();

  useEffect(() => {
    setNick(getNickname());
    let off = () => {};
    let cancelled = false;
    getSocket().then((s) => {
      if (cancelled) return;
      const onList = (list: LobbyRoom[]) => setRooms(list);
      s.on("lobby:list", onList);
      emit<LobbyRoom[]>("lobby:subscribe").then(setRooms).catch(() => {});
      off = () => {
        s.off("lobby:list", onList);
        s.emit("lobby:unsubscribe");
      };
    });
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  async function go(action: "create" | "join", joinCode?: string) {
    const n = nick.trim();
    if (!n) return setError("Gib zuerst einen Namen ein.");
    setNickname(n);
    setBusy(action);
    setError(null);
    try {
      if (action === "create") {
        const { code } = await emit<{ code: string }>("room:create", { nickname: n, settings: { isPublic } });
        router.push(`/room/${code}`);
      } else {
        const c = (joinCode ?? code).trim().toUpperCase();
        if (!/^[A-Z0-9]{5}$/.test(c)) throw new Error("Der Raumcode hat 5 Zeichen.");
        router.push(`/room/${c}`);
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  const sample = SAMPLES[letter];

  return (
    <div className="space-y-10">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="max-w-[14ch] font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
            Ein Buchstabe. Alle gegen die Uhr.
          </h1>
          <p className="mt-4 max-w-md text-lg text-haze">
            Stadt, Land, Fluss mit Freunden, live im Browser. Raum öffnen, Link teilen, losschreiben.
          </p>

          <div className="mt-8 flex items-start gap-5" aria-hidden="true">
            <Tile size="lg" key={landed ? "landed" : "rolling"} className={landed ? "animate-tile-land" : ""}>
              {letter}
            </Tile>
            <ul className="min-w-0 flex-1 space-y-2 pt-1">
              {(sample ?? SAMPLES.B).map(([cat, word]) => (
                <li key={cat} className="flex items-center gap-3 border-b border-dashed border-rim pb-2">
                  <CategoryIcon name={cat} className="h-4 w-4 text-dim" />
                  <span className="w-14 text-sm text-dim">{cat}</span>
                  <span
                    className={`font-display text-lg font-semibold transition-opacity duration-300 ${landed && sample ? "opacity-100" : "opacity-0"}`}
                  >
                    {word}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="panel p-6 sm:p-8">
          <label className="field-label" htmlFor="nick">Dein Spielername</label>
          <input
            id="nick"
            className="field text-lg"
            maxLength={20}
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go("create")}
            placeholder="z. B. Timo"
            autoComplete="nickname"
          />

          <button className="btn-primary mt-5 w-full py-3 text-base" disabled={busy !== null} onClick={() => go("create")}>
            {busy === "create" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            Raum erstellen
          </button>
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-haze">
            <input type="checkbox" className="h-4 w-4 accent-tile" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            {isPublic ? <Globe2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {isPublic ? "Öffentlich – jeder kann beitreten" : "Privat – nur mit Code oder Link"}
          </label>

          <div className="my-6 flex items-center gap-3 text-sm text-dim">
            <span className="h-px flex-1 bg-rim" />
            oder einem Raum beitreten
            <span className="h-px flex-1 bg-rim" />
          </div>

          <div className="flex gap-2">
            <input
              className="field text-center font-display text-xl font-bold uppercase tracking-[0.35em]"
              maxLength={5}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && go("join")}
              placeholder="CODE"
              aria-label="Raumcode"
            />
            <button className="btn-secondary shrink-0" disabled={busy !== null} onClick={() => go("join")}>
              <DoorOpen className="h-4 w-4" />
              Beitreten
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-stop/40 bg-stop/10 px-3 py-2 text-sm text-stop">
              {error}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel p-6">
          <div className="mb-4 flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-sky" />
            <h2 className="font-display text-xl font-bold">Offene Räume</h2>
            <span className="ml-auto text-sm text-dim">{rooms.length > 0 ? `${rooms.length} aktiv` : ""}</span>
          </div>
          {rooms.length === 0 ? (
            <div className="well flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Users className="h-8 w-8 text-dim" />
              <p className="text-haze">Gerade ist kein öffentlicher Raum offen.</p>
              <p className="text-sm text-dim">Erstell einen öffentlichen Raum, dann taucht er hier für alle auf.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {rooms.map((r) => {
                const full = r.players >= r.maxPlayers;
                return (
                  <li key={r.code} className="well flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <span className="font-display text-lg font-bold tracking-[0.2em] text-tile">{r.code}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">Raum von {r.hostName}</p>
                      <p className="text-sm text-dim">
                        {r.categories} Kategorien, {r.rounds} Runden – {PHASE_LABEL[r.phase]}
                      </p>
                    </div>
                    <span className="ml-auto flex items-center gap-1.5 text-sm text-haze">
                      <Users className="h-4 w-4" />
                      {r.players}/{r.maxPlayers}
                    </span>
                    <button className="btn-secondary px-3 py-1.5 text-sm" disabled={busy !== null || full} onClick={() => go("join", r.code)}>
                      {full ? "Voll" : "Beitreten"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="panel p-6">
          <h2 className="mb-4 font-display text-xl font-bold">So gibt es Punkte</h2>
          <dl className="space-y-3">
            {[
              ["20", "Nur du hast in der Kategorie ein gültiges Wort."],
              ["10", "Dein Wort hat sonst niemand."],
              ["5", "Jemand hat dasselbe Wort wie du."],
              ["0", "Leer, falscher Buchstabe oder von der Mehrheit abgelehnt."],
            ].map(([pts, text]) => (
              <div key={pts} className="flex items-center gap-4">
                <dt>
                  <Tile size="sm" className={pts === "0" ? "opacity-40 grayscale" : ""}>{pts}</Tile>
                </dt>
                <dd className="text-sm text-haze">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
