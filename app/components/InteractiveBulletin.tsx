"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { BulletinCountry, BulletinIndicator, BulletinModel, BulletinSeries, BulletinTradeRow } from "../lib/bulletin-model";

type InteractiveBulletinIndicator = Omit<BulletinIndicator, "source" | "sheet" | "cell">;
type InteractiveBulletinTradeRow = Omit<BulletinTradeRow, "source" | "sheet" | "first" | "last">;
export type InteractiveBulletinModel = Omit<BulletinModel, "indicators" | "trade"> & {
  indicators: InteractiveBulletinIndicator[];
  trade: InteractiveBulletinTradeRow[];
};

export type InteractiveBulletinReport = {
  id: string;
  slug: string;
  title: string;
  year: number;
};

const PAGE_SIZE = 50;
const CHART_COLORS = ["#253b63", "#e76647", "#338299", "#788d17", "#9467a3"];
const MONTHS_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function formatNumber(value: number, digits = 2) {
  return value.toLocaleString("pl-PL", { maximumFractionDigits: digits });
}

function csvCell(value: string | number) {
  let safeValue = String(value ?? "");
  if (/^[=+@-]/.test(safeValue) && typeof value !== "number") safeValue = `'${safeValue}`;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function downloadCsv(name: string, headers: string[], rows: (string | number)[][]) {
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function normalize(value: string) {
  return value.toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");
}

function BarList({ items, value, unit }: { items: (BulletinCountry | { name: string; kg: number })[]; value: (item: { kg: number }) => number; unit: string }) {
  const maximum = Math.max(...items.map(value), 1);
  return <div className="ib-bars">{items.map((item) => {
    const current = value(item);
    return <div className="ib-bar-row" key={item.name}><div><span>{item.name}</span><strong>{formatNumber(current)} {unit}</strong></div><div className="ib-bar-track"><span style={{ width: `${current / maximum * 100}%` }} /></div></div>;
  })}</div>;
}

function SeriesExplorer({ series, slug }: { series: BulletinSeries[]; slug: string }) {
  const families = [...new Set(series.map((item) => item.label.replace(/ — \d{4}$/, "")))];
  const [family, setFamily] = useState(families[0] ?? "");
  const lines = series.filter((item) => item.label.replace(/ — \d{4}$/, "") === family);
  const labels = [...new Set(lines.flatMap((line) => line.points.map((point) => point[0])))];
  const maximum = Math.max(...lines.flatMap((line) => line.points.map((point) => point[1])), 1) * 1.1;
  const x = (index: number) => 64 + index * 676 / Math.max(labels.length - 1, 1);
  const y = (value: number) => 226 - value / maximum * 180;
  if (!families.length) return <p className="ib-empty">Brak rozpoznanych serii czasowych.</p>;
  return <div className="ib-panel">
    <div className="ib-chart-toolbar"><label className="ib-control"><span>Wskaźnik</span><select value={family} onChange={(event) => setFamily(event.target.value)}>{families.map((item) => <option key={item}>{item}</option>)}</select></label><span>Jednostka: <strong>{lines[0]?.unit}</strong></span><button type="button" className="ib-tool" onClick={() => downloadCsv(`${slug}-serie.csv`, ["Seria", "Okres", "Wartość", "Jednostka"], lines.flatMap((line) => line.points.map((point) => [line.label, point[0], point[1], line.unit])))}>Pobierz serię CSV</button></div>
    <div className="ib-chart"><svg viewBox="0 0 780 270" role="img" aria-label={family}><title>{family}</title>
      {Array.from({ length: 5 }, (_, index) => { const gridValue = maximum * index / 4; return <g key={index}><line x1="64" x2="750" y1={y(gridValue)} y2={y(gridValue)} /><text x="56" y={y(gridValue) + 4} textAnchor="end">{formatNumber(gridValue, 1)}</text></g>; })}
      {labels.map((label, index) => <text key={label} x={x(index)} y="252" textAnchor="middle">{label}</text>)}
      {lines.map((line, lineIndex) => <g key={line.label}><polyline points={line.points.map((point) => `${x(labels.indexOf(point[0]))},${y(point[1])}`).join(" ")} fill="none" stroke={CHART_COLORS[lineIndex % CHART_COLORS.length]} strokeWidth="3" />{line.points.map((point) => <circle key={`${line.label}-${point[0]}`} cx={x(labels.indexOf(point[0]))} cy={y(point[1])} r="4" fill={CHART_COLORS[lineIndex % CHART_COLORS.length]} aria-label={`${line.label} / ${point[0]}: ${formatNumber(point[1], 5)} ${line.unit}`} />)}</g>)}
    </svg></div>
    <div className="ib-legend">{lines.map((line, index) => <span key={line.label}><i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />{line.label}</span>)}</div><p className="ib-source">{lines[0]?.note}</p>
  </div>;
}

type SortDirection = { key: string; ascending: boolean };

function TradeExplorer({ rows, slug, year }: { rows: InteractiveBulletinTradeRow[]; slug: string; year: number }) {
  const [direction, setDirection] = useState("Eksport");
  const [group, setGroup] = useState("0207");
  const [month, setMonth] = useState("");
  const [market, setMarket] = useState("");
  const [country, setCountry] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [sort, setSort] = useState<SortDirection>({ key: "kg", ascending: false });
  const [page, setPage] = useState(0);
  const countries = [...new Set(rows.map((row) => row.country))].sort((left, right) => left.localeCompare(right, "pl"));
  const filtered = useMemo(() => {
    const search = normalize(deferredQuery);
    return rows.filter((row) => row.direction === direction && row.group === group && (!month || row.month === Number(month)) && (!market || row.market === market) && (!country || row.country === country) && normalize(`${row.code} ${row.description}`).includes(search)).sort((left, right) => {
      const leftValue = sort.key === "unitValue" ? left.eur / left.kg : left[sort.key as keyof InteractiveBulletinTradeRow];
      const rightValue = sort.key === "unitValue" ? right.eur / right.kg : right[sort.key as keyof InteractiveBulletinTradeRow];
      const result = typeof leftValue === "number" && typeof rightValue === "number" ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue), "pl", { numeric: true });
      return sort.ascending ? result : -result;
    });
  }, [country, deferredQuery, direction, group, market, month, rows, sort]);
  useEffect(() => { setPage(0); }, [country, deferredQuery, direction, group, market, month, sort]);
  const kg = filtered.reduce((sum, row) => sum + row.kg, 0);
  const eur = filtered.reduce((sum, row) => sum + row.eur, 0);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const changeSort = (key: string) => setSort((current) => ({ key, ascending: current.key === key ? !current.ascending : true }));
  return <>
    <div className="ib-trade-controls"><label className="ib-control"><span>Kierunek</span><select value={direction} onChange={(event) => setDirection(event.target.value)}><option>Eksport</option><option>Import</option></select></label><label className="ib-control"><span>Grupa CN</span><select value={group} onChange={(event) => setGroup(event.target.value)}><option value="0207">0207 — mięso i podroby</option><option value="1602">1602 — przetwory</option></select></label><label className="ib-control"><span>Miesiąc</span><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="">Wszystkie</option>{MONTHS_ROMAN.map((label, index) => <option value={index + 1} key={label}>{label} {year}</option>)}</select></label><label className="ib-control"><span>Rynek</span><select value={market} onChange={(event) => setMarket(event.target.value)}><option value="">Wszystkie</option><option>UE</option><option>Poza UE</option></select></label><label className="ib-control"><span>Kraj</span><select value={country} onChange={(event) => setCountry(event.target.value)}><option value="">Wszystkie</option>{countries.map((item) => <option key={item}>{item}</option>)}</select></label><label className="ib-control"><span>Kod lub opis towaru</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="np. 020714, mrożone" /></label></div>
    <div className="ib-data-summary"><span>{formatNumber(filtered.length, 0)} pozycji · {formatNumber(kg / 1000)} t · {formatNumber(eur, 0)} EUR</span><button type="button" className="ib-tool ib-tool-primary" onClick={() => downloadCsv(`${slug}-handel.csv`, ["Kierunek", "Miesiąc", "Kraj", "Rynek", "CN", "Opis", "Masa kg", "Wartość EUR", "EUR/kg"], filtered.map((row) => [row.direction, row.month, row.country, row.market, row.code, row.description, row.kg, row.eur, row.kg ? row.eur / row.kg : ""]))}>Eksport widoku CSV</button></div>
    <div className="ib-table-shell"><table><thead><tr>{[["month", "Okres / kierunek"], ["country", "Kraj"], ["code", "Kod CN / towar"], ["kg", "Masa (t)"], ["eur", "Wartość (EUR)"], ["unitValue", "EUR/kg"]].map(([key, label]) => <th key={key}><button type="button" onClick={() => changeSort(key)}>{label}<span>{sort.key === key ? (sort.ascending ? "↑" : "↓") : "↕"}</span></button></th>)}</tr></thead><tbody>{visible.map((row, rowIndex) => <tr key={`${row.month}-${row.country}-${row.code}-${row.market}-${rowIndex}`}><td>{MONTHS_ROMAN[row.month - 1]} {year}<small>{row.direction}</small></td><td>{row.country}<small>{row.market}</small></td><td><strong>{row.code}</strong><details><summary>Opis towaru</summary>{row.description}</details></td><td>{formatNumber(row.kg / 1000, 3)}</td><td>{formatNumber(row.eur, 0)}</td><td>{row.kg ? formatNumber(row.eur / row.kg, 3) : "—"}</td></tr>)}</tbody></table></div>
    {!visible.length ? <p className="ib-empty">Brak danych spełniających kryteria.</p> : null}<Pagination page={page} pageCount={pageCount} setPage={setPage} />
  </>;
}

function IndicatorExplorer({ rows, slug }: { rows: InteractiveBulletinIndicator[]; slug: string }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");
  const [unit, setUnit] = useState("");
  const [sort, setSort] = useState<SortDirection>({ key: "year", ascending: false });
  const [page, setPage] = useState(0);
  const categories = [...new Set(rows.map((row) => row.category))].sort((left, right) => left.localeCompare(right, "pl"));
  const years = [...new Set(rows.map((row) => row.year))].sort((left, right) => right - left);
  const units = [...new Set(rows.map((row) => row.unit))].sort((left, right) => left.localeCompare(right, "pl"));
  const filtered = useMemo(() => {
    const search = normalize(deferredQuery);
    return rows.filter((row) => (!category || row.category === category) && (!year || row.year === Number(year)) && (!unit || row.unit === unit) && normalize(`${row.indicator} ${row.period} ${row.scope}`).includes(search)).sort((left, right) => {
      const leftValue = left[sort.key as keyof InteractiveBulletinIndicator];
      const rightValue = right[sort.key as keyof InteractiveBulletinIndicator];
      const result = typeof leftValue === "number" && typeof rightValue === "number" ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue), "pl", { numeric: true });
      return sort.ascending ? result : -result;
    });
  }, [category, deferredQuery, rows, sort, unit, year]);
  useEffect(() => { setPage(0); }, [category, deferredQuery, sort, unit, year]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const changeSort = (key: string) => setSort((current) => ({ key, ascending: current.key === key ? !current.ascending : true }));
  return <><div className="ib-data-toolbar"><label className="ib-control"><span>Szukaj</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="np. eksport, kurczęta, euro" /></label><label className="ib-control"><span>Kategoria</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Wszystkie</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="ib-control"><span>Rok</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">Wszystkie</option>{years.map((item) => <option key={item}>{item}</option>)}</select></label><label className="ib-control"><span>Jednostka</span><select value={unit} onChange={(event) => setUnit(event.target.value)}><option value="">Wszystkie</option>{units.map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" className="ib-tool" onClick={() => { setQuery(""); setCategory(""); setYear(""); setUnit(""); }}>Wyczyść</button></div>
    <div className="ib-data-summary"><span>Znaleziono: <strong>{formatNumber(filtered.length, 0)}</strong></span><button type="button" className="ib-tool ib-tool-primary" onClick={() => downloadCsv(`${slug}-wskazniki.csv`, ["Wskaźnik", "Kategoria", "Rok", "Okres", "Wartość", "Jednostka", "Zakres"], filtered.map((row) => [row.indicator, row.category, row.year, row.period, row.value, row.unit, row.scope]))}>Eksport CSV</button></div>
    <div className="ib-table-shell"><table><thead><tr>{[["indicator", "Wskaźnik"], ["category", "Kategoria"], ["year", "Okres"], ["value", "Wartość"], ["scope", "Zakres"]].map(([key, label]) => <th key={key}><button type="button" onClick={() => changeSort(key)}>{label}<span>{sort.key === key ? (sort.ascending ? "↑" : "↓") : "↕"}</span></button></th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={`${row.indicator}-${row.period}-${index}`}><td>{row.indicator}</td><td>{row.category}</td><td>{row.period}</td><td><strong>{formatNumber(row.value, 5)} {row.unit}</strong></td><td>{row.scope}</td></tr>)}</tbody></table></div>
    {!visible.length ? <p className="ib-empty">Brak danych spełniających kryteria.</p> : null}<Pagination page={page} pageCount={pageCount} setPage={setPage} /></>;
}

function Pagination({ page, pageCount, setPage }: { page: number; pageCount: number; setPage: (page: number) => void }) {
  return <div className="ib-pagination"><button type="button" className="ib-tool" disabled={page === 0} onClick={() => setPage(page - 1)}>Poprzednia</button><span>Strona {page + 1} / {pageCount}</span><button type="button" className="ib-tool" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>Następna</button></div>;
}

function MetricTable({ rows, unit }: { rows: { name: string; value: number; annual?: number }[]; unit: string }) {
  return <div className="ib-table-shell"><table className="ib-compact-table"><thead><tr><th>Produkt</th><th>Cena ({unit})</th><th>Zmiana r/r</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td>{row.name}</td><td>{formatNumber(row.value)}</td><td>{row.annual ? `${formatNumber((row.value / row.annual - 1) * 100)}%` : "Brak danych"}</td></tr>)}</tbody></table></div>;
}

function SectionHeading({ title, children }: { title: string; children: string }) {
  return <div className="ib-section-heading"><h2>{title}</h2><p>{children}</p></div>;
}

function Fact({ index, value, children }: { index: string; value: string; children: ReactNode }) {
  return <article className="ib-fact"><span>{index}</span><strong>{value}</strong><p>{children}</p></article>;
}

function SemanticBulletin({ report, model, pdfAvailable }: { report: InteractiveBulletinReport; model: InteractiveBulletinModel; pdfAvailable: boolean }) {
  const pdfUrl = pdfAvailable ? `/api/member/reports/${report.id}/pdf` : null;
  const { summary } = model;
  return <article className="interactive-bulletin ib-publication"><header className="ib-topbar"><div className="ib-brand"><span>KRD</span><div>Biuletyn informacyjny<small>{report.title}</small></div></div><div><button type="button" className="ib-icon-command" onClick={() => window.print()}>Drukuj</button>{pdfUrl ? <a className="ib-icon-command" href={pdfUrl}>Pobierz PDF</a> : null}</div></header>
    <div className="ib-layout"><nav className="ib-toc" aria-label="Spis treści raportu"><p>W tym raporcie</p>{[["start", "Wprowadzenie"], ["fakty", "Kluczowe fakty"], ["szeregi", "Produkcja, ceny i wylęgi"], ["rynki", "Rynki i gatunki"], ["handel", "Handel szczegółowy"], ["notowania", "Pasze i jaja"], ["dane", "Baza wskaźników"], ["pdf", "Pobierz PDF"]].map(([id, label], index) => <a href={`#${id}`} key={id}><span>{String(index + 1).padStart(2, "0")}</span>{label}</a>)}</nav><div className="ib-content">
      <section className="ib-masthead" id="start"><div><p className="ib-eyebrow">{report.title}</p><h1>Polski drób<br />w liczbach</h1><p className="ib-lead">Interaktywny przegląd branży drobiarskiej: produkcja, handel, ceny, wylęgi, pasze i jaja. Dane pochodzą bezpośrednio z plików źródłowych tego wydania.</p><p className="ib-meta">{model.indicators.length.toLocaleString("pl-PL")} wskaźników · {model.series.length} serii · {model.trade.length.toLocaleString("pl-PL")} pozycji handlu</p></div></section>
      <section id="fakty"><SectionHeading title="Kluczowe fakty">Najważniejsze wartości obliczone dla bieżącego wydania. Zakresy okresów pozostają zgodne z materiałami raportu.</SectionHeading><div className="ib-facts"><Fact index="01 / produkcja" value={summary.latestProduction ? `${formatNumber(summary.latestProduction / 1000, 3)} mln t` : "Brak danych"}>Produkcja mięsa drobiowego w {summary.latestProductionYear ?? "najnowszym dostępnym roku"}.</Fact><Fact index="02 / eksport" value={`${formatNumber(summary.exportKg / 1_000_000)} tys. t`}>Eksport mięsa i podrobów drobiowych CN 0207 w okresie raportowym.</Fact><Fact index="03 / wartość" value={`${formatNumber(summary.exportEur / 1_000_000_000, 3)} mld EUR`}>Wartość eksportu CN 0207 według danych szczegółowych.</Fact><Fact index="04 / rynek UE" value={summary.euShare === null ? "Brak danych" : `${formatNumber(summary.euShare)}%`}>Udział rynku unijnego w masie eksportu CN 0207.</Fact><Fact index="05 / kierunki" value={formatNumber(model.countries.length, 0)}>Rynki eksportowe występujące w danych szczegółowych.</Fact><Fact index="06 / baza" value={formatNumber(model.indicators.length, 0)}>Uporządkowane wskaźniki dostępne w interaktywnym zestawieniu.</Fact></div></section>
      <section id="szeregi"><SectionHeading title="Produkcja, ceny i wylęgi w czasie">Wybierz wskaźnik, porównaj lata na wykresie i pobierz serię danych.</SectionHeading><SeriesExplorer series={model.series} slug={report.slug} /></section>
      <section id="rynki"><SectionHeading title={`Eksport mięsa i podrobów — ${report.year}`}>CN 0207. Dane z tego wydania nie są automatycznie porównywane z pełnym rokiem.</SectionHeading><div className="ib-detail-grid"><article className="ib-panel"><h3>10 największych odbiorców według masy</h3><BarList items={model.countries.slice(0, 10)} value={(item) => item.kg / 1000} unit="t" /></article><article className="ib-panel"><h3>Struktura eksportu według gatunków</h3><BarList items={[...model.species].sort((left, right) => right.kg - left.kg)} value={(item) => item.kg / 1000} unit="t" /></article></div></section>
      <section id="handel"><SectionHeading title="Handel zagraniczny — szczegółowe dane">Przeglądaj eksport i import według miesiąca, kraju i ośmiocyfrowego kodu CN.</SectionHeading><TradeExplorer rows={model.trade} slug={report.slug} year={report.year} /></section>
      <section id="notowania"><SectionHeading title="Pasze i rynek jaj">Oddzielne okresy notowań pozwalają ocenić koszty i ceny bez mieszania miesięcznych i tygodniowych danych.</SectionHeading><div className="ib-detail-grid"><article className="ib-panel"><h3>Pasze dla drobiu</h3><p className="ib-panel-note">Średnie ceny sprzedaży według kategorii źródłowych.</p><MetricTable rows={model.feed} unit="zł/t" /></article><article className="ib-panel"><h3>Rynek jaj</h3><p className="ib-panel-note">Ceny z zakładów pakowania według systemu chowu i klasy wagowej.</p><MetricTable rows={model.eggs} unit="zł/100 szt." /></article></div></section>
      <section id="dane"><SectionHeading title="Baza wskaźników">Wyszukuj wskaźniki, zawężaj zakres, sortuj kolumny i pobieraj aktualny widok.</SectionHeading><IndicatorExplorer rows={model.indicators} slug={report.slug} /></section>
      <section id="pdf"><SectionHeading title="Biuletyn w wersji PDF">Pobierz kompletne wydanie przygotowane do czytania poza serwisem.</SectionHeading><div className="ib-pdf-download"><div><strong>{report.title}</strong><span>Dokument PDF</span></div>{pdfUrl ? <a className="ib-tool ib-tool-primary" href={pdfUrl}>Pobierz PDF</a> : <span>Wersja PDF jest niedostępna.</span>}</div></section>
      <footer className="ib-footer">Biuletyn interaktywny KRD-IG · {report.title} · dane z plików źródłowych</footer>
    </div></div>
  </article>;
}

export function InteractiveBulletin({ report, model, pdfAvailable }: { report: InteractiveBulletinReport; model: InteractiveBulletinModel; pdfAvailable: boolean }) {
  return <SemanticBulletin report={report} model={model} pdfAvailable={pdfAvailable} />;
}