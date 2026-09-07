"use client";

import { useState } from "react";

export default function ImportUsersForm() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      document.getElementById("member-users-csv-input")?.click();
      return;
    }

    setIsImporting(true);
    setMessage("Trwa import danych…");
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/users/import", { method: "POST", body: formData });
      const data = await response.json() as { created?: number; skipped?: number; errors?: string[]; error?: string };
      setErrors(data.errors ?? []);
      setMessage(response.ok ? `Utworzono kont: ${data.created ?? 0}. Pominięto: ${data.skipped ?? 0}.` : (data.error ?? "Import nie powiódł się."));
      if (response.ok && data.created) window.location.reload();
    } catch {
      setErrors([]);
      setMessage("Nie można połączyć się z serwerem importu. Odśwież stronę i spróbuj ponownie.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 18, padding: 18, border: "1px solid #d5d9df", borderRadius: 8, display: "grid", gap: 10 }}>
      <h2 style={{ margin: 0 }}>Import członków z CSV</h2>
      <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>Kolumny wymagane: login, nazwa, haslo. Opcjonalnie: rola. Obsługiwane kodowanie: UTF-8, Windows-1250 i UTF-16.</p>
      <input id="member-users-csv-input" type="file" accept=".csv,text/csv" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setMessage(""); }} style={{ display: "none" }} />
      <button type="submit" disabled={isImporting} style={{ width: "fit-content", maxWidth: "100%", padding: "10px 14px", background: isImporting ? "#94a3b8" : "#0f766e", color: "#fff", border: 0, borderRadius: 6, fontWeight: 700, cursor: isImporting ? "wait" : "pointer" }}>
        {isImporting ? "Trwa import danych…" : file ? `Importuj: ${file.name}` : "Importuj konta"}
      </button>
      {message ? <p style={{ margin: 0, color: errors.length ? "#b91c1c" : "#166534" }}>{message}</p> : null}
      {errors.length ? <ul style={{ margin: 0, color: "#b91c1c" }}>{errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}
    </form>
  );
}
