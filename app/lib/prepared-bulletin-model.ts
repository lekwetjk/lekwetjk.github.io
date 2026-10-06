export type PreparedBulletinSeries = {
  name: string;
  values: Array<number | null>;
};

export type PreparedBulletinChart = {
  id: string;
  section: string;
  title: string;
  kind: string;
  categories: string[];
  series: PreparedBulletinSeries[];
};

export type PreparedBulletinTable = {
  id: string;
  section: string;
  rows: string[][];
};

export type PreparedBulletin = {
  id: string;
  period: string;
  title: string;
  sections: string[];
  charts: PreparedBulletinChart[];
  tables: PreparedBulletinTable[];
  stats: {
    paragraphs: number;
    charts: number;
    tables: number;
    numericCells: number;
  };
};

export function validatePreparedBulletin(value: unknown): PreparedBulletin {
  const bulletin = value as Partial<PreparedBulletin>;
  if (!bulletin || typeof bulletin !== "object") throw new Error("Plik nie zawiera modelu biuletynu.");
  if (typeof bulletin.id !== "string" || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(bulletin.id)) throw new Error("Identyfikator wydania musi mieć format RRRR-MM.");
  if (typeof bulletin.period !== "string" || !bulletin.period.trim()) throw new Error("Brak okresu wydania.");
  if (typeof bulletin.title !== "string" || !/^Biuletyn informacyjny "[^\"]+, \d{4}"$/.test(bulletin.title)) throw new Error('Tytuł musi mieć format Biuletyn informacyjny "miesiąc, rok".');
  if (!Array.isArray(bulletin.sections) || bulletin.sections.length < 4 || bulletin.sections.some((section) => typeof section !== "string" || !section.trim())) throw new Error("Model musi zawierać co najmniej cztery obszary danych.");
  if (!Array.isArray(bulletin.charts) || bulletin.charts.length < 1) throw new Error("Model nie zawiera wykresów.");
  if (!Array.isArray(bulletin.tables) || bulletin.tables.length < 1) throw new Error("Model nie zawiera tabel.");
  for (const chart of bulletin.charts) {
    if (!chart || typeof chart.id !== "string" || typeof chart.section !== "string" || typeof chart.title !== "string" || typeof chart.kind !== "string") throw new Error("Model zawiera nieprawidłowy wykres.");
    if (!Array.isArray(chart.categories) || !chart.categories.length || chart.categories.some((category) => typeof category !== "string")) throw new Error(`Wykres ${chart.id} nie zawiera poprawnych kategorii.`);
    if (!Array.isArray(chart.series) || !chart.series.length || chart.series.some((series) => typeof series.name !== "string" || !Array.isArray(series.values) || series.values.some((item) => item !== null && (typeof item !== "number" || !Number.isFinite(item))))) throw new Error(`Wykres ${chart.id} nie zawiera poprawnych serii.`);
  }
  for (const table of bulletin.tables) {
    if (!table || typeof table.id !== "string" || typeof table.section !== "string" || !Array.isArray(table.rows) || table.rows.some((row) => !Array.isArray(row) || row.some((cell) => typeof cell !== "string"))) throw new Error("Model zawiera nieprawidłową tabelę.");
  }
  if (!bulletin.stats || [bulletin.stats.paragraphs, bulletin.stats.charts, bulletin.stats.tables, bulletin.stats.numericCells].some((item) => !Number.isInteger(item) || item < 0)) throw new Error("Model zawiera nieprawidłowe statystyki.");
  return bulletin as PreparedBulletin;
}