"use client";

import { Minus, Plus, type LucideIcon } from "lucide-react";

export function Row({ icon: Icon, label, hint, children }: { icon: LucideIcon; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-rim py-3 last:border-b-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-night-2 text-haze">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-dim">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

export function Stepper(props: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const step = props.step ?? 1;
  const set = (v: number) => props.onChange(Math.min(props.max, Math.max(props.min, v)));
  return (
    <Row icon={props.icon} label={props.label} hint={props.hint}>
      <div className="flex items-center gap-1">
        <button className="icon-btn h-9 w-9 border border-rim" aria-label={`${props.label} verringern`} disabled={props.value <= props.min} onClick={() => set(props.value - step)}>
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-14 text-center font-mono text-base font-medium tabular-nums">
          {props.format ? props.format(props.value) : props.value}
        </span>
        <button className="icon-btn h-9 w-9 border border-rim" aria-label={`${props.label} erhöhen`} disabled={props.value >= props.max} onClick={() => set(props.value + step)}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </Row>
  );
}

export function Switch(props: { icon: LucideIcon; label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row icon={props.icon} label={props.label} hint={props.hint}>
      <button role="switch" aria-checked={props.on} aria-label={props.label} onClick={() => props.onChange(!props.on)}>
        <span className={`relative block h-6 w-11 rounded-full transition-colors ${props.on ? "bg-chalk" : "bg-rim-2"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full shadow transition-all ${props.on ? "left-[1.375rem] bg-night" : "left-0.5 bg-chalk"}`} />
        </span>
      </button>
    </Row>
  );
}

export function formatTime(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
