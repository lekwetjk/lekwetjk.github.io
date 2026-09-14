import rawContent from "../data/content.json";

import { getDb } from "../../db/index.ts";
import { sql } from "drizzle-orm";
import { asc, eq } from "drizzle-orm";
import { wstawieniaRows } from "../../db/schema.ts";

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

function normalizeValues(values: unknown) {
  const result = Array.isArray(values) ? values.map((value) => String(value ?? "").trim()) : [];
  return [...result, ...Array(Math.max(0, WSTAWIENIA_COLUMNS.length - result.length)).fill("")]
    .slice(0, WSTAWIENIA_COLUMNS.length);
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
    rows.push({ year, values: normalizeValues(values) });
  }

  return rows;
}

async function ensureWstawieniaTable() {
  const db = getDb();
  await db.run(sql`CREATE TABLE IF NOT EXISTS wstawienia_rows (year TEXT PRIMARY KEY NOT NULL, values_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by TEXT NOT NULL DEFAULT '')`);
  const existingRows = await db.select().from(wstawieniaRows).limit(1);

  if (existingRows.length === 0) {
    for (const row of initialRows()) {
      await db.insert(wstawieniaRows).values({ year: row.year, valuesJson: JSON.stringify(row.values) });
    }
  }

  return db;
}

export async function getWstawieniaRows() {
  const db = await ensureWstawieniaTable();
  const rows = await db.select().from(wstawieniaRows).orderBy(asc(wstawieniaRows.year));
  return rows.map((row) => ({
    year: row.year,
    values: normalizeValues(JSON.parse(row.valuesJson)),
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  }));
}

export async function saveWstawieniaRows(rows: WstawieniaRow[], updatedBy: string) {
  const normalizedRows = rows.map((row) => ({
    year: String(row.year).trim(),
    values: normalizeValues(row.values),
  }));

  if (normalizedRows.length === 0 || normalizedRows.some((row) => !/^\d{4}$/.test(row.year))) {
    throw new Error("Każdy wiersz musi zawierać czterocyfrowy rok.");
  }

  if (new Set(normalizedRows.map((row) => row.year)).size !== normalizedRows.length) {
    throw new Error("Tabela zawiera powtórzony rok.");
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