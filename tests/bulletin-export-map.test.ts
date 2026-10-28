import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildExportMapData, exportMapPeriodWarning, exportMapTitleWarnings, suggestExportMapTables, type ExportMapTableSelection } from "../app/lib/bulletin-export-map.ts";
import { validatePreparedBulletin, type PreparedBulletin, type PreparedBulletinTable } from "../app/lib/prepared-bulletin-model.ts";

const bulletin = JSON.parse(readFileSync(new URL("../app/data/bulletins/2026-08.json", import.meta.url), "utf8")) as PreparedBulletin;
const selection: ExportMapTableSelection = {
  eu0207: "table-50", eu1602: "table-51", nonEu0207: "table-52", nonEu1602: "table-53", confirmedTitleMismatch: false,
};

test("the archived August edition uses the confirmed four export tables", () => {
  const selections = JSON.parse(readFileSync(new URL("../app/data/bulletins/export-map-selections.json", import.meta.url), "utf8")) as Record<string, ExportMapTableSelection>;
  const descriptions = JSON.parse(readFileSync(new URL("../app/data/bulletins/table-descriptions.json", import.meta.url), "utf8")) as Record<string, Record<string, { title: string; description: string }>>;
  const archivedSelection = selections[bulletin.id];
  assert.deepEqual(archivedSelection, { ...selection, confirmedTitleMismatch: true });
  const tables = bulletin.tables.map((table) => ({ ...table, ...descriptions[bulletin.id][table.id] }));
  const map = buildExportMapData(tables, archivedSelection, bulletin.id);
  assert.equal(map.countries.length, 37);
  assert.equal(map.countries.find((country) => country.iso3 === "DEU")?.records.cn1602?.valueEur.text, "69 548 975");
});

test("map reads the four source tables without summing or recalculating their values", () => {
  const map = buildExportMapData(bulletin.tables, selection);
  const germany = map.countries.find((country) => country.iso3 === "DEU");
  assert.equal(map.countries.length, 37);
  assert.equal(map.period, "I-VII.2026 R.");
  assert.equal(germany?.records.cn0207?.netMassKg.text, "197 101 004");
  assert.equal(germany?.records.cn0207?.shareKg.text, "19,53%");
  assert.equal(germany?.records.cn1602?.valueEur.text, "69 548 975");
  assert.equal(germany?.records.cn1602?.shareEur.value, 8.24);
  assert.equal(map.countries.find((country) => country.iso3 === "COM")?.records.cn0207?.netMassKg.value, 3770764);
});

test("ambiguous codes must be explicitly confirmed", () => {
  const tables = bulletin.tables.map((table) => table.id === "table-51" ? { ...table, title: "Eksport w ramach UE z grup kodów CN 1607" } : table);
  assert.match(exportMapTitleWarnings(tables, selection)[0], /1607/);
  assert.throws(() => buildExportMapData(tables, selection), /Potwierdź rozbieżności/);
  assert.equal(buildExportMapData(tables, { ...selection, confirmedTitleMismatch: true }).countries.length, 37);
});

test("suggestions use titles and headers instead of table order and do not guess the 1607 code", () => {
  const titles: Record<string, string> = {
    "table-50": "Eksport w ramach UE z grup kodów CN 0207",
    "table-51": "Eksport w ramach UE z grup kodów CN 1607",
    "table-52": "Eksport poza UE z grup kodów CN 0207",
    "table-53": "Eksport poza UE z grup kodów CN 1602",
  };
  const tables = bulletin.tables.map((table) => ({ ...table, title: titles[table.id] ?? table.title })).reverse();
  assert.deepEqual(suggestExportMapTables(tables), { ...selection, eu1602: "" });
  const corrected = tables.map((table) => table.id === "table-51" ? { ...table, title: "Eksport w ramach UE z grup kodów CN 1602" } : table);
  assert.deepEqual(suggestExportMapTables(corrected), selection);
});

test("selected sources survive publication serialization and are revalidated", () => {
  const prepared = { ...bulletin, exportMap: selection };
  const restored = validatePreparedBulletin(JSON.parse(JSON.stringify(prepared)));
  assert.deepEqual(restored.exportMap, selection);
  assert.equal(buildExportMapData(restored.tables, restored.exportMap!, restored.id).countries.length, 37);
  assert.throws(() => validatePreparedBulletin({ ...prepared, exportMap: { ...selection, nonEu0207: "brak" } }), /Nie znaleziono tabeli/);
});

test("the following edition reads new source values and asks for confirmation of stale or uncertain periods", () => {
  const withPeriod = (period: string) => bulletin.tables.map((table) =>
    Object.values(selection).includes(table.id) ? {
      ...table,
      rows: table.rows.map((row, index) => index === 0 ? row.map((cell) => cell.replace("I-VII.2026 R.", period)) : row),
    } : table,
  );
  const updated = withPeriod("I-VIII.2026 R.").map((table) => table.id === selection.eu0207 ? {
    ...table,
    rows: table.rows.map((row) => row.some((cell) => cell === "Niemcy") ? row.map((cell) => cell === "197 101 004" ? "197 101 005" : cell) : row),
  } : table);
  const next = { ...bulletin, id: "2026-09", period: "wrzesień 2026", title: 'Biuletyn informacyjny "wrzesień, 2026"', tables: updated, exportMap: selection };
  const restored = validatePreparedBulletin(JSON.parse(JSON.stringify(next)));
  const map = buildExportMapData(restored.tables, restored.exportMap!, restored.id);
  assert.equal(map.period, "I-VIII.2026 R.");
  assert.equal(map.countries.find((country) => country.iso3 === "DEU")?.records.cn0207?.netMassKg.text, "197 101 005");
  assert.equal(exportMapPeriodWarning(bulletin.tables, selection, "2026-09")?.includes("wcześniej"), true);
  assert.throws(() => buildExportMapData(bulletin.tables, selection, "2026-09"), /Potwierdź okres/);
  assert.doesNotThrow(() => buildExportMapData(bulletin.tables, { ...selection, confirmedPeriodMismatch: true }, "2026-09"));
  assert.match(exportMapPeriodWarning(withPeriod("I-X.2026 R."), selection, "2026-09")!, /wykracza/);
  assert.match(exportMapPeriodWarning(withPeriod("dane za 2026"), selection, "2026-09")!, /Nie można ustalić/);
  assert.equal(exportMapPeriodWarning(withPeriod("I-XII.2026 R."), selection, "2027-01"), null);
});

test("the locally served world geometry covers every recognized country code", () => {
  const codes = JSON.parse(readFileSync(new URL("../app/data/export-map-country-codes.json", import.meta.url), "utf8")) as Record<string, string>;
  const geo = JSON.parse(readFileSync(new URL("../public/data/export-map-countries.geojson", import.meta.url), "utf8")) as {
    type: string;
    features: Array<{ properties: { iso3: string } }>;
  };
  const ids = geo.features.map((feature) => feature.properties.iso3);
  assert.equal(geo.type, "FeatureCollection");
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(Object.keys(codes).filter((code) => !ids.includes(code)), []);
});

test("duplicate selections, unrecognized countries, missing values and inconsistent periods fail explicitly", () => {
  assert.throws(() => buildExportMapData(bulletin.tables, { ...selection, eu1602: selection.eu0207 }), /cztery różne/);
  const replace = (change: (table: PreparedBulletinTable) => PreparedBulletinTable) => bulletin.tables.map((table) => table.id === "table-50" ? change(table) : table);
  const replaceCell = (rowIndex: number, columnIndex: number, value: string) => replace((table) => ({
    ...table,
    rows: table.rows.map((row, i) => i === rowIndex ? row.map((cell, j) => j === columnIndex ? value : cell) : row),
  }));
  assert.throws(() => buildExportMapData(replaceCell(3, 1, "Nieznany kraj"), selection), /nie rozpoznano państwa/);
  assert.throws(() => buildExportMapData(replaceCell(3, 5, "—"), selection), /brakująca wartość/);
  assert.throws(() => buildExportMapData(replaceCell(0, 0, "ZA OKRES: I-VI.2026 R."), selection), /różnych okresów/);
  assert.throws(() => buildExportMapData(bulletin.tables, selection, "2027-08"), /Potwierdź okres/);
});
