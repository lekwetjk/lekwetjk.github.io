export type PreparedBulletinSeries = {
  name: string;
  values: Array<number | null>;
};

export type PreparedBulletinChart = {
  id: string;
  section: string;
  title: string;
  description?: string;
  kind: string;
  categories: string[];
  series: PreparedBulletinSeries[];
  metric?: {
    label: string;
    description: string;
    unit: string;
    format: "number" | "percent";
  };
};

export type PreparedBulletinTable = {
  id: string;
  section: string;
  title?: string;
  description?: string;
  rows: string[][];
};

export type PreparedBulletin = {
  id: string;
  period: string;
  title: string;
  sections: string[];
  charts: PreparedBulletinChart[];
  tables: PreparedBulletinTable[];
  exportMap?: ExportMapTableSelection;
  stats: {
    paragraphs: number;
    charts: number;
    tables: number;
    numericCells: number;
  };
};

export function getDisplayedBulletinSeries(chart: PreparedBulletinChart) {
  const years = chart.series.flatMap((series) => {
    const year = series.name.match(/\b20\d{2}\b/);
    return year ? [Number(year[0])] : [];
  });
  const earliest = Math.max(2023, Math.max(...years) - 3);
  const recent = chart.series.filter((series) => {
    const year = series.name.match(/\b20\d{2}\b/);
    return year && Number(year[0]) >= earliest;
  });
  return recent.length ? recent : chart.series.slice(-5);
}

export function validatePreparedBulletin(value: unknown): PreparedBulletin {
  const bulletin = value as Partial<PreparedBulletin>;
  if (!bulletin || typeof bulletin !== "object") throw new Error("Plik nie zawiera modelu biuletynu.");
  if (typeof bulletin.id !== "string" || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(bulletin.id)) throw new Error("Identyfikator wydania musi mieć format RRRR-MM.");
  if (typeof bulletin.period !== "string" || !bulletin.period.trim()) throw new Error("Brak okresu wydania.");
  if (typeof bulletin.title !== "string" || !/^Biuletyn informacyjny "[^\"]+, \d{4}"$/.test(bulletin.title)) throw new Error('Tytuł musi mieć format Biuletyn informacyjny "miesiąc, rok".');
  if (!Array.isArray(bulletin.sections) || bulletin.sections.length < 1 || bulletin.sections.some((section) => typeof section !== "string" || !section.trim())) throw new Error("Model musi zawierać co najmniej jeden obszar danych.");
  if (!Array.isArray(bulletin.charts) || bulletin.charts.length < 1) throw new Error("Model nie zawiera wykresów.");
  if (!Array.isArray(bulletin.tables) || bulletin.tables.length < 1) throw new Error("Model nie zawiera tabel.");
  for (const chart of bulletin.charts) {
    if (!chart || typeof chart.id !== "string" || typeof chart.section !== "string" || typeof chart.title !== "string" || typeof chart.kind !== "string") throw new Error("Model zawiera nieprawidłowy wykres.");
    if (chart.description !== undefined && (typeof chart.description !== "string" || !chart.description.trim())) throw new Error(`Wykres ${chart.id} nie zawiera poprawnego opisu.`);
    if (!Array.isArray(chart.categories) || !chart.categories.length || chart.categories.some((category) => typeof category !== "string")) throw new Error(`Wykres ${chart.id} nie zawiera poprawnych kategorii.`);
    if (!Array.isArray(chart.series) || !chart.series.length || chart.series.some((series) => typeof series.name !== "string" || !Array.isArray(series.values) || series.values.some((item) => item !== null && (typeof item !== "number" || !Number.isFinite(item))))) throw new Error(`Wykres ${chart.id} nie zawiera poprawnych serii.`);
    if (chart.metric && (
      [chart.metric.label, chart.metric.description, chart.metric.unit].some((item) => typeof item !== "string" || !item.trim())
      || !["number", "percent"].includes(chart.metric.format)
    )) throw new Error(`Wykres ${chart.id} nie zawiera poprawnego opisu wskaźnika.`);
  }
  for (const table of bulletin.tables) {
    if (!table || typeof table.id !== "string" || typeof table.section !== "string" || !Array.isArray(table.rows) || table.rows.some((row) => !Array.isArray(row) || row.some((cell) => typeof cell !== "string"))) throw new Error("Model zawiera nieprawidłową tabelę.");
    if ([table.title, table.description].some((item) => item !== undefined && (typeof item !== "string" || !item.trim()))) throw new Error(`Tabela ${table.id} nie zawiera poprawnego tytułu lub opisu.`);
  }
  if (bulletin.exportMap !== undefined) {
    const selection = bulletin.exportMap;
    if (!selection || typeof selection !== "object"
      || [selection.eu0207, selection.eu1602, selection.nonEu0207, selection.nonEu1602].some((id) => typeof id !== "string" || !id.trim())
      || typeof selection.confirmedTitleMismatch !== "boolean"
      || (selection.confirmedPeriodMismatch !== undefined && typeof selection.confirmedPeriodMismatch !== "boolean")) throw new Error("Model zawiera nieprawidłowy wybór tabel mapy eksportu.");
    buildExportMapData(bulletin.tables, selection, bulletin.id);
  }
  if (!bulletin.stats || [bulletin.stats.paragraphs, bulletin.stats.charts, bulletin.stats.tables, bulletin.stats.numericCells].some((item) => !Number.isInteger(item) || item < 0)) throw new Error("Model zawiera nieprawidłowe statystyki.");
  return bulletin as PreparedBulletin;
}
import { buildExportMapData, type ExportMapTableSelection } from "./bulletin-export-map.ts";
