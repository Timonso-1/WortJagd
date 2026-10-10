import { useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { ChevronLeft, ChevronRight, Globe2, NotebookPen, WifiOff } from "lucide-react";
import { HeaderControls } from "@/components/layout/HeaderControls";
import { LogoMark } from "@/components/ui/Logo";
import { TableApp } from "@/components/table/TableApp";

const ONLINE_URL: string = import.meta.env.VITE_ONLINE_URL ?? "";
type Screen = "home" | "table";

function hasRunningGame() {
  try {
    const g = JSON.parse(localStorage.getItem("wj.table.game") ?? "null");
    return !!g && g.phase !== "finished";
  } catch {
    return false;
  }
}

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function App() {
  const [screen, setScreen] = useState<Screen>(() => (hasRunningGame() ? "table" : "home"));
  const online = useOnline();

  // Android-Zurück-Taste: aus dem Tisch-Modus zum Start, vom Start aus App schließen
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = CapApp.addListener("backButton", () => {
      if (document.querySelector("dialog[open]")) {
        (document.querySelector("dialog[open]") as HTMLDialogElement).close();
        return;
      }
      setScreen((s) => {
        if (s === "table") return "home";
        void CapApp.exitApp();
        return s;
      });
    });
    return () => {
      void sub.then((h) => h.remove());
    };
  }, []);

  if (screen === "table") {
    return (
      <div className="mx-auto min-h-dvh max-w-xl px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <TableApp
          header={(actions) => (
            <header className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-1 border-b border-rim bg-night/90 px-2 py-2 backdrop-blur-md">
              <button className="icon-btn" onClick={() => setScreen("home")} aria-label="Zurück zum Start">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="flex-1 font-display text-lg font-semibold">Am Tisch</h1>
              {actions}
              <HeaderControls />
            </header>
          )}
        />
      </div>
    );
  }

  const canOnline = !!ONLINE_URL && online;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="font-display text-lg font-semibold">wortjagd</span>
        </span>
        <HeaderControls />
      </header>

      <div className="flex flex-1 flex-col justify-center py-10">
        <h1 className="font-display text-5xl font-semibold leading-[1.02]">Stadt, Land, Fluss.</h1>
        <p className="mt-3 text-lg text-haze">Wie willst du spielen?</p>

        <div className="mt-10 space-y-3">
          <button
            onClick={() => setScreen("table")}
            className="flex w-full items-center gap-4 rounded-xl bg-chalk p-5 text-left text-night transition active:scale-[0.99]"
          >
            <NotebookPen className="h-7 w-7 shrink-0" />
            <span className="flex-1">
              <span className="block text-lg font-semibold">Am Tisch</span>
              <span className="block text-sm opacity-70">Mit Zetteln. Die App zieht Buchstaben, stoppt die Zeit und zählt Punkte.</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 opacity-60" />
          </button>

          <button
            onClick={() => canOnline && (window.location.href = ONLINE_URL)}
            disabled={!canOnline}
            className="flex w-full items-center gap-4 rounded-xl border border-rim-2 p-5 text-left transition active:scale-[0.99] disabled:opacity-50"
          >
            {online ? <Globe2 className="h-7 w-7 shrink-0" /> : <WifiOff className="h-7 w-7 shrink-0" />}
            <span className="flex-1">
              <span className="block text-lg font-semibold">Online</span>
              <span className="block text-sm text-haze">
                {!ONLINE_URL
                  ? "In dieser Version nicht eingerichtet."
                  : online
                    ? "Jeder am eigenen Handy, im selben Raum oder übers Internet."
                    : "Braucht eine Internetverbindung."}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-dim" />
          </button>
        </div>
      </div>
    </div>
  );
}
