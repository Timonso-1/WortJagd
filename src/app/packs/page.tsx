"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe2, Library, Loader2, Lock, LogIn, Pencil, Plus, Save, Trash2, Users, X } from "lucide-react";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

interface Pack {
  id: string;
  name: string;
  categories: string[];
  isPublic: boolean;
  uses: number;
  owner?: { name: string | null };
}

const empty = { name: "", categories: "", isPublic: false };

function parseCats(raw: string) {
  return [...new Set(raw.split(/[,\n]/).map((c) => c.trim()).filter(Boolean))];
}

function CategoryChips({ cats }: { cats: string[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {cats.map((c) => (
        <li key={c} className="chip py-0.5 pl-2 text-xs">
          <CategoryIcon name={c} className="h-3.5 w-3.5 text-tile" />
          {c}
        </li>
      ))}
    </ul>
  );
}

export default function PacksPage() {
  const [data, setData] = useState<{ mine: Pack[]; community: Pack[] } | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [packs, tok] = await Promise.all([
      fetch("/api/packs").then((r) => (r.ok ? r.json() : { mine: [], community: [] })),
      fetch("/api/socket-token").then((r) => r.json()),
    ]);
    setData(packs);
    setLoggedIn(Boolean(tok.token));
  };

  useEffect(() => {
    load().catch(() => setError("Pakete konnten nicht geladen werden."));
  }, []);

  const preview = parseCats(form.categories);

  async function save() {
    setError(null);
    setSaving(true);
    const res = await fetch(editId ? `/api/packs/${editId}` : "/api/packs", {
      method: editId ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.name, categories: preview, isPublic: form.isPublic }),
    });
    setSaving(false);
    if (!res.ok) return setError((await res.json()).error ?? "Speichern fehlgeschlagen.");
    setForm(empty);
    setEditId(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Paket endgültig löschen?")) return;
    await fetch(`/api/packs/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Library className="h-7 w-7 text-tile" />
        <h1 className="font-display text-3xl font-semibold">Kategorie-Pakete</h1>
      </div>
      <p className="max-w-xl text-haze">
        Stell dir eigene Kategorien zusammen und lade sie in jedem Raum mit einem Klick. Öffentliche Pakete können alle nutzen.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="panel p-6" aria-labelledby="mine-h">
          {!loggedIn ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Lock className="h-8 w-8 text-dim" />
              <p className="text-haze">Zum Speichern eigener Pakete brauchst du ein Konto.</p>
              <Link href="/login" className="btn-primary">
                <LogIn className="h-4 w-4" /> Anmelden
              </Link>
            </div>
          ) : (
            <>
              <h2 id="mine-h" className="mb-4 font-display text-xl font-semibold">
                {editId ? "Paket bearbeiten" : "Neues Paket"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="field-label" htmlFor="pack-name">Name</label>
                  <input id="pack-name" className="field" placeholder="z. B. Filmabend" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="field-label" htmlFor="pack-cats">Kategorien, getrennt durch Komma oder neue Zeile</label>
                  <textarea
                    id="pack-cats"
                    className="field min-h-28 resize-y"
                    placeholder={"Film, Schauspieler, Regisseur"}
                    value={form.categories}
                    onChange={(e) => setForm({ ...form, categories: e.target.value })}
                  />
                  <p className={`mt-1 text-xs ${preview.length > 20 ? "text-stop" : "text-dim"}`}>{preview.length} von maximal 20</p>
                  {preview.length > 0 && <CategoryChips cats={preview.slice(0, 20)} />}
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-haze">
                  <input type="checkbox" className="h-4 w-4 accent-tile" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
                  Für alle in der Community sichtbar
                </label>
                <div className="flex gap-2">
                  <button className="btn-primary" onClick={save} disabled={saving || !form.name.trim() || preview.length === 0 || preview.length > 20}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editId ? "Änderungen speichern" : "Paket anlegen"}
                  </button>
                  {editId && (
                    <button className="btn-quiet" onClick={() => { setEditId(null); setForm(empty); }}>
                      <X className="h-4 w-4" /> Abbrechen
                    </button>
                  )}
                </div>
                {error && <p role="alert" className="text-sm text-stop">{error}</p>}
              </div>

              <h3 className="mb-3 mt-8 font-semibold">Meine Pakete</h3>
              {data?.mine.length === 0 && <p className="text-sm text-dim">Du hast noch kein Paket angelegt.</p>}
              <ul className="space-y-3">
                {data?.mine.map((p) => (
                  <li key={p.id} className="well p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.name}</span>
                      {p.isPublic ? <Globe2 className="h-3.5 w-3.5 text-go" aria-label="Öffentlich" /> : <Lock className="h-3.5 w-3.5 text-dim" aria-label="Privat" />}
                      <span className="text-xs text-dim">{p.uses}× genutzt</span>
                      <span className="ml-auto flex">
                        <button className="icon-btn" title="Bearbeiten" onClick={() => { setEditId(p.id); setForm({ name: p.name, categories: p.categories.join(", "), isPublic: p.isPublic }); }}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="icon-btn hover:!text-stop" title="Löschen" onClick={() => remove(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </span>
                    </div>
                    <CategoryChips cats={p.categories} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="panel p-6" aria-labelledby="community-h">
          <h2 id="community-h" className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
            <Users className="h-5 w-5 text-sky" /> Community
          </h2>
          {data?.community.length === 0 && <p className="text-sm text-dim">Noch niemand hat ein Paket geteilt.</p>}
          <ul className="space-y-3">
            {data?.community.map((p) => (
              <li key={p.id} className="well p-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-xs text-dim">von {p.owner?.name ?? "Unbekannt"}</span>
                  <span className="ml-auto text-xs text-dim">{p.uses}× genutzt</span>
                </div>
                <CategoryChips cats={p.categories} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-dim">Laden kannst du Pakete als Spielleiter in der Raum-Lobby.</p>
        </section>
      </div>
    </div>
  );
}
