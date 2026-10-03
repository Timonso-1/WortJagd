"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { AVATAR_COLORS, AVATAR_ICONS, type AvatarIcon } from "@/lib/avatars";
import type { AvatarStyle } from "@/server/game/types";
import { AVATAR_ICON_MAP, Avatar } from "./Avatar";

export function AvatarPicker({
  name,
  value,
  onChange,
  size = 48,
}: {
  name: string;
  value: AvatarStyle | null;
  onChange: (a: AvatarStyle) => void;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AvatarStyle>(value ?? { color: AVATAR_COLORS[0], icon: "cat" });
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="group relative shrink-0 rounded-full"
        onClick={() => {
          setDraft(value ?? { color: AVATAR_COLORS[0], icon: "cat" });
          setOpen(true);
        }}
        title="Avatar ändern"
        aria-label="Avatar ändern"
      >
        <Avatar name={name || "?"} avatar={value} size={size} />
        <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-deck bg-tile px-1.5 text-[0.6rem] font-bold text-tile-ink opacity-90 group-hover:opacity-100">
          Ändern
        </span>
      </button>

      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        className="panel m-auto w-[min(26rem,calc(100vw-2rem))] p-0 text-chalk backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Avatar wählen</h2>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Schließen">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex justify-center">
            <Avatar name={name || "?"} avatar={draft} size={80} />
          </div>
          <p className="field-label mt-5">Farbe</p>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setDraft({ ...draft, color: c })}
                className="flex h-9 w-9 items-center justify-center rounded-full transition"
                style={{ background: c, boxShadow: draft.color === c ? `0 0 0 3px var(--color-deck), 0 0 0 5px ${c}` : undefined }}
                aria-label={`Farbe ${c}`}
                aria-pressed={draft.color === c}
              >
                {draft.color === c && <Check className="h-4 w-4 text-[#121735]" />}
              </button>
            ))}
          </div>
          <p className="field-label mt-5">Symbol</p>
          <div className="grid grid-cols-8 gap-1.5">
            {AVATAR_ICONS.map((i) => {
              const Icon = AVATAR_ICON_MAP[i as AvatarIcon];
              const on = draft.icon === i;
              return (
                <button
                  key={i}
                  onClick={() => setDraft({ ...draft, icon: i })}
                  className={`flex aspect-square items-center justify-center rounded-lg border transition ${
                    on ? "border-tile bg-tile/15 text-tile" : "border-rim text-haze hover:text-chalk"
                  }`}
                  aria-label={i}
                  aria-pressed={on}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          <button
            className="btn-primary mt-6 w-full"
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            <Check className="h-4 w-4" /> Übernehmen
          </button>
        </div>
      </dialog>
    </>
  );
}
