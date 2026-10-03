"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { applyTheme, getTheme, isMuted, setMuted, type Theme } from "@/lib/client/prefs";

export function HeaderControls() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setTheme(getTheme());
    setMutedState(isMuted());
  }, []);

  return (
    <div className="flex items-center">
      <button
        className="icon-btn"
        onClick={() => {
          setMuted(!muted);
          setMutedState(!muted);
        }}
        title={muted ? "Ton an" : "Ton aus"}
        aria-label={muted ? "Ton an" : "Ton aus"}
        aria-pressed={muted}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <button
        className="icon-btn"
        onClick={() => {
          const next = theme === "light" ? "dark" : "light";
          applyTheme(next);
          setTheme(next);
        }}
        title={theme === "light" ? "Dunkles Design" : "Helles Design"}
        aria-label={theme === "light" ? "Dunkles Design" : "Helles Design"}
      >
        {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
    </div>
  );
}
