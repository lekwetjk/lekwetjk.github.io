"use client";

import { useEffect, useState } from "react";

type ReportSummary = {
  id: string;
  slug: string;
  title: string;
  sheetCount: number;
  rowCount: number;
  sourceCount: number;
  createdAt: string;
};

export default function ReportsManager() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [modelName, setModelName] = useState("");
  const [pdfName, setPdfName] = useState("");

  async function loadReports() {
    const response = await fetch("/api/admin/reports");
    const data = await response.json() as { reports?: ReportSummary[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Nie udało się pobrać raportów.");
    setReports(data.reports ?? []);
  }

  useEffect(() => {
    void loadReports().catch((error) => setStatus(error instanceof Error ? error.message : "Nie udało się pobrać raportów."));
  }, []);

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
      <form className="report-create-form" onSubmit={publish}>
        <h2>Nowy biuletyn</h2>
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
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Publikowanie…" : "Opublikuj gotowy biuletyn"}</button>
        {status ? <p className={status.includes("został") ? "report-status-success" : "report-status"} aria-live="polite">{status}</p> : null}
      </form>
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
