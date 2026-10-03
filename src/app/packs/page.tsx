"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Pack {
  id: string;
  name: string;
  categories: string[];
  isPublic: boolean;
  uses: number;
  owner?: { name: string | null };
}

const empty = { name: "", categories: "", isPublic: false };

export default function PacksPage() {
  const [data, setData] = useState<{ mine: Pack[]; community: Pack[] } | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [packs, tok] = await Promise.all([
      fetch("/api/packs").then((r) => r.json()),
      fetch("/api/socket-token").then((r) => r.json()),
    ]);
    setData(packs);
    setLoggedIn(Boolean(tok.token));
  };

  useEffect(() => {
    load().catch(() => setError("Laden fehlgeschlagen."));
  }, []);

  async function save() {
    setError(null);
    const categories = form.categories.split(/[,\n]/).map((c) => c.trim()).filter(Boolean);
    const res = await fetch(editId ? `/api/packs/${editId}` : "/api/packs", {
      method: editId ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.name, categories: [...new Set(categories)], isPublic: form.isPublic }),
    });
    if (!res.ok) return setError((await res.json()).error ?? "Fehler.");
    setForm(empty);
    setEditId(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Paket löschen?")) return;
    await fetch(`/api/packs/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card space-y-3">
        <h1 className="font-display text-3xl">Kategorie-Pakete</h1>
        {!loggedIn ? (
          <p className="text-sm text-ink-soft">
            <Link href="/login" className="text-accent underline">Melde dich an</Link>, um eigene Pakete zu speichern.
          </p>
        ) : (
          <>
            <input className="input" placeholder="Name des Pakets" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <textarea
              className="input min-h-32"
              placeholder="Kategorien, durch Komma oder Zeilenumbruch getrennt (max. 20)"
              value={form.categories}
              onChange={(e) => setForm({ ...form, categories: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
              Für alle sichtbar (Community)
            </label>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={save}>{editId ? "Speichern" : "Anlegen"}</button>
              {editId && <button className="btn-ghost" onClick={() => { setEditId(null); setForm(empty); }}>Abbrechen</button>}
            </div>
            {error && <p className="text-sm text-bad">{error}</p>}

            <h2 className="pt-2 font-semibold">Meine Pakete</h2>
            {data?.mine.length === 0 && <p className="text-sm text-ink-soft">Noch keine.</p>}
            <ul className="space-y-2">
              {data?.mine.map((p) => (
                <li key={p.id} className="rounded-lg border border-line bg-paper p-3">
                  <div className="flex items-center gap-2">
                    <b>{p.name}</b>
                    {p.isPublic && <span className="text-xs text-ok">öffentlich</span>}
                    <span className="text-xs text-ink-soft">{p.uses}× genutzt</span>
                    <button className="ml-auto text-sm underline" onClick={() => { setEditId(p.id); setForm({ name: p.name, categories: p.categories.join(", "), isPublic: p.isPublic }); }}>
                      Bearbeiten
                    </button>
                    <button className="text-sm text-bad underline" onClick={() => remove(p.id)}>Löschen</button>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{p.categories.join(" · ")}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-display text-2xl">Community</h2>
        {data?.community.length === 0 && <p className="text-sm text-ink-soft">Noch keine öffentlichen Pakete.</p>}
        <ul className="space-y-2">
          {data?.community.map((p) => (
            <li key={p.id} className="rounded-lg border border-line bg-paper p-3">
              <div className="flex gap-2">
                <b>{p.name}</b>
                <span className="text-xs text-ink-soft">von {p.owner?.name ?? "?"} · {p.uses}×</span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{p.categories.join(" · ")}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-soft">Pakete lädt der Spielleiter in der Raum-Lobby.</p>
      </section>
    </div>
  );
}
