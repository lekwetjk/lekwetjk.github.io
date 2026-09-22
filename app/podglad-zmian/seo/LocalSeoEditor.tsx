"use client";

import { useEffect, useState } from "react";
import { parseLocalSeoDraft, PROPOSAL_SEO_COOKIE, type LocalSeoDraft } from "../../lib/local-proposals";

export default function LocalSeoEditor({ entries }: { entries: LocalSeoDraft[] }) {
  const [draft, setDraft] = useState(entries[0]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const value = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${PROPOSAL_SEO_COOKIE}=`))?.slice(PROPOSAL_SEO_COOKIE.length + 1);
    const saved = parseLocalSeoDraft(value);
    if (saved) setDraft(saved);
  }, []);

  function save(event: React.FormEvent) {
    event.preventDefault();
    const normalized = parseLocalSeoDraft(encodeURIComponent(JSON.stringify(draft)));
    if (!normalized) { setStatus("Podaj lokalny adres /tresc/... lub /aktualnosci/..."); return; }
    const value = encodeURIComponent(JSON.stringify(normalized));
    if (value.length > 3500) { setStatus("Skróć tekst, aby zmieścić wersję lokalną w przeglądarce."); return; }
    document.cookie = `${PROPOSAL_SEO_COOKIE}=${value}; Path=/; SameSite=Lax; Max-Age=2592000`;
    setDraft(normalized);
    setStatus("Zapisano lokalną wersję. Otwórz stronę przy włączonej propozycji SEO.");
  }

  return <>
    <form className="proposal-seo-form" onSubmit={save}>
      <label>Strona lub wpis<select value={entries.some((entry) => entry.path === draft.path) ? draft.path : ""} onChange={(event) => { const entry = entries.find((candidate) => candidate.path === event.target.value); if (entry) setDraft(entry); }}><option value="" disabled>Własny adres wpisu</option>{entries.map((entry) => <option key={entry.path} value={entry.path}>{entry.title}</option>)}</select></label>
      <label>Adres lokalny<input required value={draft.path} onChange={(event) => setDraft({ ...draft, path: event.target.value })} /></label>
      <label>Tytuł SEO<input maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /><small>{draft.title.length}/100 znaków</small></label>
      <label>Opis SEO<textarea maxLength={240} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /><small>{draft.description.length}/240 znaków</small></label>
      <div className="proposal-actions"><button type="submit">Zapisz lokalny podgląd</button><button type="button" onClick={() => { document.cookie = `${PROPOSAL_SEO_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`; setStatus("Usunięto lokalną wersję SEO."); }}>Przywróć domyślne SEO</button></div>
    </form>
    <p role="status">{status}</p>
    <div className="proposal-search-result"><small>{draft.path}</small><h2>{draft.title || "Domyślny tytuł strony"} | KRD-IG</h2><p>{draft.description || "Domyślny opis strony"}</p></div>
    {parseLocalSeoDraft(encodeURIComponent(JSON.stringify(draft))) ? <a href={draft.path}>Otwórz stronę →</a> : null}
  </>;
}