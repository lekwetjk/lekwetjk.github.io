"use client";

import { useState } from "react";
import {
  buildExportMapData, EXPORT_MAP_SLOTS, exportMapPeriodWarning, exportMapTitleWarnings, suggestExportMapTables,
  type ExportMapTableSelection,
} from "../../lib/bulletin-export-map";
import type { PreparedBulletin } from "../../lib/prepared-bulletin-model";

export default function DocxExportMapEditor({ bulletin, disabled, onChange }: {
  bulletin: PreparedBulletin;
  disabled: boolean;
  onChange: (bulletin: PreparedBulletin) => void;
}) {
  const [selection, setSelection] = useState<ExportMapTableSelection>(
    () => bulletin.exportMap ?? suggestExportMapTables(bulletin.tables),
  );
  const [confirmedWarnings, setConfirmedWarnings] = useState(() =>
    bulletin.exportMap?.confirmedTitleMismatch ? JSON.stringify(exportMapTitleWarnings(bulletin.tables, bulletin.exportMap)) : "",
  );
  const [status, setStatus] = useState("");
  const warnings = exportMapTitleWarnings(bulletin.tables, selection);
  const titleConfirmed = selection.confirmedTitleMismatch && confirmedWarnings === JSON.stringify(warnings);
  const periodWarning = exportMapPeriodWarning(bulletin.tables, selection, bulletin.id);
  const candidates = bulletin.tables.filter((table) =>
    table.rows.some((row) => row.some((cell) => /kraj\s+przeznaczenia/i.test(cell))),
  );

  function update(key: typeof EXPORT_MAP_SLOTS[number]["key"], value: string) {
    setSelection((current) => ({ ...current, [key]: value, confirmedTitleMismatch: false, confirmedPeriodMismatch: false }));
    setStatus("Wybór zmieniono. Przygotuj ponownie mapę przed publikacją.");
    if (bulletin.exportMap) onChange({ ...bulletin, exportMap: undefined });
  }

  function apply() {
    try {
      const currentSelection = { ...selection, confirmedTitleMismatch: titleConfirmed };
      const data = buildExportMapData(bulletin.tables, currentSelection, bulletin.id);
      onChange({ ...bulletin, exportMap: currentSelection });
      setStatus(`Mapa przygotowana: ${data.countries.length} państw, okres ${data.period} Sprawdź podgląd przed publikacją.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nie udało się przygotować danych mapy.");
    }
  }

  return <section className="report-metadata-editor" aria-label="Dane mapy eksportu">
    <h3>Mapa eksportu — cztery tabele źródłowe</h3>
    <p>Potwierdź tabele z bieżącego DOCX. Wybieraj tabele bieżącego okresu, nie porównania wieloletnie. Dane i udziały są pobierane bez przeliczania.</p>
    {EXPORT_MAP_SLOTS.map((slot) => <label key={slot.key}>{slot.label}
      <select value={selection[slot.key]} disabled={disabled} onChange={(event) => update(slot.key, event.target.value)}>
        <option value="">Wybierz tabelę</option>
        {candidates.map((table) => <option key={table.id} value={table.id}>{table.id}: {table.title || table.section}</option>)}
      </select>
    </label>)}
    {warnings.length ? <div role="alert">
      {warnings.map((warning) => <p key={warning}>{warning}</p>)}
      <label><input type="checkbox" checked={titleConfirmed} disabled={disabled} onChange={(event) => {
        setSelection((current) => ({ ...current, confirmedTitleMismatch: event.target.checked }));
        setConfirmedWarnings(event.target.checked ? JSON.stringify(warnings) : "");
        if (bulletin.exportMap) onChange({ ...bulletin, exportMap: undefined });
      }} /> Sprawdziłem dokument i potwierdzam przypisanie mimo rozbieżności nagłówka.</label>
    </div> : null}
    {periodWarning ? <div role="alert">
      <p>{periodWarning}</p>
      <label><input type="checkbox" checked={selection.confirmedPeriodMismatch ?? false} disabled={disabled} onChange={(event) => {
        setSelection((current) => ({ ...current, confirmedPeriodMismatch: event.target.checked }));
        if (bulletin.exportMap) onChange({ ...bulletin, exportMap: undefined });
      }} /> Sprawdziłem DOCX i potwierdzam, że ten okres danych jest właściwy dla wydania.</label>
    </div> : null}
    <button type="button" className="button button-outline" disabled={disabled} onClick={apply}>Przygotuj mapę z wybranych tabel</button>
    {status ? <p role="status">{status}</p> : null}
    {bulletin.exportMap ? <p>Mapa jest dołączona do podglądu biuletynu.</p> : <p>Przed publikacją przygotuj mapę z czterech tabel.</p>}
  </section>;
}
