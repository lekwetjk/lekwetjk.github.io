import { getBulletinReport, getBulletinReportData, listBulletinReports } from "../lib/bulletin-reports";
import { InteractiveBulletin } from "./InteractiveBulletin";

export async function BulletinReports({ selectedSlug }: { selectedSlug: string }) {
  const reports = await listBulletinReports();
  const selected = await getBulletinReport(selectedSlug);
  const data = selected ? await getBulletinReportData(selected) : null;
  const model = data?.model ? {
    ...data.model,
    indicators: data.model.indicators.map(({ source: _source, sheet: _sheet, cell: _cell, ...indicator }) => indicator),
    trade: data.model.trade.map(({ source: _source, sheet: _sheet, first: _first, last: _last, ...row }) => row),
  } : null;
  const bulletin = selected ? { id: selected.id, slug: selected.slug, title: selected.title, year: selected.year } : null;
  const pdfAvailable = selected?.sources.some((source) => /\.pdf$/i.test(source.name)) ?? false;
  return (
    <main className="reports-member-page">
      <section className="reports-library"><div className="shell"><div><p className="article-kicker">Raporty KRD-IG</p><h1>Biuletyny interaktywne</h1></div><aside className="reports-archive"><h2>Wydania</h2>{!reports.length ? <p>Brak opublikowanych raportów.</p> : <ol>{reports.map((report) => <li key={report.id}><a className={selected?.id === report.id ? "active" : undefined} href={`/tresc/raporty?raport=${report.slug}`}><strong>{report.title}</strong><span>Otwórz biuletyn</span></a></li>)}</ol>}</aside></div></section>
      <section className="reports-selected">{bulletin && model ? <InteractiveBulletin report={bulletin} model={model} pdfAvailable={pdfAvailable} /> : selected ? <p className="shell reports-load-error">Nie udało się wczytać danych raportu.</p> : null}</section>
    </main>
  );
}