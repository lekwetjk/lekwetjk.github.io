"use client";

import { useEffect, useState } from "react";

type WstawieniaRow = { year: string; values: string[] };
type WstawieniaData = { columns: string[]; rows: WstawieniaRow[] };

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; } else { quoted = !quoted; }
    } else if (character === ";" && !quoted) { values.push(value.trim()); value = ""; } else { value += character; }
  }
  values.push(value.trim());
  return values;
}

export default function WstawieniaEditor() {
  const [data, setData] = useState<WstawieniaData | null>(null);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/wstawienia")
      .then(async (response) => response.ok ? response.json() : Promise.reject())
      .then((value: WstawieniaData) => setData(value))
      .catch(() => setStatus("Nie udało się wczytać tabeli."));
  }, []);

  function updateCell(rowIndex: number, columnIndex: number, value: string) {
    setData((current) => current ? {
      ...current,
      rows: current.rows.map((row, index) => index === rowIndex ? {
        ...row,
        values: row.values.map((cell, cellIndex) => cellIndex === columnIndex ? value : cell),
      } : row),
    } : current);
  }

  function addYear() {
    setData((current) => current ? {
      ...current,
      rows: [...current.rows, { year: String(new Date().getFullYear()), values: Array(current.columns.length).fill("") }],
    } : current);
  }

  async function saveRows(rows = data?.rows) {
    if (!rows) return;
    setIsSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/wstawienia", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Nie udało się zapisać tabeli.");
      setStatus("Tabela została zapisana.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nie udało się zapisać tabeli.");
    } finally {
      setIsSaving(false);
    }
  }

  async function importCsv(file: File) {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2 || !data) { setStatus("CSV nie zawiera danych."); return; }
    const importedRows = lines.slice(1).map(parseCsvLine).map((cells) => ({
      year: cells[0] ?? "",
      values: data.columns.map((_, index) => cells[index + 1] ?? ""),
    }));
    setData({ ...data, rows: importedRows });
    setStatus("Załadowano CSV. Kliknij Zapisz tabelę, aby opublikować zmiany.");
  }

  if (!data) return <p>{status || "Ładowanie tabeli..."}</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => void saveRows()} disabled={isSaving} className="button button-primary">{isSaving ? "Zapisywanie..." : "Zapisz tabelę"}</button>
        <button type="button" onClick={addYear} className="button button-outline">Dodaj rok</button>
        <a href="/api/admin/wstawienia/export" className="button button-outline">Eksportuj CSV</a>
        <label className="button button-outline" style={{ cursor: "pointer" }}>
          Importuj CSV
          <input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); event.currentTarget.value = ""; }} style={{ display: "none" }} />
        </label>
      </div>
      <p style={{ margin: 0, color: status.startsWith("Tabela") || status.startsWith("Załadowano") ? "#166534" : "#b91c1c" }}>{status}</p>
      <div className="wstawienia-table-wrap">
        <table className="wstawienia-table">
          <thead><tr><th>Rok</th>{data.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>{data.rows.map((row, rowIndex) => <tr key={`${row.year}-${rowIndex}`}>
            <th scope="row"><input value={row.year} onChange={(event) => setData({ ...data, rows: data.rows.map((item, index) => index === rowIndex ? { ...item, year: event.target.value } : item) })} style={{ width: 64 }} /></th>
            {data.columns.map((_, columnIndex) => <td key={`${rowIndex}-${columnIndex}`}><input value={row.values[columnIndex] ?? ""} onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)} style={{ minWidth: 84 }} /></td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}