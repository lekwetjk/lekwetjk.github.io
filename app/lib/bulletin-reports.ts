import crypto from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { eq, sql } from "drizzle-orm";
import readXlsxFile from "read-excel-file/node";

import { getDb, getMemberDocumentsBucket } from "../../db/index.ts";
import { bulletinReports } from "../../db/schema.ts";
import { BULLETIN_CHAPTERS, documentContainsBulletinValue, getMissingDocumentChapters, matchingBulletinChapterIds } from "./bulletin-chapters";
import { buildBulletinModel, getMissingBulletinSections, shouldCollectBulletinSourceSheet, type BulletinModel, type BulletinSourceSheet } from "./bulletin-model";

const LOCAL_REPORTS_DIR = path.join(os.tmpdir(), "krd-ig-bulletin-reports");
const LOCAL_REPORTS_FILE = path.join(LOCAL_REPORTS_DIR, "reports.json");
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 80 * 1024 * 1024;
const MAX_CELLS = 5_000_000;
const MAX_STAGED_SHEET_CELLS = 500_000;
const ALLOWED_SOURCE_EXTENSION = /\.(xlsx|pdf|docx)$/i;
const BULLETIN_MODEL_VERSION = 3;

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
  sheets?: BulletinSheet[];
  model?: BulletinModel;
  modelVersion?: number;
  validation?: { document: string; chapters: string[] };
};

type StagedBulletinSource = BulletinReportSource & {
  parsedKeys?: string[];
  sha256: string;
  documentTextKey?: string;
  sheetCount: number;
  rowCount: number;
  cellCount: number;
};

type StagedBulletinUpload = {
  id: string;
  createdBy: string;
  sources: StagedBulletinSource[];
};

function safeFileName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
}

function localObjectPath(key: string) {
  return path.join(LOCAL_REPORTS_DIR, key.replace(/[^a-zA-Z0-9._-]/g, "_"));
}

function hasCellValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
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
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("binding `MEMBER_DOCUMENTS` is unavailable")) throw error;
    await mkdir(LOCAL_REPORTS_DIR, { recursive: true });
    await writeFile(localObjectPath(key), Buffer.from(value instanceof ArrayBuffer ? new Uint8Array(value) : value));
  }
}

async function getObject(key: string) {
  try {
    const object = await getMemberDocumentsBucket().get(key);
    if (object) return object;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("binding `MEMBER_DOCUMENTS` is unavailable")) throw error;
  }
  try {
    const content = await readFile(localObjectPath(key));
    return { body: content, httpMetadata: { contentType: "application/octet-stream" } };
  } catch {
    return null;
  }
}

async function deleteObject(key: string) {
  try {
    await getMemberDocumentsBucket().delete(key);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("binding `MEMBER_DOCUMENTS` is unavailable")) throw error;
  }
  try { await unlink(localObjectPath(key)); } catch { /* The local object may not exist. */ }
}

async function readJsonObject<T>(key: string): Promise<T | null> {
  const object = await getObject(key);
  if (!object) return null;
  const content = object.body instanceof Uint8Array
    ? Buffer.from(object.body).toString("utf8")
    : await new Response(object.body).text();
  try { return JSON.parse(content) as T; } catch { return null; }
}

function stagedManifestKey(uploadId: string) {
  return `bulletin-report-uploads/${uploadId}/manifest.json`;
}

async function saveReport(report: BulletinReport) {
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
    return data.model ? data : null;
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

export async function stageBulletinReportSource(input: { uploadId?: string; file: File; createdBy: string }) {
  if (!ALLOWED_SOURCE_EXTENSION.test(input.file.name)) throw new Error("Dozwolone są pliki XLSX, PDF i DOCX.");
  if (input.file.size > MAX_FILE_BYTES) throw new Error("Pojedynczy plik nie może przekraczać 25 MB.");

  const uploadId = input.uploadId && /^[a-f\d-]{36}$/i.test(input.uploadId) ? input.uploadId : crypto.randomUUID();
  const manifestKey = stagedManifestKey(uploadId);
  const existing = await readJsonObject<StagedBulletinUpload>(manifestKey);
  if (existing && existing.createdBy !== input.createdBy) throw new Error("Nieprawidłowa sesja przesyłania plików.");
  const manifest = existing ?? { id: uploadId, createdBy: input.createdBy, sources: [] };
  if (manifest.sources.reduce((sum, source) => sum + source.size, 0) + input.file.size > MAX_TOTAL_BYTES) {
    throw new Error("Łączny rozmiar plików nie może przekraczać 80 MB.");
  }

  const index = manifest.sources.length + 1;
  const prefix = `bulletin-report-uploads/${uploadId}`;
  const key = `${prefix}/sources/${index}-${safeFileName(input.file.name)}`;
  const fileBytes = Buffer.from(await input.file.arrayBuffer());
  const sha256 = crypto.createHash("sha256").update(fileBytes).digest("hex");
  await putObject(key, fileBytes, input.file.type || "application/octet-stream");
  manifest.sources.push({
    name: input.file.name,
    key,
    parsedKeys: [],
    sha256,
    contentType: input.file.type || "application/octet-stream",
    size: input.file.size,
    sheetCount: 0,
    rowCount: 0,
    cellCount: 0,
  });
  await putObject(manifestKey, Buffer.from(JSON.stringify(manifest), "utf8"), "application/json");
  return { uploadId, sourceIndex: index - 1, sourceCount: manifest.sources.length, sha256 };
}

export async function stageBulletinDocumentText(input: {
  uploadId: string;
  sourceIndex: number;
  sha256: string;
  text: string;
  createdBy: string;
}) {
  const manifestKey = stagedManifestKey(input.uploadId);
  const manifest = await readJsonObject<StagedBulletinUpload>(manifestKey);
  if (!manifest || manifest.createdBy !== input.createdBy) throw new Error("Nie znaleziono przesłanych plików raportu.");
  const source = manifest.sources[input.sourceIndex];
  if (!source || !/\.(pdf|docx)$/i.test(source.name) || source.sha256 !== input.sha256) throw new Error("Tekst kontrolny nie odpowiada przesłanemu dokumentowi.");
  if (typeof input.text !== "string" || input.text.length < 100 || input.text.length > 2_000_000) throw new Error("Dokument ma nieprawidłowy rozmiar tekstu kontrolnego.");
  source.documentTextKey = `bulletin-report-uploads/${input.uploadId}/documents/${input.sourceIndex}.txt`;
  await putObject(source.documentTextKey, Buffer.from(input.text, "utf8"), "text/plain; charset=utf-8");
  await putObject(manifestKey, Buffer.from(JSON.stringify(manifest), "utf8"), "application/json");
}

export async function stageBulletinReportSheet(input: {
  uploadId: string;
  sourceIndex: number;
  sheet: BulletinSourceSheet;
  createdBy: string;
}) {
  const manifestKey = stagedManifestKey(input.uploadId);
  const manifest = await readJsonObject<StagedBulletinUpload>(manifestKey);
  if (!manifest || manifest.createdBy !== input.createdBy) throw new Error("Nie znaleziono przesłanych plików raportu.");
  const source = manifest.sources[input.sourceIndex];
  if (!source || !/\.xlsx$/i.test(source.name) || input.sheet.workbook !== source.name) throw new Error("Nieprawidłowe dane arkusza.");
  if (!shouldCollectBulletinSourceSheet(source.name, input.sheet.name)) throw new Error("Nieobsługiwany arkusz źródłowy.");
  if (!Array.isArray(input.sheet.rows)) throw new Error("Nieprawidłowe dane arkusza.");
  const cellCount = input.sheet.rows.reduce((sum, row) => sum + (Array.isArray(row) ? row.length : 0), 0);
  if (cellCount > MAX_STAGED_SHEET_CELLS) throw new Error("Pojedynczy arkusz zawiera zbyt dużo danych do bezpiecznego przesłania.");
  const parsedKey = `bulletin-report-uploads/${input.uploadId}/parsed/${input.sourceIndex}-${source.parsedKeys?.length ?? 0}.json`;
  await putObject(parsedKey, Buffer.from(JSON.stringify(input.sheet), "utf8"), "application/json");
  source.parsedKeys = [...(source.parsedKeys ?? []), parsedKey];
  await putObject(manifestKey, Buffer.from(JSON.stringify(manifest), "utf8"), "application/json");
}

export async function cancelStagedBulletinReport(input: { uploadId: string; createdBy: string }) {
  const manifestKey = stagedManifestKey(input.uploadId);
  const manifest = await readJsonObject<StagedBulletinUpload>(manifestKey);
  if (!manifest) return;
  if (manifest.createdBy !== input.createdBy) throw new Error("Nieprawidłowa sesja przesyłania plików.");
  await Promise.all([
    manifestKey,
    ...manifest.sources.flatMap((source) => [source.key, ...(source.parsedKeys ?? []), ...(source.documentTextKey ? [source.documentTextKey] : [])]),
  ].map(deleteObject));
}

export async function completeStagedBulletinSource(input: {
  uploadId: string;
  sourceIndex: number;
  sheetCount: number;
  rowCount: number;
  cellCount: number;
  createdBy: string;
}) {
  const manifestKey = stagedManifestKey(input.uploadId);
  const manifest = await readJsonObject<StagedBulletinUpload>(manifestKey);
  if (!manifest || manifest.createdBy !== input.createdBy) throw new Error("Nie znaleziono przesłanych plików raportu.");
  const source = manifest.sources[input.sourceIndex];
  if (!source || !/\.xlsx$/i.test(source.name)) throw new Error("Nieprawidłowe dane pliku XLSX.");
  if (![input.sheetCount, input.rowCount, input.cellCount].every((value) => Number.isInteger(value) && value >= 0)) throw new Error("Nieprawidłowe statystyki pliku XLSX.");
  source.sheetCount = input.sheetCount;
  source.rowCount = input.rowCount;
  source.cellCount = input.cellCount;
  await putObject(manifestKey, Buffer.from(JSON.stringify(manifest), "utf8"), "application/json");
}

export async function finalizeStagedBulletinReport(input: { uploadId: string; month: number; year: number; createdBy: string }) {
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) throw new Error("Wybierz poprawny miesiąc.");
  if (!Number.isInteger(input.year) || input.year < 2020 || input.year > 2100) throw new Error("Wybierz poprawny rok.");
  const manifestKey = stagedManifestKey(input.uploadId);
  const manifest = await readJsonObject<StagedBulletinUpload>(manifestKey);
  if (!manifest || manifest.createdBy !== input.createdBy) throw new Error("Nie znaleziono przesłanych plików raportu.");
  if (!manifest.sources.some((source) => /\.xlsx$/i.test(source.name))) throw new Error("Do utworzenia interaktywnych tabel potrzebny jest co najmniej jeden plik XLSX.");
  if (!manifest.sources.some((source) => /\.pdf$/i.test(source.name))) throw new Error("Do publikacji potrzebny jest biuletyn w wersji PDF.");

  const slug = `biuletyn-informacyjny-${input.year}-${String(input.month).padStart(2, "0")}`;
  if (await getBulletinReport(slug)) throw new Error("Biuletyn dla tego miesiąca i roku jest już opublikowany.");
  const sheetCount = manifest.sources.reduce((sum, source) => sum + source.sheetCount, 0);
  const rowCount = manifest.sources.reduce((sum, source) => sum + source.rowCount, 0);
  const cellCount = manifest.sources.reduce((sum, source) => sum + source.cellCount, 0);
  if (!sheetCount) throw new Error("Nie znaleziono niepustych arkuszy w plikach XLSX.");
  if (cellCount > MAX_CELLS) throw new Error("Arkusze zawierają zbyt dużo danych. Limit publikacji wynosi 5 000 000 komórek.");

  const modelSheets: BulletinSourceSheet[] = [];
  let parsedCellCount = 0;
  for (const source of manifest.sources) {
    for (const parsedKey of source.parsedKeys ?? []) {
      const parsedSheet = await readJsonObject<BulletinSourceSheet>(parsedKey);
      if (!parsedSheet) continue;
      parsedCellCount += parsedSheet.rows.reduce((sum, row) => sum + (Array.isArray(row) ? row.length : 0), 0);
      if (parsedCellCount > MAX_CELLS) throw new Error("Arkusze zawierają zbyt dużo danych. Limit publikacji wynosi 5 000 000 komórek.");
      modelSheets.push(parsedSheet);
    }
  }
  const model = buildBulletinModel(modelSheets, input.year, input.month);
  const missingSections = getMissingBulletinSections(model);
  if (missingSections.length) {
    throw new Error(`Nie można opublikować niekompletnego biuletynu. Brak danych dla sekcji: ${missingSections.join(", ")}. Sprawdź, czy wybrano wszystkie pliki XLSX i czy ich arkusze zachowują oczekiwaną strukturę.`);
  }
  const missingModelChapters = model.chapters?.filter((chapter) => chapter.status === "missing") ?? [];
  if (missingModelChapters.length) throw new Error(`Nie można opublikować biuletynu. Nie wydobyto danych dla rozdziałów: ${missingModelChapters.map((chapter) => chapter.title).join(", ")}.`);

  const validationSource = manifest.sources.find((source) => /\.docx$/i.test(source.name) && source.documentTextKey)
    ?? manifest.sources.find((source) => /\.pdf$/i.test(source.name) && source.documentTextKey);
  if (!validationSource?.documentTextKey) throw new Error("Nie udało się zweryfikować rozdziałów z wersją PDF lub DOCX.");
  const validationObject = await getObject(validationSource.documentTextKey);
  if (!validationObject) throw new Error("Nie znaleziono tekstu kontrolnego dokumentu.");
  const documentText = validationObject.body instanceof Uint8Array
    ? Buffer.from(validationObject.body).toString("utf8")
    : await new Response(validationObject.body).text();
  const missingDocumentChapters = getMissingDocumentChapters(documentText);
  if (missingDocumentChapters.length) throw new Error(`Dokument ${validationSource.name} nie potwierdza rozdziałów: ${missingDocumentChapters.map((chapter) => chapter.title).join(", ")}.`);
  const tradeExportKg = model.trade.filter((row) => row.direction === "Eksport" && row.group === "0207").reduce((sum, row) => sum + row.kg, 0);
  const speciesExportKg = model.species.reduce((sum, row) => sum + row.kg, 0);
  if (tradeExportKg && speciesExportKg && Math.abs(tradeExportKg - speciesExportKg) / tradeExportKg > 0.005) {
    throw new Error("Suma eksportu CN 0207 różni się między źródłem szczegółowym i zestawieniem gatunków o ponad 0,5%.");
  }
  const validatedEuValue = model.euMarket?.find((item) => documentContainsBulletinValue(documentText, item.value))?.value;
  const representativeValues = [
    ["produkcja", model.summary.latestProduction],
    ["eksport CN 0207", tradeExportKg],
    ["wartość eksportu", model.summary.exportEur],
    ["eksport według gatunków", model.species[0]?.kg],
    ["ceny jaj", model.eggs[0]?.value],
    ["pisklęta indycze", model.chicks?.find((item) => item.name.toLocaleLowerCase("pl").includes("indycz"))?.value],
    ["dane rynku UE", validatedEuValue],
  ] as const;
  if (model.euMarket?.length && validatedEuValue === undefined) throw new Error(`Dokument ${validationSource.name} nie potwierdza wartości dla sekcji: dane rynku UE.`);
  const unmatchedValues = representativeValues.flatMap(([label, value]) => typeof value === "number" ? [[label, value] as const] : [])
    .filter(([, value]) => !documentContainsBulletinValue(documentText, value));
  if (unmatchedValues.length) throw new Error(`Dokument ${validationSource.name} nie potwierdza wartości dla sekcji: ${unmatchedValues.map(([label]) => label).join(", ")}.`);
  const coveredChapterIds = new Set(modelSheets.flatMap((sheet) => matchingBulletinChapterIds(sheet.workbook, sheet.name)));
  const missingSourceChapters = BULLETIN_CHAPTERS.filter((chapter) => chapter.sourceRules.length && !coveredChapterIds.has(chapter.id));
  if (missingSourceChapters.length) throw new Error(`Nie znaleziono pasujących danych XLSX dla rozdziałów: ${missingSourceChapters.map((chapter) => chapter.title).join(", ")}.`);

  const id = crypto.randomUUID();
  const dataKey = `bulletin-reports/${id}/report.json`;
  await putObject(dataKey, Buffer.from(JSON.stringify({
    model,
    modelVersion: BULLETIN_MODEL_VERSION,
    validation: { document: validationSource.name, chapters: BULLETIN_CHAPTERS.map((chapter) => chapter.id) },
  } satisfies BulletinReportData), "utf8"), "application/json");
  const report: BulletinReport = {
    id,
    slug,
    title: bulletinTitle(input.month, input.year),
    month: input.month,
    year: input.year,
    dataKey,
    sources: manifest.sources.map(({ parsedKeys: _parsedKeys, sha256: _sha256, documentTextKey: _documentTextKey, sheetCount: _sheetCount, rowCount: _rowCount, cellCount: _cellCount, ...source }) => source),
    sheetCount,
    rowCount,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };
  await saveReport(report);
  await Promise.all([manifestKey, ...manifest.sources.flatMap((source) => [...(source.parsedKeys ?? []), ...(source.documentTextKey ? [source.documentTextKey] : [])])].map(deleteObject));
  return report;
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

  const modelSheets: BulletinSourceSheet[] = [];
  let sheetCount = 0;
  let rowCount = 0;
  let cellCount = 0;
  for (const file of input.files.filter((candidate) => /\.xlsx$/i.test(candidate.name))) {
    const workbookSheets = await readXlsxFile(Buffer.from(await file.arrayBuffer()));
    for (const workbookSheet of workbookSheets) {
      if (shouldCollectBulletinSourceSheet(file.name, workbookSheet.sheet)) {
        modelSheets.push({ workbook: file.name, name: workbookSheet.sheet, rows: workbookSheet.data });
      }
      const populatedRows = workbookSheet.data.filter((row) => row.some(hasCellValue));
      if (!populatedRows.length) continue;
      sheetCount += 1;
      rowCount += populatedRows.length;
      cellCount += populatedRows.reduce((sum, row) => sum + row.length, 0);
      if (cellCount > MAX_CELLS) {
        throw new Error(`Arkusze zawierają zbyt dużo danych. Limit publikacji wynosi 5 000 000 komórek. Przekroczenie nastąpiło w pliku „${file.name}”, arkuszu „${workbookSheet.sheet}”.`);
      }
    }
  }
  if (!sheetCount) throw new Error("Nie znaleziono niepustych arkuszy w plikach XLSX.");
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
  await putObject(dataKey, Buffer.from(JSON.stringify({ model, modelVersion: BULLETIN_MODEL_VERSION } satisfies BulletinReportData), "utf8"), "application/json");

  const report: BulletinReport = {
    id,
    slug,
    title: bulletinTitle(input.month, input.year),
    month: input.month,
    year: input.year,
    dataKey,
    sources,
    sheetCount,
    rowCount,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };

  await saveReport(report);
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