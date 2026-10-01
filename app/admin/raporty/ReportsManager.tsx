"use client";

import { useEffect, useState } from "react";
import readXlsxFile from "read-excel-file/browser";

import { shouldCollectBulletinSourceSheet } from "../../lib/bulletin-model";

type ReportSummary = {
  id: string;
  slug: string;
  title: string;
  sheetCount: number;
  rowCount: number;
  sourceCount: number;
  createdAt: string;
};

const months = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];

export default function ReportsManager() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);

  async function loadReports() {
    const response = await fetch("/api/admin/reports");
    const data = await response.json() as { reports?: ReportSummary[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Nie udało się pobrać raportów.");
    setReports(data.reports ?? []);
  }

  useEffect(() => { void loadReports().catch((error) => setStatus(error instanceof Error ? error.message : "Nie udało się pobrać raportów.")); }, []);

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const sourceInput = form.elements.namedItem("sources") as HTMLInputElement | null;
    const files = Array.from(sourceInput?.files ?? []);
    const formData = new FormData(form);
    if (!files.length) return;
    setSaving(true);
    setStatus("Przygotowywanie plików…");
    try {
      let uploadId = "";
      for (const [index, file] of files.entries()) {
        setStatus(`Przesyłanie i analiza pliku ${index + 1} z ${files.length}: ${file.name}`);
        const stagedForm = new FormData();
        stagedForm.set("mode", "stage");
        stagedForm.set("uploadId", uploadId);
        stagedForm.set("source", file);
        const stagedResponse = await fetch("/api/admin/reports", { method: "POST", body: stagedForm });
        const stagedData = await stagedResponse.json().catch(() => ({})) as { uploadId?: string; sourceIndex?: number; error?: string };
        if (!stagedResponse.ok || !stagedData.uploadId) throw new Error(stagedData.error ?? `Nie udało się przetworzyć pliku „${file.name}”.`);
        uploadId = stagedData.uploadId;
        if (/\.xlsx$/i.test(file.name) && stagedData.sourceIndex !== undefined) {
          setStatus(`Analiza pliku ${index + 1} z ${files.length}: ${file.name}`);
          const workbookSheets = await readXlsxFile(file);
          let sheetCount = 0;
          let rowCount = 0;
          let cellCount = 0;
          for (const workbookSheet of workbookSheets) {
            const populatedRows = workbookSheet.data.filter((row) => row.some((value) => value !== null && value !== undefined && String(value).trim() !== ""));
            if (populatedRows.length) {
              sheetCount += 1;
              rowCount += populatedRows.length;
              cellCount += populatedRows.reduce((sum, row) => sum + row.length, 0);
            }
            if (!shouldCollectBulletinSourceSheet(file.name, workbookSheet.sheet)) continue;
            const sheetResponse = await fetch("/api/admin/reports", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: "sheet", uploadId, sourceIndex: stagedData.sourceIndex, sheet: { workbook: file.name, name: workbookSheet.sheet, rows: workbookSheet.data } }),
            });
            const sheetData = await sheetResponse.json().catch(() => ({})) as { error?: string };
            if (!sheetResponse.ok) throw new Error(sheetData.error ?? `Nie udało się zapisać arkusza „${workbookSheet.sheet}”.`);
          }
          const completeResponse = await fetch("/api/admin/reports", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "complete", uploadId, sourceIndex: stagedData.sourceIndex, sheetCount, rowCount, cellCount }),
          });
          const completeData = await completeResponse.json().catch(() => ({})) as { error?: string };
          if (!completeResponse.ok) throw new Error(completeData.error ?? `Nie udało się zakończyć analizy pliku „${file.name}”.`);
        }
      }
      setStatus("Łączenie danych i publikowanie biuletynu…");
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, month: Number(formData.get("month")), year: Number(formData.get("year")) }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Nie udało się opublikować raportu.");
      form.reset();
      setFileNames([]);
      setStatus("Raport został opublikowany.");
      await loadReports();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nie udało się opublikować raportu.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(report: ReportSummary) {
    if (!window.confirm(`Usunąć publikację „${report.title}”?`)) return;
    const response = await fetch(`/api/admin/reports/${report.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { setStatus(data.error ?? "Nie udało się usunąć raportu."); return; }
    setReports((current) => current.filter((item) => item.id !== report.id));
    setStatus("Raport został usunięty.");
  }

  const currentMonth = new Date().getMonth() + 1;
  return (
    <div className="report-admin-layout">
      <form className="report-create-form" onSubmit={publish}>
        <h2>Nowy biuletyn</h2>
        <div className="report-period-grid">
          <label>Miesiąc<select name="month" defaultValue={currentMonth}>{months.map((month, index) => <option value={index + 1} key={month}>{month}</option>)}</select></label>
          <label>Rok<input name="year" type="number" min="2020" max="2100" defaultValue={new Date().getFullYear()} required /></label>
        </div>
        <label className="report-file-picker">
          <span>Wybierz pliki źródłowe</span>
          <input name="sources" type="file" accept=".xlsx,.pdf,.docx" multiple required onChange={(event) => setFileNames(Array.from(event.target.files ?? []).map((file) => file.name))} />
        </label>
        <small>Wymagane: PDF oraz pełny pakiet XLSX dla produkcji, cen, wylęgów, handlu, pasz, drobiu i jaj. Opcjonalnie: DOCX. System nie opublikuje biuletynu z brakującą sekcją.</small>
        {fileNames.length ? <ul className="report-selected-files">{fileNames.map((name) => <li key={name}>{name}</li>)}</ul> : null}
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Tworzenie raportu…" : "Utwórz i opublikuj"}</button>
        {status ? <p className={status.includes("został") ? "report-status-success" : "report-status"} aria-live="polite">{status}</p> : null}
      </form>
      <section className="report-admin-list">
        <div className="report-admin-list-heading"><h2>Opublikowane</h2><a href="/tresc/raporty">Otwórz stronę raportów</a></div>
        {!reports.length ? <p>Brak opublikowanych biuletynów.</p> : reports.map((report) => (
          <article key={report.id}>
            <div><strong>{report.title}</strong><small>{report.sheetCount} ark. · {report.rowCount.toLocaleString("pl-PL")} wierszy · {report.sourceCount} źródeł</small></div>
            <button type="button" onClick={() => void remove(report)}>Usuń</button>
          </article>
        ))}
      </section>
    </div>
  );
}