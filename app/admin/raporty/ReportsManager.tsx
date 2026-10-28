"use client";

import { useEffect, useState } from "react";
import { PreparedBulletinViewer } from "../../components/PreparedBulletinViewer";
import type { DocxBulletinResult } from "../../lib/bulletin-docx";
import { validatePreparedBulletin } from "../../lib/prepared-bulletin-model";
import { buildExportMapData, suggestExportMapTables } from "../../lib/bulletin-export-map";
import DocxOcrReview, { addOcrToBulletin } from "./DocxOcrReview";
import DocxMetadataEditor from "./DocxMetadataEditor";
import DocxExportMapEditor from "./DocxExportMapEditor";

type ReportSummary = {
  id: string;
  slug: string;
  title: string;
  sheetCount: number;
  rowCount: number;
  sourceCount: number;
  createdAt: string;
  revision: string;
  editable: boolean;
};

export default function ReportsManager() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [modelName, setModelName] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<DocxBulletinResult | null>(null);
  const [docxName, setDocxName] = useState("");
  const [generatedPdf, setGeneratedPdf] = useState<File | null>(null);
  const [period, setPeriod] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<ReportSummary | null>(null);
  const busy = saving || generating || ocrBusy;

  async function loadReports() {
    const response = await fetch("/api/admin/reports");
    const data = await response.json() as { reports?: ReportSummary[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Nie udało się pobrać raportów.");
    setReports(data.reports ?? []);
  }

  useEffect(() => {
    void loadReports().catch((error) => setStatus(error instanceof Error ? error.message : "Nie udało się pobrać raportów."));
  }, []);

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("docx");
    if (!(file instanceof File) || !file.size) {
      setStatus("Wybierz źródłowy plik DOCX.");
      return;
    }
    setGenerating(true);
    setGenerated(null);
    setApproved(false);
    setStatus("Odczytywanie tabel i wykresów z DOCX…");
    try {
      const { buildBulletinFromDocx } = await import("../../lib/bulletin-docx");
      const result = await buildBulletinFromDocx(file, period);
      const selection = suggestExportMapTables(result.bulletin.tables);
      try {
        buildExportMapData(result.bulletin.tables, selection, result.bulletin.id);
        result.bulletin.exportMap = selection;
      } catch (error) {
        result.warnings.push(`Mapa eksportu wymaga sprawdzenia: ${error instanceof Error ? error.message : "Nie udało się rozpoznać tabel."}`);
      }
      setGenerated(result);
      setStatus("Podgląd został utworzony. Sprawdź dane przed publikacją.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nie udało się przetworzyć pliku DOCX.");
    } finally {
      setGenerating(false);
    }
  }

  async function publishGenerated() {
    if (!generated || !approved) return;
    setSaving(true);
    setStatus(updateTarget ? "Aktualizowanie biuletynu z DOCX…" : "Publikowanie biuletynu z DOCX…");
    try {
      if (!generated.bulletin.exportMap) throw new Error("Przed publikacją przygotuj mapę z czterech tabel eksportowych.");
      if (updateTarget && updateTarget.slug !== `biuletyn-informacyjny-${generated.bulletin.id}`) throw new Error("Podgląd musi dotyczyć aktualizowanego wydania.");
      validatePreparedBulletin(generated.bulletin);
      const formData = new FormData();
      formData.set("mode", "prepared");
      formData.set("model", new File([JSON.stringify(generated.bulletin)], `biuletyn-${generated.bulletin.id}.json`, { type: "application/json" }));
      if (generatedPdf) formData.set("pdf", generatedPdf);
      if (updateTarget) formData.set("revision", updateTarget.revision);
      const response = await fetch(updateTarget ? `/api/admin/reports/${updateTarget.id}` : "/api/admin/reports", { method: updateTarget ? "PUT" : "POST", body: formData });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Nie udało się opublikować biuletynu.");
      setGenerated(null);
      setApproved(false);
      setUpdateTarget(null);
      setGeneratedPdf(null);
      setStatus(updateTarget ? "Biuletyn został zaktualizowany. Zachowano adres i kopię poprzedniej wersji." : "Biuletyn został opublikowany.");
      await loadReports();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nie udało się opublikować biuletynu.");
    } finally {
      setSaving(false);
    }
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("mode", "prepared");
    setSaving(true);
    setStatus("Publikowanie gotowego biuletynu…");
    try {
      const response = await fetch("/api/admin/reports", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Nie udało się opublikować biuletynu.");
      form.reset();
      setModelName("");
      setPdfName("");
      setStatus("Biuletyn został opublikowany.");
      await loadReports();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nie udało się opublikować biuletynu.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(report: ReportSummary) {
    if (!window.confirm(`Usunąć publikację „${report.title}”?`)) return;
    const response = await fetch(`/api/admin/reports/${report.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setStatus(data.error ?? "Nie udało się usunąć raportu.");
      return;
    }
    setReports((current) => current.filter((item) => item.id !== report.id));
    setStatus("Raport został usunięty.");
  }

  return (
    <div className="report-admin-layout">
      <section>
      <form className="report-create-form" onSubmit={generate}>
        <h2>{updateTarget ? "Aktualizuj biuletyn z DOCX" : "Utwórz biuletyn z DOCX"}</h2>
        <p>Wgraj źródłowy dokument Word. Generator odczyta tabele i dane edytowalnych wykresów bez przygotowywania pliku JSON.</p>
        <label className="report-file-picker">
          <span>Publikacja</span>
          <select aria-label="Publikacja" value={updateTarget?.id ?? ""} disabled={busy} onChange={(event) => {
            const target = reports.find((report) => report.id === event.target.value) ?? null;
            setUpdateTarget(target);
            setPeriod(target ? target.slug.replace("biuletyn-informacyjny-", "") : "");
            setGenerated(null);
            setGeneratedPdf(null);
            setApproved(false);
            setStatus("");
          }}>
            <option value="">Nowe wydanie</option>
            {reports.filter((report) => report.editable).map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}
          </select>
        </label>
        {updateTarget ? <a href={`/tresc/raporty?raport=${updateTarget.slug}`}>{updateTarget.title}</a> : null}
        <label className="report-file-picker">
          <span>Miesiąc i rok wydania</span>
          <input name="period" type="month" min="2000-01" max="2100-12" required value={period} disabled={busy || !!updateTarget} onChange={(event) => { setPeriod(event.target.value); setGenerated(null); setApproved(false); }} />
        </label>
        <label className="report-file-picker">
          <span>Źródłowy plik DOCX</span>
          <input name="docx" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required disabled={busy} onChange={(event) => { setDocxName(event.target.files?.[0]?.name ?? ""); setGenerated(null); }} />
        </label>
        <small>Do 25 MB. Przetwarzanie odbywa się w przeglądarce, bez usług zewnętrznych. Dla obrazów dostępny jest lokalny OCR z korektą i zatwierdzeniem odczytu.</small>
        {docxName ? <ul className="report-selected-files"><li>{docxName}</li></ul> : null}
        <label className="report-file-picker">
          <span>PDF do pobrania (opcjonalnie)</span>
          <input key={updateTarget?.id ?? "new"} type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(event) => { setGeneratedPdf(event.target.files?.[0] ?? null); setApproved(false); }} />
        </label>
        <small>Generator nie tworzy PDF-u. Dodaj oryginalny PDF tego samego wydania, jeśli ma być dostępny do pobrania.</small>
        <button className="button button-primary" type="submit" disabled={busy}>{generating ? "Przetwarzanie DOCX…" : "Utwórz podgląd z DOCX"}</button>
      </form>
      {generated ? <section className="report-generated-preview" aria-label="Podgląd wygenerowanego biuletynu">
        <h2>{generated.bulletin.title}</h2>
        <p>{generated.bulletin.charts.length} wykresów · {generated.bulletin.tables.length} tabel · {generated.bulletin.stats.numericCells.toLocaleString("pl-PL")} komórek liczbowych w tabelach</p>
        <ul>{generated.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        {generated.images.length ? <DocxOcrReview images={generated.images} disabled={saving || generating} onBusy={setOcrBusy} onAdd={(data) => {
          setGenerated((current) => current ? { ...current, bulletin: addOcrToBulletin(current.bulletin, data) } : null);
          setApproved(false);
        }} /> : null}
        <DocxMetadataEditor bulletin={generated.bulletin} disabled={busy} onChange={(bulletin) => {
          setGenerated((current) => current ? { ...current, bulletin: { ...bulletin, exportMap: undefined } } : null);
          setApproved(false);
        }} />
        <DocxExportMapEditor key={generated.bulletin.id + docxName} bulletin={generated.bulletin} disabled={busy} onChange={(bulletin) => {
          setGenerated((current) => current ? { ...current, bulletin } : null);
          setApproved(false);
        }} />
        <details><summary>Sprawdź podgląd interaktywny przed publikacją</summary>
          <PreparedBulletinViewer key={generated.bulletin.id + docxName} bulletin={generated.bulletin} editions={[{ id: generated.bulletin.id, slug: `biuletyn-informacyjny-${generated.bulletin.id}`, period: generated.bulletin.period, title: generated.bulletin.title }]} />
        </details>
        <label className="report-approval"><input type="checkbox" checked={approved} disabled={busy} onChange={(event) => setApproved(event.target.checked)} /> Sprawdziłem zgodność okresu, tytułów, jednostek i wartości z DOCX, poprawiłem dane OCR, a pominięte obrazy nie wymagają publikacji.</label>
        <button className="button button-primary" type="button" disabled={busy || !approved || !generated.bulletin.exportMap} onClick={() => void publishGenerated()}>{saving ? "Zapisywanie…" : updateTarget ? "Zaktualizuj wydanie" : "Opublikuj biuletyn"}</button>
      </section> : null}
      <details>
      <summary>Import gotowego modelu JSON (opcjonalnie)</summary>
      <form className="report-create-form" onSubmit={publish}>
        <h2>Import gotowego modelu</h2>
        <label className="report-file-picker">
          <span>Gotowy model JSON</span>
          <input name="model" type="file" accept="application/json,.json" required onChange={(event) => setModelName(event.target.files?.[0]?.name ?? "")} />
        </label>
        <small>Plik JSON utworzony przez zewnętrzny generator. Serwis tylko sprawdza model i zapisuje go w prywatnym magazynie.</small>
        {modelName ? <ul className="report-selected-files"><li>{modelName}</li></ul> : null}
        <label className="report-file-picker">
          <span>PDF do pobrania (opcjonalnie)</span>
          <input name="pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => setPdfName(event.target.files?.[0]?.name ?? "")} />
        </label>
        {pdfName ? <ul className="report-selected-files"><li>{pdfName}</li></ul> : null}
        <button className="button button-primary" type="submit" disabled={busy}>{saving ? "Publikowanie…" : "Opublikuj gotowy biuletyn"}</button>
      </form>
      </details>
      {status ? <p className={status.includes("został") ? "report-status-success" : "report-status"} role="status">{status}</p> : null}
      </section>
      <section className="report-admin-list">
        <div className="report-admin-list-heading"><h2>Opublikowane</h2><a href="/tresc/raporty">Otwórz stronę raportów</a></div>
        {!reports.length ? <p>Brak opublikowanych biuletynów.</p> : reports.map((report) => (
          <article key={report.id}>
            <div><strong>{report.title}</strong><small>{report.sheetCount} wykresów · {report.rowCount.toLocaleString("pl-PL")} wierszy tabel · {report.sourceCount ? "PDF dostępny" : "bez PDF"}</small></div>
            <button type="button" onClick={() => void remove(report)}>Usuń</button>
          </article>
        ))}
      </section>
    </div>
  );
}
