"use client";

import { useEffect } from "react";
import { RotateCcw, Settings2, Trophy } from "lucide-react";
import { Confetti } from "@/components/fx/Confetti";
import { sfx } from "@/lib/client/sound";
import { placeOf } from "./CardsPlay";
import type { CardsGame } from "./store";

export function CardsFinished({ game, onRematch, onNew }: { game: CardsGame; onRematch: () => void; onNew: () => void }) {
  useEffect(() => {
    sfx.win();
  }, []);
  const ranked = [...game.players].sort((a, b) => (placeOf(game, a) ?? 99) - (placeOf(game, b) ?? 99));
  const winners = ranked.filter((p) => placeOf(game, p) === 1);

  return (
    <div className="space-y-5 pb-28">
      <Confetti />
      <div className="pt-4 text-center">
        <h1 className="font-display text-4xl font-semibold">
          {winners.length > 1 ? `${winners.map((w) => w.name).join(" und ")} gewinnen` : winners[0] ? `${winners[0].name} gewinnt` : "Partie beendet"}
        </h1>
        <p className="mt-1 text-haze">
          {game.rounds.length} {game.rounds.length === 1 ? "Kategorie" : "Kategorien"}: {game.rounds.map((r) => r.category).join(", ")}
        </p>
      </div>
      <ol className="space-y-2">
        {ranked.map((p, i) => {
          const place = placeOf(game, p);
          return (
            <li
              key={p.id}
              className={`animate-reveal flex items-center gap-4 rounded-xl border px-4 py-3 ${place === 1 ? "border-chalk bg-chalk text-night" : "border-rim"}`}
              style={{ animationDelay: `${(ranked.length - i) * 150}ms` }}
            >
              <span className="w-8 font-mono text-lg font-semibold">{place ? `${place}.` : "–"}</span>
              <span className="flex-1 truncate text-lg font-medium">{p.name}</span>
              {place === 1 && <Trophy className="h-5 w-5" />}
              <span className="text-sm opacity-70">
                {p.finishedRound ? `nach Runde ${p.finishedRound}` : `${p.count} Karten übrig`}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rim bg-night/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-xl gap-2">
          <button className="btn-secondary flex-1 py-3.5" onClick={onNew}>
            <Settings2 className="h-5 w-5" /> Neue Partie
          </button>
          <button className="btn-primary flex-1 py-3.5" onClick={onRematch}>
            <RotateCcw className="h-5 w-5" /> {game.settings.dealt ? "Neu austeilen" : "Revanche"}
          </button>
        </div>
      </div>
    </div>
  );
}
