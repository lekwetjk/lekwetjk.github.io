import crypto from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { eq, sql } from "drizzle-orm";
import readXlsxFile from "read-excel-file/web-worker";

import { getDb, getMemberDocumentsBucket } from "../../db/index.ts";
import { bulletinReports } from "../../db/schema.ts";
import { buildBulletinModel, getMissingBulletinSections, shouldCollectBulletinSourceSheet, type BulletinModel, type BulletinSourceSheet } from "./bulletin-model";

const LOCAL_REPORTS_DIR = path.join(os.tmpdir(), "krd-ig-bulletin-reports");
const LOCAL_REPORTS_FILE = path.join(LOCAL_REPORTS_DIR, "reports.json");
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 80 * 1024 * 1024;
const MAX_CELLS = 5_000_000;
const ALLOWED_SOURCE_EXTENSION = /\.(xlsx|pdf|docx)$/i;
const BULLETIN_MODEL_VERSION = 2;

const POLISH_MONTHS = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];

function bulletinTitle(month: number, year: number) {
  return `Biuletyn informacyjny "${POLISH_MONTHS[month - 1]}, ${year}"`;
}

export type BulletinReportSource = {
  name: string;
  key: string;
  contentType: string;
  size: number;
};

export type BulletinReport = {
  id: string;
  slug: string;
  title: string;
  month: number;
  year: number;
  dataKey: string;
  sources: BulletinReportSource[];
  sheetCount: number;
  rowCount: number;
  createdAt: string;
  createdBy: string;
};

export type BulletinSheet = {
  id: string;
  workbook: string;
  name: string;
  rows: string[][];
};

export type BulletinReportData = {
  sheets: BulletinSheet[];
  model?: BulletinModel;
  modelVersion?: number;
};

function safeFileName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
}

function localObjectPath(key: string) {
  return path.join(LOCAL_REPORTS_DIR, key.replace(/[^a-zA-Z0-9._-]/g, "_"));
}

function normalizeCell(value: unknown) {
  if (value instanceof Date) return value.toLocaleDateString("pl-PL");
  if (value === null || value === undefined) return "";
  return String(value);
}

function hasCellValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function trimRows(rows: unknown[][]) {
  const normalized = rows.filter((row) => row.some(hasCellValue)).map((row) => row.map(normalizeCell));
  const width = normalized.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  const populatedColumns = Array.from({ length: width }, (_, index) => index)
    .filter((index) => normalized.some((row) => (row[index] ?? "").trim()));
  return normalized.map((row) => populatedColumns.map((index) => row[index] ?? ""));
}

function mapRow(row: typeof bulletinReports.$inferSelect): BulletinReport {
  let sources: BulletinReportSource[] = [];
  try { sources = JSON.parse(row.sourcesJson) as BulletinReportSource[]; } catch { sources = []; }
  return {
    id: row.id,
    slug: row.slug,
    title: bulletinTitle(Number(row.month), Number(row.year)),
    month: Number(row.month),
    year: Number(row.year),
    dataKey: row.dataKey,
    sources,
    sheetCount: Number(row.sheetCount),
    rowCount: Number(row.rowCount),
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

async function ensureReportsTable() {
  const db = getDb();
  await db.run(sql`CREATE TABLE IF NOT EXISTS bulletin_reports (
    id TEXT PRIMARY KEY NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    month TEXT NOT NULL,
    year TEXT NOT NULL,
    data_key TEXT NOT NULL,
    sources_json TEXT NOT NULL DEFAULT '[]',
    sheet_count TEXT NOT NULL DEFAULT '0',
    row_count TEXT NOT NULL DEFAULT '0',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL
  )`);
  return db;
}

async function readLocalReports(): Promise<BulletinReport[]> {
  try {
    return (JSON.parse(await readFile(LOCAL_REPORTS_FILE, "utf8")) as BulletinReport[])
      .map((report) => ({ ...report, title: bulletinTitle(report.month, report.year) }));
  } catch {
    return [];
  }
}

async function writeLocalReports(reports: BulletinReport[]) {
  await mkdir(LOCAL_REPORTS_DIR, { recursive: true });
  await writeFile(LOCAL_REPORTS_FILE, JSON.stringify(reports, null, 2), "utf8");
}

async function putObject(key: string, value: ArrayBuffer | Uint8Array, contentType: string) {
  try {
    await getMemberDocumentsBucket().put(key, value, { httpMetadata: { contentType } });
  } catch {
    await mkdir(LOCAL_REPORTS_DIR, { recursive: true });
    await writeFile(localObjectPath(key), Buffer.from(value instanceof ArrayBuffer ? new Uint8Array(value) : value));
  }
}

async function getObject(key: string) {
  try {
    const object = await getMemberDocumentsBucket().get(key);
    if (object) return object;
  } catch {
    // Local previews use the temporary filesystem when R2 is unavailable.
  }
  try {
    const content = await readFile(localObjectPath(key));
    return { body: content, httpMetadata: { contentType: "application/octet-stream" } };
  } catch {
    return null;
  }
}

async function deleteObject(key: string) {
  try { await getMemberDocumentsBucket().delete(key); } catch { /* Local preview fallback below. */ }
  try { await unlink(localObjectPath(key)); } catch { /* The local object may not exist. */ }
}

export async function listBulletinReports() {
  try {
    const db = await ensureReportsTable();
    const rows = await db.select().from(bulletinReports);
    return rows.map(mapRow).sort((left, right) => right.year - left.year || right.month - left.month);
  } catch {
    return (await readLocalReports()).sort((left, right) => right.year - left.year || right.month - left.month);
  }
}

export async function getBulletinReport(slug: string) {
  return (await listBulletinReports()).find((report) => report.slug === slug) ?? null;
}

export async function getBulletinReportData(report: BulletinReport): Promise<BulletinReportData | null> {
  const object = await getObject(report.dataKey);
  if (!object) return null;
  const text = object.body instanceof Uint8Array
    ? Buffer.from(object.body).toString("utf8")
    : await new Response(object.body).text();
  try {
    const data = JSON.parse(text) as BulletinReportData;
    if (data.model && data.modelVersion === BULLETIN_MODEL_VERSION) return data;
    const modelSheets: BulletinSourceSheet[] = [];
    for (const source of report.sources.filter((item) => /\.xlsx$/i.test(item.name))) {
      const sourceObject = await getObject(source.key);
      if (!sourceObject) continue;
      const sourceBytes = sourceObject.body instanceof Uint8Array
        ? new Uint8Array(sourceObject.body)
        : new Uint8Array(await new Response(sourceObject.body).arrayBuffer());
      const workbookSheets = await readXlsxFile(new File([sourceBytes], source.name, { type: source.contentType }));
      for (const workbookSheet of workbookSheets) {
        if (shouldCollectBulletinSourceSheet(source.name, workbookSheet.sheet)) {
          modelSheets.push({ workbook: source.name, name: workbookSheet.sheet, rows: workbookSheet.data });
        }
      }
    }
    data.model = buildBulletinModel(modelSheets, report.year, report.month);
    data.modelVersion = BULLETIN_MODEL_VERSION;
    await putObject(report.dataKey, Buffer.from(JSON.stringify(data), "utf8"), "application/json");
    return data;
  } catch {
    return null;
  }
}

export async function getBulletinPdf(reportId: string) {
  const report = (await listBulletinReports()).find((item) => item.id === reportId);
  const source = report?.sources.find((item) => /biuletyn.*\.pdf$/i.test(item.name))
    ?? report?.sources.find((item) => /\.pdf$/i.test(item.name));
  if (!report || !source) return null;
  const object = await getObject(source.key);
  return object ? { report, source, object } : null;
}

export async function createBulletinReport(input: { month: number; year: number; files: File[]; createdBy: string }) {
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) throw new Error("Wybierz poprawny miesiąc.");
  if (!Number.isInteger(input.year) || input.year < 2020 || input.year > 2100) throw new Error("Wybierz poprawny rok.");
  if (!input.files.length) throw new Error("Wskaż co najmniej jeden plik źródłowy.");
  if (input.files.some((file) => !ALLOWED_SOURCE_EXTENSION.test(file.name))) throw new Error("Dozwolone są pliki XLSX, PDF i DOCX.");
  if (input.files.some((file) => file.size > MAX_FILE_BYTES)) throw new Error("Pojedynczy plik nie może przekraczać 25 MB.");
  if (input.files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) throw new Error("Łączny rozmiar plików nie może przekraczać 80 MB.");
  if (!input.files.some((file) => /\.xlsx$/i.test(file.name))) throw new Error("Do utworzenia interaktywnych tabel potrzebny jest co najmniej jeden plik XLSX.");
  if (!input.files.some((file) => /\.pdf$/i.test(file.name))) throw new Error("Do publikacji potrzebny jest biuletyn w wersji PDF.");

  const slug = `biuletyn-informacyjny-${input.year}-${String(input.month).padStart(2, "0")}`;
  if (await getBulletinReport(slug)) throw new Error("Biuletyn dla tego miesiąca i roku jest już opublikowany.");

  const sheets: BulletinSheet[] = [];
  const modelSheets: BulletinSourceSheet[] = [];
  let cellCount = 0;
  for (const file of input.files.filter((candidate) => /\.xlsx$/i.test(candidate.name))) {
    const workbookSheets = await readXlsxFile(file);
    for (const workbookSheet of workbookSheets) {
      if (shouldCollectBulletinSourceSheet(file.name, workbookSheet.sheet)) {
        modelSheets.push({ workbook: file.name, name: workbookSheet.sheet, rows: workbookSheet.data });
      }
      const rows = trimRows(workbookSheet.data);
      if (!rows.length) continue;
      cellCount += rows.reduce((sum, row) => sum + row.length, 0);
      if (cellCount > MAX_CELLS) {
        throw new Error(`Arkusze zawierają zbyt dużo danych. Limit publikacji wynosi 5 000 000 komórek. Przekroczenie nastąpiło w pliku „${file.name}”, arkuszu „${workbookSheet.sheet}”.`);
      }
      sheets.push({ id: `${sheets.length + 1}`, workbook: file.name, name: workbookSheet.sheet, rows });
    }
  }
  if (!sheets.length) throw new Error("Nie znaleziono niepustych arkuszy w plikach XLSX.");
  const model = buildBulletinModel(modelSheets, input.year, input.month);
  const missingSections = getMissingBulletinSections(model);
  if (missingSections.length) {
    throw new Error(`Nie można opublikować niekompletnego biuletynu. Brak danych dla sekcji: ${missingSections.join(", ")}. Sprawdź, czy wybrano wszystkie pliki XLSX i czy ich arkusze zachowują oczekiwaną strukturę.`);
  }

  const id = crypto.randomUUID();
  const prefix = `bulletin-reports/${id}`;
  const dataKey = `${prefix}/report.json`;
  const sources: BulletinReportSource[] = [];
  for (const [index, file] of input.files.entries()) {
    const key = `${prefix}/sources/${index + 1}-${safeFileName(file.name)}`;
    await putObject(key, await file.arrayBuffer(), file.type || "application/octet-stream");
    sources.push({ name: file.name, key, contentType: file.type || "application/octet-stream", size: file.size });
  }
  await putObject(dataKey, Buffer.from(JSON.stringify({ sheets, model, modelVersion: BULLETIN_MODEL_VERSION } satisfies BulletinReportData), "utf8"), "application/json");

  const report: BulletinReport = {
    id,
    slug,
    title: bulletinTitle(input.month, input.year),
    month: input.month,
    year: input.year,
    dataKey,
    sources,
    sheetCount: sheets.length,
    rowCount: sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0),
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };

  try {
    const db = await ensureReportsTable();
    await db.insert(bulletinReports).values({
      id: report.id, slug: report.slug, title: report.title, month: String(report.month), year: String(report.year),
      dataKey: report.dataKey, sourcesJson: JSON.stringify(report.sources), sheetCount: String(report.sheetCount),
      rowCount: String(report.rowCount), createdAt: report.createdAt, createdBy: report.createdBy,
    });
  } catch {
    await writeLocalReports([report, ...(await readLocalReports())]);
  }
  return report;
}

export async function deleteBulletinReport(id: string) {
  const report = (await listBulletinReports()).find((item) => item.id === id);
  if (!report) throw new Error("Nie znaleziono raportu.");
  await Promise.all([report.dataKey, ...report.sources.map((source) => source.key)].map(deleteObject));
  try {
    const db = await ensureReportsTable();
    await db.delete(bulletinReports).where(eq(bulletinReports.id, id));
  } catch {
    await writeLocalReports((await readLocalReports()).filter((item) => item.id !== id));
  }
}