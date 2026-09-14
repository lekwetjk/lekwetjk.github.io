"use client";
import { useState } from "react";

const tenderCategories = ["Zapytania ofertowe", "Zaproszenie do składania ofert", "Wybór wykonawcy", "Wyniki postępowania", "Informacja o unieważnieniu"];

export default function PublicationForm({ kind }: { kind: "news" | "tender" }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const tender = kind === "tender";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    try { const response = await fetch("/api/admin/managed-posts", { method: "POST", body: new FormData(event.currentTarget) }); const data = await response.json().catch(() => ({})) as { error?: string }; if (!response.ok) throw new Error(data.error ?? "Nie udało się zapisać."); event.currentTarget.reset(); setMessage("Wpis został opublikowany."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Nie udało się zapisać."); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} style={{ display: "grid", gap: 12, border: "1px solid #d5d9df", borderRadius: 8, padding: 18 }}>
    <input type="hidden" name="kind" value={kind} />
    <h2 style={{ margin: 0 }}>{tender ? "Dodaj zapytanie ofertowe" : "Dodaj post"}</h2>
    <label>Tytuł<input name="title" required style={{ width: "100%", padding: 10 }} /></label>
    {tender ? <label>Kategoria<select name="category" required defaultValue={tenderCategories[0]} style={{ width: "100%", padding: 10 }}>{tenderCategories.map((category) => <option key={category}>{category}</option>)}</select></label> : null}
    <label>Krótki opis<input name="excerpt" required style={{ width: "100%", padding: 10 }} /></label>
    <label>Treść<textarea name="content" required rows={10} style={{ width: "100%", padding: 10 }} /></label>
    <label>Grafika<input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label>
    <label>Link źródłowy (opcjonalnie)<input name="source" type="url" style={{ width: "100%", padding: 10 }} /></label>
    <button type="submit" disabled={saving} className="button button-primary">{saving ? "Publikowanie..." : "Opublikuj"}</button>
    {message ? <p style={{ margin: 0, color: message.includes("opublikowany") ? "#166534" : "#b91c1c" }}>{message}</p> : null}
  </form>;
}