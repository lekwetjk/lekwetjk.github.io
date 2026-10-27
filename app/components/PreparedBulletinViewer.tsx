"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { ChevronLeft, ChevronRight, Download, Search, Table2 } from "lucide-react";
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2";
import { useState } from "react";

import type { PreparedBulletin, PreparedBulletinChart } from "../lib/prepared-bulletins";
import { getBulletinHighlights } from "../lib/bulletin-highlights";
import { getDisplayedBulletinSeries } from "../lib/prepared-bulletin-model";
import styles from "./PreparedBulletinViewer.module.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend);

type View = "overview" | "charts" | "tables";
type Edition = { slug: string; id: string; period: string; title: string };

const ALL_SECTIONS = "Wszystkie obszary";
const CHARTS_PER_PAGE = 8;
const TABLES_PER_PAGE = 4;
const palette = ["#8a998e", "#587064", "#204f43", "#d0a13d", "#b74731"];

function normalize(value: string) {
  return value.toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cleanTitle(chart: PreparedBulletinChart) {
  return chart.title.trim() || chart.metric?.label || chart.section;
}

function chartKind(kind: string) {
  if (/doughnut/i.test(kind)) return "doughnut";
  if (/pie/i.test(kind)) return "pie";
  if (/line|scatter|area/i.test(kind)) return "line";
  return "bar";
}

function BulletinChart({ chart, large = false }: { chart: PreparedBulletinChart; large?: boolean }) {
  const kind = chartKind(chart.kind);
  const shown = getDisplayedBulletinSeries(chart);
  const data = {
    labels: chart.categories,
    datasets: shown.map((series, index) => ({
      label: series.name || `Seria ${index + 1}`,
      data: series.values,
      borderColor: palette[index % palette.length],
      backgroundColor: `${palette[index % palette.length]}cc`,
      borderWidth: /2026/.test(series.name) ? 3 : 2,
      pointRadius: kind === "line" ? 3 : 0,
      tension: 0.24,
    })),
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 16 } } },
    scales: kind === "pie" || kind === "doughnut" ? undefined : {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: false, grid: { color: "#e3e0d8" } },
    },
  };
  const props = { data, options };
  return <div className={`${styles.canvas} ${large ? styles.canvasLarge : ""}`}>
    {kind === "line" ? <Line {...props} /> : kind === "pie" ? <Pie {...props} /> : kind === "doughnut" ? <Doughnut {...props} /> : <Bar {...props} />}
  </div>;
}

export function PreparedBulletinViewer({ bulletin, editions, pdfUrl }: { bulletin: PreparedBulletin; editions: Edition[]; pdfUrl?: string }) {
  const [view, setView] = useState<View>("overview");
  const [section, setSection] = useState(ALL_SECTIONS);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const normalizedQuery = normalize(query);
  const matches = (values: string[]) => !normalizedQuery || normalize(values.join(" ")).includes(normalizedQuery);
  const charts = bulletin.charts.filter((item) => (section === ALL_SECTIONS || item.section === section) && matches([item.section, item.title, item.description ?? "", ...item.series.map((series) => series.name)]));
  const tables = bulletin.tables.filter((item) => (section === ALL_SECTIONS || item.section === section) && matches([item.section, item.title ?? "", item.description ?? "", ...item.rows.slice(0, 4).flat()]));
  const pageSize = view === "charts" ? CHARTS_PER_PAGE : TABLES_PER_PAGE;
  const resultCount = view === "charts" ? charts.length : tables.length;
  const pages = Math.max(1, Math.ceil(resultCount / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const resetFilters = () => { setSection(ALL_SECTIONS); setQuery(""); setPage(0); };
  const changeView = (nextView: View) => { setView(nextView); resetFilters(); };

  return <div className={styles.viewer}>
    <section className={styles.hero}>
      <div><p className={styles.eyebrow}>Krajowa Rada Drobiarstwa - Izba Gospodarcza</p><h1>{bulletin.title}</h1><p>Wydanie {bulletin.period}</p></div>
      <div className={styles.heroStat}><strong>{bulletin.stats.charts}</strong><span>wykresów w wydaniu</span></div>
    </section>
    <div className={styles.editionBar}><label>Wydanie<select value={bulletin.id} onChange={(event) => { const edition = editions.find((item) => item.id === event.target.value); if (edition) window.location.assign(`/tresc/raporty?raport=${edition.slug}`); }}>{editions.map((edition) => <option key={edition.id} value={edition.id}>{edition.period}</option>)}</select></label>{pdfUrl ? <a className={styles.pdfDownload} href={pdfUrl} download><Download aria-hidden="true" />Pobierz PDF<span className={styles.pdfPeriod}> — {bulletin.period}</span></a> : null}</div>
    <nav className={styles.tabs} aria-label="Widok biuletynu">{([['overview', 'Przegląd'], ['charts', 'Wykresy'], ['tables', 'Tabele']] as const).map(([key, label]) => <button key={key} type="button" className={view === key ? styles.active : ""} onClick={() => changeView(key)}>{label}</button>)}</nav>
    {view === "overview" ? <Overview bulletin={bulletin} /> : <>
      <div className={styles.controls}><label className={styles.search}><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Szukaj obszaru lub danych" aria-label="Szukaj danych" /></label><label className={styles.sectionSelect}>Obszar<select value={section} onChange={(event) => { setSection(event.target.value); setPage(0); }}><option>{ALL_SECTIONS}</option>{bulletin.sections.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <header className={styles.results}><div><p>Dane z publikacji</p><h2>{resultCount} {view === "charts" ? "wykresów" : "zestawień"}</h2></div><span>Strona {currentPage + 1} z {pages}</span></header>
      {view === "charts" ? <section className={styles.chartGrid}>{charts.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((chart) => <article className={styles.chartCard} key={chart.id}><div className={styles.chartTitle}><span>{chart.section}</span><h3>{cleanTitle(chart)}</h3><p className={styles.itemDescription}>{chart.description ?? chart.metric?.description}</p></div><BulletinChart chart={chart} /></article>)}</section> : <section className={styles.tableList}>{tables.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((table) => <article className={styles.tableBlock} key={table.id}><div className={styles.tableTitle}><Table2 aria-hidden="true" /><div><h3>{table.title ?? table.section}</h3><p className={styles.itemDescription}>{table.description}</p></div></div><div className={styles.tableScroll}><table><caption className={styles.tableCaption}>{table.title ?? table.section}</caption><tbody>{table.rows.slice(0, 40).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => rowIndex === 0 ? <th key={cellIndex}>{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>{table.rows.length > 40 ? <p className={styles.tableNote}>Podgląd 40 z {table.rows.length} wierszy</p> : null}</article>)}</section>}
      {pages > 1 ? <div className={styles.pagination}><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} title="Poprzednia strona"><ChevronLeft /></button><span>{currentPage + 1} / {pages}</span><button type="button" disabled={currentPage === pages - 1} onClick={() => setPage(currentPage + 1)} title="Następna strona"><ChevronRight /></button></div> : null}
    </>}
  </div>;
}

function Overview({ bulletin }: { bulletin: PreparedBulletin }) {
  const highlights = getBulletinHighlights(bulletin);
  return <section className={styles.overview}><header><p>Najważniejsze dane</p><h2>Obraz rynku w tym wydaniu</h2></header><div className={styles.metrics}>{highlights.map((metric, index) => <article key={metric.id}><span>0{index + 1}</span><p>{metric.label}</p><strong>{metric.displayValue} <span className={styles.metricUnit}>{metric.unit}</span></strong><small>{metric.period}</small><div className={styles.metricDescription}>{metric.description}</div></article>)}</div>{highlights.some((metric) => metric.preliminary) ? <p className={styles.metricNote}>* Dane wstępne — zgodnie z oznaczeniem w biuletynie źródłowym.</p> : null}{bulletin.charts[0] ? <div className={styles.overviewChart}><div><p>Produkcja miesięczna</p><h2>{cleanTitle(bulletin.charts[0])}</h2></div><BulletinChart chart={bulletin.charts[0]} large /></div> : null}</section>;
}