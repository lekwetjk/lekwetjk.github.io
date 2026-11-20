"use client";

import { useEffect, useRef, useState } from "react";
import { reusableMedia, type MediaAsset } from "../../lib/media-references";

const fieldStyle = { width: "100%", padding: 10, border: "1px solid #94a3b8", borderRadius: 6, background: "#fff" };
const sourceNames = { static: "Archiwum strony", r2: "Publikacje i nowe pliki", document: "Dokument w sekcji", bulletin: "Źródło biuletynu" };
const usageNames = { page: "Podstrona", post: "Publikacja", component: "Kod strony", document: "Sekcja dokumentów", bulletin: "Biuletyn", history: "Historia", trash: "Kosz" };
const PAGE_SIZE = 18;

function sizeLabel(size: number | null) {
  if (size === null) return "Rozmiar niedostępny";
  return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toLocaleString("pl-PL", { maximumFractionDigits: 2 })} MB`
    : `${Math.max(1, Math.ceil(size / 1024))} KB`;
}

export default function MediaBrowser({ kind, onSelect }: { kind?: "image" | "attachment"; onSelect?: (asset: MediaAsset) => void }) {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [format, setFormat] = useState("");
  const [state, setState] = useState("active");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const uploadRef = useRef<HTMLFormElement>(null);
  const selecting = Boolean(onSelect);

  async function load(signal?: AbortSignal) {
    const response = await fetch("/api/admin/media", { signal, cache: "no-store" });
    const data = await response.json() as { assets?: MediaAsset[]; error?: string };
    if (!response.ok || !Array.isArray(data.assets)) throw new Error(data.error ?? "Nie udało się odczytać biblioteki.");
    setAssets(data.assets);
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Nie udało się odczytać biblioteki.");
    });
    return () => controller.abort();
  }, []);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Nie udało się przesłać pliku.");
      uploadRef.current?.reset();
      await load();
      setState("active"); setPage(0);
      setMessage("Plik zapisany. Dotychczasowe pliki i adresy nie zostały zmienione.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Nie udało się przesłać pliku.");
    } finally { setBusy(false); }
  }

  async function changeTrash(asset: MediaAsset) {
    const action = asset.trashedAt ? "restore" : "trash";
    if (action === "trash" && !window.confirm(`Przenieść „${asset.name}” do kosza biblioteki? Plik pozostanie zachowany, a istniejący adres nadal będzie działał.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/media", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: asset.id, action }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Nie udało się zmienić stanu pliku.");
      await load();
      setMessage(action === "trash" ? "Plik jest w koszu biblioteki. Nie został fizycznie usunięty." : "Plik przywrócony do biblioteki.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Nie udało się zmienić stanu pliku.");
    } finally { setBusy(false); }
  }

  async function copyLink(asset: MediaAsset) {
    setError(""); setMessage("");
    try {
      await navigator.clipboard.writeText(new URL(asset.href, window.location.origin).href);
      setMessage(asset.private ? "Skopiowano link wymagający zalogowania. Uprawnienia pliku nie zostały zmienione." : "Skopiowano link do pliku.");
    } catch {
      setError("Nie udało się skopiować linku. Użyj opcji kopiowania adresu odnośnika „Otwórz plik”.");
    }
  }

  const filtered = (assets ?? []).filter(asset => {
    if (selecting && (!reusableMedia(asset) || (kind === "image" ? !asset.contentType.startsWith("image/") : !/\.(pdf|docx|xlsx)$/i.test(asset.key)))) return false;
    if (!selecting && (state === "trash" ? !asset.trashedAt : asset.trashedAt)) return false;
    if (source && asset.source !== source) return false;
    if (format && (format === "image" ? !asset.contentType.startsWith("image/") : asset.contentType.startsWith("image/"))) return false;
    const search = query.trim().toLocaleLowerCase("pl");
    return !search || [asset.name, asset.key, ...asset.usages.map(usage => usage.label)].some(text => text.toLocaleLowerCase("pl").includes(search));
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const shown = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return <section aria-label={selecting ? "Wybór pliku z biblioteki" : "Biblioteka mediów"} style={{ display: "grid", gap: 16, minWidth: 0 }}>
    {!selecting ? <>
      <p style={{ margin: 0 }}>Istniejące pliki pozostają pod swoimi adresami. Użycie w historii lub koszu również chroni plik. Kosz biblioteki nie kasuje plików ani nie unieważnia linków.</p>
      <form ref={uploadRef} onSubmit={event => void upload(event)} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 16, display: "grid", gap: 10 }}>
        <strong>Dodaj publiczny plik do biblioteki</strong>
        <span>JPEG, PNG, WebP, PDF, DOCX lub XLSX; maksymalnie 25 MB. Prywatne dokumenty dodawaj w dotychczasowych sekcjach, nie tutaj.</span>
        <label>Plik<input type="file" name="file" required accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx" style={{ display: "block", maxWidth: "100%" }} /></label>
        <button className="button button-primary" type="submit" disabled={busy} style={{ justifySelf: "start" }}>{busy ? "Zapisywanie..." : "Prześlij plik"}</button>
      </form>
    </> : null}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12 }}>
      <label>Szukaj pliku lub miejsca użycia<input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} style={fieldStyle} /></label>
      {!selecting ? <>
        <label>Źródło<select value={source} onChange={event => { setSource(event.target.value); setPage(0); }} style={fieldStyle}><option value="">Wszystkie źródła</option>{Object.entries(sourceNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
        <label>Rodzaj<select value={format} onChange={event => { setFormat(event.target.value); setPage(0); }} style={fieldStyle}><option value="">Wszystkie pliki</option><option value="image">Grafiki</option><option value="document">Dokumenty i pozostałe</option></select></label>
        <label>Widok<select value={state} onChange={event => { setState(event.target.value); setPage(0); }} style={fieldStyle}><option value="active">Aktywna biblioteka</option><option value="trash">Kosz biblioteki</option></select></label>
      </> : null}
    </div>
    {error ? <p role="alert" style={{ margin: 0, color: "#b91c1c" }}>{error}</p> : null}
    {message ? <p role="status" style={{ margin: 0, color: "#166534" }}>{message}</p> : null}
    {assets === null && !error ? <p>Wczytywanie biblioteki...</p> : null}
    {assets !== null ? <p style={{ margin: 0 }}>Znalezione pliki: <strong>{filtered.length}</strong>. Strona {currentPage + 1} z {pages}.</p> : null}
    {assets !== null && !filtered.length ? <p>Brak plików pasujących do filtrów.</p> : null}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))", gap: 14 }}>
      {shown.map(asset => <article key={asset.id} data-media-id={asset.id} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 14, minWidth: 0, overflowWrap: "anywhere", display: "flex", flexDirection: "column", gap: 10 }}>
        {asset.contentType.startsWith("image/") && !asset.private ? <img src={asset.href} alt="" loading="lazy" style={{ width: "100%", height: 130, objectFit: "contain", background: "#f8fafc" }} /> : null}
        <strong>{asset.name}</strong>
        <small>{sourceNames[asset.source]} · {sizeLabel(asset.size)}{asset.uploadedAt ? ` · ${new Date(asset.uploadedAt).toLocaleDateString("pl-PL")}` : ""}</small>
        {asset.private ? <strong style={{ color: "#9a3412" }}>Plik prywatny — wymagane zalogowanie</strong> : null}
        <small>{asset.key}</small>
        <details><summary>Miejsca użycia: {asset.usages.length}</summary>{asset.usages.length ? <ul style={{ paddingLeft: 20 }}>{asset.usages.map((usage, index) => <li key={index}>{usageNames[usage.kind]}: {usage.href ? <a href={usage.href} target="_blank" rel="noreferrer">{usage.label}</a> : usage.label}</li>)}</ul> : <p>Nie znaleziono odwołań. Nie jest to zgoda na trwałe usunięcie pliku.</p>}</details>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
          {selecting && onSelect ? <button type="button" className="button button-primary" onClick={() => onSelect(asset)}>Wybierz plik</button> : <>
            <a className="button button-outline" href={asset.href} target="_blank" rel="noreferrer">Otwórz plik</a>
            <button type="button" className="button button-outline" onClick={() => void copyLink(asset)}>Kopiuj link</button>
            {asset.source === "r2" ? <button type="button" className="button button-outline" disabled={busy || (!asset.trashedAt && asset.usages.length > 0)} onClick={() => void changeTrash(asset)}>{asset.trashedAt ? "Przywróć plik" : asset.usages.length ? "Chroniony — używany" : "Przenieś do kosza"}</button>
              : <small>Chroniony — {asset.source === "static" ? "plik archiwum" : "zarządzany w swojej sekcji"}</small>}
          </>}
        </div>
      </article>)}
    </div>
    {assets !== null && pages > 1 ? <nav aria-label="Strony biblioteki" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <button type="button" className="button button-outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Poprzednia</button>
      <button type="button" className="button button-outline" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Następna</button>
    </nav> : null}
  </section>;
}
