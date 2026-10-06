import { getBulletinReport, getBulletinReportData, listBulletinReports } from "../lib/bulletin-reports";
import { InteractiveBulletin } from "./InteractiveBulletin";
import { getPreparedBulletin, preparedBulletinEditions } from "../lib/prepared-bulletins";
import { PreparedBulletinViewer } from "./PreparedBulletinViewer";

export async function BulletinReports({ selectedSlug }: { selectedSlug: string }) {
  const prepared = getPreparedBulletin(selectedSlug);
  if (prepared) {
    return <PreparedBulletinViewer bulletin={prepared} editions={preparedBulletinEditions} />;
  }

  const reports = await listBulletinReports();
  const selected = await getBulletinReport(selectedSlug);
  const data = selected ? await getBulletinReportData(selected) : null;
  if (data?.prepared) {
    const dynamicEditions = reports.map((report) => ({ id: `${report.year}-${String(report.month).padStart(2, "0")}`, slug: report.slug, period: `${report.month}.${report.year}`, title: report.title }));
    const editions = [...preparedBulletinEditions, ...dynamicEditions.filter((edition) => !preparedBulletinEditions.some((preparedEdition) => preparedEdition.slug === edition.slug))]
      .sort((left, right) => left.id.localeCompare(right.id));
    return <PreparedBulletinViewer bulletin={data.prepared} editions={editions} />;
  }
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