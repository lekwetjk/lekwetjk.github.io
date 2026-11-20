"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Version = { id: string; kind: string; resourceId: string; label: string; capturedAt: string; capturedBy: string };
type TrashItem = { id: string; kind: string; resourceId: string; snapshotJson: string; deletedAt: string };
type Preview = { id: string; label: string; kind: string; previous: unknown; current: unknown; expectedStateHash: string; canRestore: boolean };
const labels: Record<string, string> = { post: "Publikacja", document: "Dokument", bulletin: "Biuletyn", wstawienia: "Wstawienia" };
const box = { border: "1px solid #d5d9df", borderRadius: 12, padding: 18, overflowWrap: "anywhere" } as const;

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Nie udało się wykonać operacji.");
  return data;
}

function trashLabel(item: TrashItem) {
  const snapshot = JSON.parse(item.snapshotJson) as { title?: string };
  return snapshot.title ?? item.resourceId;
}

export default function ContentHistoryManager({ historyEnabled, trashEnabled }: { historyEnabled: boolean; trashEnabled: boolean }) {
  const [tab, setTab] = useState<"history" | "trash">(historyEnabled ? "history" : "trash");
  const [versions, setVersions] = useState<Version[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(true);
  const previewPanel = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    const [history, removed] = await Promise.all([
      historyEnabled ? fetch("/api/admin/content-history", { cache: "no-store" }).then(readResponse<{ entries: Version[] }>) : Promise.resolve({ entries: [] }),
      trashEnabled ? fetch("/api/admin/content-trash", { cache: "no-store" }).then(readResponse<{ entries: TrashItem[] }>) : Promise.resolve({ entries: [] }),
    ]);
    for (const item of removed.entries) {
      try { if (typeof trashLabel(item) !== "string") throw new Error("Nieprawidłowy tytuł."); }
      catch (error) { throw new Error(`Nie można odczytać elementu kosza ${item.id}. Skontaktuj się z administratorem.`, { cause: error }); }
    }
    setVersions(history.entries);
    setTrash(removed.entries);
  }, [historyEnabled, trashEnabled]);

  useEffect(() => {
    let active = true;
    load().catch(error => { if (active) { setError(true); setMessage(error instanceof Error ? error.message : "Nie udało się odczytać danych."); } })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [load]);
  useEffect(() => { if (preview) previewPanel.current?.focus(); }, [preview]);

  async function showVersion(id: string) {
    setBusy(true); setMessage(""); setError(false); setPreview(null);
    try { setPreview(await readResponse<Preview>(await fetch(`/api/admin/content-history?id=${encodeURIComponent(id)}`, { cache: "no-store" }))); }
    catch (error) { setError(true); setMessage(error instanceof Error ? error.message : "Nie udało się otworzyć podglądu."); }
    finally { setBusy(false); }
  }

  async function restore(source: "history" | "trash", id: string) {
    if (!window.confirm(source === "history" ? "Przywrócić tę wersję? Bieżąca treść zostanie wcześniej zachowana w historii. Adres publikacji pozostanie bez zmian." : "Przywrócić element z kosza? Publikacja ponownie pojawi się na stronie lub liście dokumentów.")) return;
    setBusy(true); setMessage(""); setError(false);
    try {
      await readResponse(await fetch(`/api/admin/content-${source}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...(source === "history" ? { expectedStateHash: preview?.expectedStateHash } : {}) }),
      }));
      setPreview(null);
      await load();
      setMessage(source === "history" ? "Wersja została przywrócona. Poprzedni stan pozostaje w historii." : "Element został przywrócony z kosza.");
    } catch (error) { setError(true); setMessage(error instanceof Error ? error.message : "Nie udało się przywrócić treści."); }
    finally { setBusy(false); }
  }

  const matches = (entryKind: string, label: string) => (!kind || entryKind === kind) && label.toLocaleLowerCase("pl").includes(query.toLocaleLowerCase("pl"));
  const shownVersions = versions.filter(item => matches(item.kind, item.label));
  const shownTrash = trash.filter(item => matches(item.kind, trashLabel(item)));
  return <div style={{ display: "grid", gap: 20 }}>
    <p>Wersje są zabezpieczane przed zmianą lub usunięciem treści, również przed nieudanym zapisem. Historia zaczyna się od uruchomienia tej funkcji. Pliki nie są trwale usuwane.</p>
    <div role="tablist" aria-label="Historia i kosz" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {historyEnabled && <button type="button" role="tab" aria-selected={tab === "history"} className="button button-outline" disabled={busy} onClick={() => { setTab("history"); setPreview(null); }}>Historia zmian ({versions.length})</button>}
      {trashEnabled && <button type="button" role="tab" aria-selected={tab === "trash"} className="button button-outline" disabled={busy} onClick={() => { setTab("trash"); setPreview(null); }}>Kosz ({trash.length})</button>}
    </div>
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <label>Szukaj po tytule <input type="search" value={query} onChange={event => setQuery(event.target.value)} style={{ display: "block", padding: 10, maxWidth: "100%", border: "1px solid #94a3b8", borderRadius: 6, background: "#fff" }} /></label>
      <label>Rodzaj treści <select value={kind} onChange={event => setKind(event.target.value)} style={{ display: "block", padding: 10, border: "1px solid #94a3b8", borderRadius: 6, background: "#fff" }}><option value="">Wszystkie rodzaje</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {message && <p role={error ? "alert" : "status"} style={{ ...box, color: error ? "#b91c1c" : "#166534" }}>{message}</p>}
    {busy && <p role="status">Ładowanie…</p>}
    {tab === "history" && <section aria-label="Zabezpieczone wersje" style={{ display: "grid", gap: 12 }}>
      {!busy && !shownVersions.length && <p>Brak zabezpieczonych wersji dla wybranych filtrów. Pierwsza pojawi się po edycji istniejącej treści.</p>}
      {shownVersions.map(item => <article key={item.id} style={box}><strong>{item.label}</strong><p style={{ margin: "8px 0" }}>{labels[item.kind] ?? item.kind} · {new Date(item.capturedAt).toLocaleString("pl-PL")} · {item.capturedBy}</p><button type="button" className="button button-outline" disabled={busy} onClick={() => void showVersion(item.id)}>Porównaj i przywróć</button></article>)}
    </section>}
    {tab === "trash" && <section aria-label="Elementy w koszu" style={{ display: "grid", gap: 12 }}>
      <p>Kosz nie cofa uprawnień do dokumentów. Istniejące odnośniki do zachowanych plików nadal działają.</p>
      {!busy && !shownTrash.length && <p>Kosz jest pusty dla wybranych filtrów.</p>}
      {shownTrash.map(item => <article key={item.id} style={box}><strong>{trashLabel(item)}</strong><p>{labels[item.kind] ?? item.kind} · {new Date(item.deletedAt).toLocaleString("pl-PL")}</p><button type="button" className="button button-primary" disabled={busy} onClick={() => void restore("trash", item.id)}>Przywróć z kosza</button></article>)}
    </section>}
    {preview && <section ref={previewPanel} tabIndex={-1} aria-label="Porównanie wersji" style={box}><h2>{preview.label}</h2><p>Przywrócenie wymaga osobnego potwierdzenia. Porównanie dotyczy treści, nie wyglądu publicznej strony.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 18 }}>
        {[["Wybrana wersja", preview.previous], ["Bieżąca wersja", preview.current]].map(([title, value]) => <div key={String(title)}><h3>{String(title)}</h3><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 13, background: "#f8fafc", padding: 12 }}>{value === null ? "Element jest w koszu lub nie istnieje." : JSON.stringify(value, null, 2)}</pre></div>)}
      </div>
      {preview.kind === "document" && <p><a href={`/api/admin/content-history?id=${encodeURIComponent(preview.id)}&download=true`}>Pobierz plik z wybranej wersji</a></p>}
      {!preview.canRestore && <p>Najpierw przywróć element z kosza.</p>}
      <button type="button" className="button button-primary" disabled={busy || !preview.canRestore} onClick={() => void restore("history", preview.id)}>Przywróć wybraną wersję</button>
    </section>}
  </div>;
}
