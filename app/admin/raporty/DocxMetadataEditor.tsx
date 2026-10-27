"use client";

import { useState } from "react";
import type { PreparedBulletin } from "../../lib/prepared-bulletin-model";

export default function DocxMetadataEditor({ bulletin, disabled, onChange }: { bulletin: PreparedBulletin; disabled: boolean; onChange: (bulletin: PreparedBulletin) => void }) {
  const [selected, setSelected] = useState("");
  const entries = [
    ...bulletin.charts.map((item) => ({ ...item, type: "chart" as const })),
    ...bulletin.tables.map((item) => ({ ...item, type: "table" as const })),
  ];
  const item = entries.find((entry) => `${entry.type}:${entry.id}` === selected) ?? entries[0];
  if (!item) return null;

  function update(patch: { title?: string; description?: string; section?: string; unit?: string }) {
    if (!item) return;
    const { unit, ...metadata } = patch;
    const charts = bulletin.charts.map((chart) => {
      if (item.type !== "chart" || chart.id !== item.id) return chart;
      const updated = { ...chart, ...metadata };
      return unit !== undefined ? {
        ...updated,
        metric: unit.trim() ? { label: updated.title, description: updated.description || updated.title, unit, format: chart.metric?.format ?? "number" as const } : undefined,
      } : updated;
    });
    const tables = bulletin.tables.map((table) => item.type === "table" && table.id === item.id ? { ...table, ...metadata } : table);
    onChange({ ...bulletin, charts, tables, sections: [...new Set([...charts, ...tables].map((entry) => entry.section))] });
  }

  return <details className="report-metadata-editor">
    <summary>Popraw tytuły, opisy, obszary i jednostki</summary>
    <label>Wykres lub tabela<select value={`${item.type}:${item.id}`} disabled={disabled} onChange={(event) => setSelected(event.target.value)}>{entries.map((entry) => <option key={`${entry.type}:${entry.id}`} value={`${entry.type}:${entry.id}`}>{entry.type === "chart" ? "Wykres" : "Tabela"} {entry.id}: {entry.title || entry.section}</option>)}</select></label>
    <label>Tytuł<input value={item.title ?? ""} disabled={disabled} onChange={(event) => update({ title: event.target.value })} /></label>
    <label>Krótki opis<textarea rows={3} value={item.description ?? ""} disabled={disabled} onChange={(event) => update({ description: event.target.value })} /></label>
    <label>Obszar<select value={item.section} disabled={disabled} onChange={(event) => update({ section: event.target.value })}>{[...new Set([...bulletin.sections, "Produkcja mięsa drobiowego", "Ceny i rynek krajowy", "Handel zagraniczny", "Wylęgi i hodowla", "Pozostałe dane"])].map((section) => <option key={section}>{section}</option>)}</select></label>
    {item.type === "chart" ? <label>Jednostka<input value={item.metric?.unit ?? ""} disabled={disabled} onChange={(event) => update({ unit: event.target.value })} /></label> : null}
    <small>Jednostka opisuje dane, nie przelicza wartości. Procenty z OCR są przeliczane przy dodawaniu wykresu.</small>
  </details>;
}
