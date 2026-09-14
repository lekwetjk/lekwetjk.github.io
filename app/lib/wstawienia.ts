import rawContent from "../data/content.json";

import { getDb } from "../../db/index.ts";
import { sql } from "drizzle-orm";
import { asc, eq } from "drizzle-orm";
import { wstawieniaMetadata, wstawieniaRows } from "../../db/schema.ts";

export const WSTAWIENIA_COLUMNS = [
  "Styczeń", "Luty", "Marzec", "I kwartał", "Dynamika", "Kwiecień", "Maj", "Czerwiec",
  "II kwartał", "Dynamika", "I półrocze", "Dynamika", "Lipiec", "Sierpień", "Wrzesień",
  "III kwartał", "Dynamika", "Październik", "Listopad", "Grudzień", "IV kwartał", "Dynamika",
  "II półrocze", "Dynamika", "Rok", "Dynamika",
];

export type WstawieniaRow = {
  year: string;
  values: string[];
  updatedAt?: string;
  updatedBy?: string;
};

const MONTHLY_INDEXES = [0, 1, 2, 5, 6, 7, 12, 13, 14, 17, 18, 19];
const DERIVED_INDEXES = new Set([3, 4, 8, 9, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);
const LEGACY_ROWS_WITH_MISSING_DYNAMICS = new Set(["2020", "2022", "2024", "2025"]);
const WSTAWIENIA_DATA_VERSION = "2";

function normalizeValues(values: unknown) {
  const result = Array.isArray(values) ? values.map((value) => String(value ?? "").trim()) : [];
  return [...result, ...Array(Math.max(0, WSTAWIENIA_COLUMNS.length - result.length)).fill("")]
    .slice(0, WSTAWIENIA_COLUMNS.length);
}

function parseNumber(value: string) {
  const normalized = value.replace(/\*/g, "").replace(/\s+/g, "").replace(/,/g, ".").trim();
  if (!normalized || normalized === "-" || normalized === "—") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("pl-PL").replace(/\u00a0/g, " ");
}

function formatPercent(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return "";
  return `${((current / previous) * 100).toFixed(1).replace(".", ",")}%`;
}

function alignLegacyValues(year: string, values: string[]) {
  const result = [...values];
  if (LEGACY_ROWS_WITH_MISSING_DYNAMICS.has(year)) {
    for (const percentIndex of [4, 9, 11, 16, 21, 23, 25]) {
      if (!result[percentIndex]?.includes("%")) result.splice(percentIndex, 0, "");
    }
  }
  return normalizeValues(result);
}

function calculateRows(rows: WstawieniaRow[]) {
  const byYear = new Map<string, string[]>();
  return [...rows].sort((left, right) => left.year.localeCompare(right.year)).map((row) => {
    const values = normalizeValues(row.values);
    for (const index of DERIVED_INDEXES) values[index] = "";
    const sum = (indexes: number[]) => {
      const numbers = indexes.map((index) => parseNumber(values[index]));
      return numbers.every((value) => value !== null)
        ? numbers.reduce((total, value) => total + (value ?? 0), 0)
        : null;
    };
    const metrics: Array<[number, number | null]> = [
      [3, sum([0, 1, 2])], [8, sum([5, 6, 7])], [10, sum([0, 1, 2, 5, 6, 7])],
      [15, sum([12, 13, 14])], [20, sum([17, 18, 19])], [22, sum([12, 13, 14, 17, 18, 19])],
      [24, sum(MONTHLY_INDEXES)],
    ];
    for (const [index, value] of metrics) values[index] = value === null ? "" : formatNumber(value);
    const previous = byYear.get(String(Number(row.year) - 1));
    if (previous) {
      for (const [metricIndex, dynamicIndex] of [[3, 4], [8, 9], [10, 11], [15, 16], [20, 21], [22, 23], [24, 25]] as const) {
        values[dynamicIndex] = formatPercent(parseNumber(values[metricIndex]), parseNumber(previous[metricIndex]));
      }
    }
    byYear.set(row.year, values);
    return { ...row, values };
  });
}

function initialRows(): WstawieniaRow[] {
  const page = (rawContent as { pages?: Array<{ slug?: string; paragraphs?: string[] }> }).pages
    ?.find((item) => item.slug === "wstawienia");
  const paragraphs = page?.paragraphs ?? [];
  const rows: WstawieniaRow[] = [];

  for (let index = 0; index < paragraphs.length; index += 1) {
    const year = paragraphs[index]?.trim();
    if (!/^\d{4}$/.test(year)) continue;

    const values: string[] = [];
    for (index += 1; index < paragraphs.length && !/^\d{4}$/.test(paragraphs[index]?.trim() ?? ""); index += 1) {
      const value = paragraphs[index]?.trim();
      if (/^(Ostatnia edycja:|Opracowanie:)/i.test(value ?? "")) break;
      if (value) values.push(value);
    }
    index -= 1;
    rows.push({ year, values: alignLegacyValues(year, values) });
  }

  return rows;
}

async function ensureWstawieniaTable() {
  const db = getDb();
  await db.run(sql`CREATE TABLE IF NOT EXISTS wstawienia_rows (year TEXT PRIMARY KEY NOT NULL, values_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by TEXT NOT NULL DEFAULT '')`);
  await db.run(sql`CREATE TABLE IF NOT EXISTS wstawienia_metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)`);
  const version = await db.select().from(wstawieniaMetadata).where(eq(wstawieniaMetadata.key, "data_version")).limit(1);

  if (version[0]?.value !== WSTAWIENIA_DATA_VERSION) {
    await db.delete(wstawieniaRows);
    for (const row of initialRows()) {
      const values = normalizeValues(row.values).map((value, index) => DERIVED_INDEXES.has(index) ? "" : value);
      await db.insert(wstawieniaRows).values({ year: row.year, valuesJson: JSON.stringify(values) });
    }
    await db.insert(wstawieniaMetadata).values({ key: "data_version", value: WSTAWIENIA_DATA_VERSION })
      .onConflictDoUpdate({ target: wstawieniaMetadata.key, set: { value: WSTAWIENIA_DATA_VERSION } });
  }

  return db;
}

export async function getWstawieniaRows() {
  const db = await ensureWstawieniaTable();
  const rows = await db.select().from(wstawieniaRows).orderBy(asc(wstawieniaRows.year));
  return calculateRows(rows.map((row) => ({
    year: row.year,
    values: normalizeValues(JSON.parse(row.valuesJson)),
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  })));
}

export async function saveWstawieniaRows(rows: WstawieniaRow[], updatedBy: string) {
  const normalizedRows = rows.map((row) => ({
    year: String(row.year).trim(),
    values: normalizeValues(row.values).map((value, index) => DERIVED_INDEXES.has(index) ? "" : value),
  }));

  if (normalizedRows.length === 0 || normalizedRows.some((row) => !/^\d{4}$/.test(row.year))) {
    throw new Error("Każdy wiersz musi zawierać czterocyfrowy rok.");
  }

  if (new Set(normalizedRows.map((row) => row.year)).size !== normalizedRows.length) {
    throw new Error("Tabela zawiera powtórzony rok.");
  }

  for (const row of normalizedRows) {
    for (const index of MONTHLY_INDEXES) {
      const value = row.values[index];
      if (value && !/^\d+$/.test(value.replace(/\s+/g, ""))) {
        throw new Error(`Wartość dla roku ${row.year} musi zawierać wyłącznie cyfry.`);
      }
    }
  }

  const db = await ensureWstawieniaTable();
  const existingRows = await db.select({ year: wstawieniaRows.year }).from(wstawieniaRows);
  const importedYears = new Set(normalizedRows.map((row) => row.year));

  for (const existingRow of existingRows) {
    if (!importedYears.has(existingRow.year)) {
      await db.delete(wstawieniaRows).where(eq(wstawieniaRows.year, existingRow.year));
    }
  }

  for (const row of normalizedRows) {
    await db.insert(wstawieniaRows).values({
      year: row.year,
      valuesJson: JSON.stringify(row.values),
      updatedBy,
    }).onConflictDoUpdate({
      target: wstawieniaRows.year,
      set: { valuesJson: JSON.stringify(row.values), updatedAt: new Date().toISOString(), updatedBy },
    });
  }
}