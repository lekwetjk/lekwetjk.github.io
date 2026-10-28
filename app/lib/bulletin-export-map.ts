import countryCodes from "../data/export-map-country-codes.json" with { type: "json" };
import type { PreparedBulletinTable } from "./prepared-bulletin-model";

export type ExportMapTableSelection = {
  eu0207: string;
  eu1602: string;
  nonEu0207: string;
  nonEu1602: string;
  confirmedTitleMismatch: boolean;
  confirmedPeriodMismatch?: boolean;
};

export type ExportMapMetric = "netMassKg" | "valueEur" | "shareKg" | "shareEur";
export type ExportMapValue = { text: string; value: number };
export type ExportMapRecord = {
  netMassKg: ExportMapValue;
  valuePln: ExportMapValue;
  valueUsd: ExportMapValue;
  valueEur: ExportMapValue;
  shareKg: ExportMapValue;
  shareEur: ExportMapValue;
  sourceTable: string;
};
export type ExportMapCountry = {
  iso3: string;
  name: string;
  region: "UE" | "poza UE";
  records: Partial<Record<"cn0207" | "cn1602", ExportMapRecord>>;
};
export type ExportMapData = { period: string; countries: ExportMapCountry[] };

export const EXPORT_MAP_SLOTS = [
  { key: "eu0207", label: "UE — CN 0207", region: "UE", code: "cn0207" },
  { key: "eu1602", label: "UE — CN 1602", region: "UE", code: "cn1602" },
  { key: "nonEu0207", label: "poza UE — CN 0207", region: "poza UE", code: "cn0207" },
  { key: "nonEu1602", label: "poza UE — CN 1602", region: "poza UE", code: "cn1602" },
] as const;

export function suggestExportMapTables(tables: PreparedBulletinTable[]): ExportMapTableSelection {
  const selection: ExportMapTableSelection = {
    eu0207: "", eu1602: "", nonEu0207: "", nonEu1602: "", confirmedTitleMismatch: false,
  };
  for (const slot of EXPORT_MAP_SLOTS) {
    const matches = tables.filter((table) => {
      const title = normalize(table.title ?? "");
      const header = table.rows.find((row) => row.some((cell) => /kraj\s+przeznaczenia/i.test(cell)));
      const inRegion = slot.region === "UE" ? /\b(?:w ramach|do) ue\b/.test(title) && !/\bpoza ue\b/.test(title) : /\bpoza ue\b/.test(title);
      return /\beksport\b/.test(title) && inRegion && title.includes(slot.code.slice(2))
        && header && !header.some((cell) => /^\s*rok\s*$/i.test(cell));
    });
    if (matches.length === 1) selection[slot.key] = matches[0].id;
  }
  return selection;
}

function normalize(value: string) {
  return value.toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l").replace(/[^a-z0-9]+/g, " ").trim();
}

const aliases: Record<string, string> = {
  "niderlandy": "NLD", "holandia": "NLD", "czechy": "CZE",
  "wielka brytania": "GBR", "zjednoczone krolestwo": "GBR",
  "republika moldawii": "MDA", "moldawia": "MDA",
  "demokratyczna republika konga": "COD", "kongo": "COG",
  "macedonia polnocna": "MKD", "gwinea": "GIN",
};

const countryNames = new Map<string, string>();
const regionNames = new Intl.DisplayNames(["pl"], { type: "region" });
for (const [iso3, iso2] of Object.entries(countryCodes)) {
  const name = regionNames.of(iso2);
  if (name) countryNames.set(normalize(name), iso3);
}
for (const [name, iso3] of Object.entries(aliases)) countryNames.set(name, iso3);

function countryCode(name: string) {
  const cleaned = name.replace(/\s*\(nowy kierunek\)\s*$/i, "").replace(/\s*\d+\s*$/, "").trim();
  return { name: cleaned, iso3: countryNames.get(normalize(cleaned)) };
}

function numberCell(text: string, label: string): ExportMapValue {
  const clean = text.trim().replace(/[\s\u00a0\u202f]/g, "");
  if (!/^\d+(?:[,.]\d+)?%?$/.test(clean)) throw new Error(`Nieprawidłowa lub brakująca wartość „${label}”: „${text}”.`);
  const value = Number(clean.replace("%", "").replace(",", "."));
  if (!Number.isFinite(value) || value < 0 || (label.includes("udział") && value > 100)) throw new Error(`Nieprawidłowa wartość „${label}”: „${text}”.`);
  return { text: text.trim(), value };
}

function headerColumns(table: PreparedBulletinTable) {
  const index = table.rows.findIndex((row) => row.some((cell) => /kraj\s+przeznaczenia/i.test(cell)));
  if (index < 0) throw new Error(`Tabela ${table.id} nie zawiera kolumny „Kraj przeznaczenia”.`);
  const header = table.rows[index];
  if (header.some((cell) => /^\s*rok\s*$/i.test(cell))) throw new Error(`Tabela ${table.id} jest porównaniem wieloletnim, a nie tabelą bieżącego okresu.`);
  const find = (pattern: RegExp, label: string) => {
    const matches = header.flatMap((cell, i) => pattern.test(cell) ? [i] : []);
    if (matches.length !== 1) throw new Error(`Tabela ${table.id}: nie można jednoznacznie znaleźć kolumny ${label}.`);
    return matches[0];
  };
  const shares = header.flatMap((cell, i) => /udzial/i.test(normalize(cell)) ? [i] : []);
  const units = table.rows[index + 1] ?? [];
  const share = (unit: string) => {
    const matches = shares.filter((column) => normalize(units[column] ?? "") === normalize(unit));
    if (matches.length !== 1) throw new Error(`Tabela ${table.id}: nie można jednoznacznie znaleźć udziału ${unit}.`);
    return matches[0];
  };
  return {
    firstDataRow: index + 2,
    country: find(/kraj\s+przeznaczenia/i, "kraju"),
    netMassKg: find(/masa\s+netto\s*\[\s*kg\s*\]/i, "masy netto"),
    valuePln: find(/wartość\s*\[\s*pln\s*\]/i, "PLN"),
    valueUsd: find(/wartość\s*\[\s*usd\s*\]/i, "USD"),
    valueEur: find(/wartość\s*\[\s*eur\s*\]/i, "EUR"),
    shareKg: share("kg"),
    shareEur: share("eur"),
  };
}

export function exportMapTitleWarnings(tables: PreparedBulletinTable[], selection: ExportMapTableSelection) {
  return EXPORT_MAP_SLOTS.flatMap((slot) => {
    const table = tables.find((item) => item.id === selection[slot.key]);
    if (!table) return [];
    const title = normalize(table.title ?? "");
    const explicitCodes = title.match(/\b(?:0207|1602|1607)\b/g) ?? [];
    const expectedCode = slot.code.slice(2);
    const wrongCode = explicitCodes.some((code) => code !== expectedCode);
    const wrongRegion = slot.region === "UE" ? /\bpoza ue\b/.test(title) : /\b(?:w ramach|do) ue\b/.test(title) && !/\bpoza ue\b/.test(title);
    return wrongCode || wrongRegion ? [`${slot.label}: tytuł tabeli ${table.id} brzmi „${table.title}”. Potwierdź przypisanie mimo rozbieżności.`] : [];
  });
}

function periodWarning(period: string, bulletinId: string) {
  const months = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const match = period.match(/^\s*(?:(?:I{1,3}|IV|VI{0,3}|IX|XI{0,2})\s*[-–—]\s*)?(I{1,3}|IV|VI{0,3}|IX|XI{0,2})\s*[./]\s*(\d{4})\b/i);
  if (!match) return `Nie można ustalić miesiąca końcowego okresu mapy „${period}”.`;
  const dataMonth = Number(match[2]) * 12 + months.indexOf(match[1].toUpperCase()) + 1;
  const editionMonth = Number(bulletinId.slice(0, 4)) * 12 + Number(bulletinId.slice(5, 7));
  const lag = editionMonth - dataMonth;
  if (lag < 0) return `Okres danych mapy „${period}” wykracza poza miesiąc wydania ${bulletinId}.`;
  if (lag > 1) return `Okres danych mapy „${period}” kończy się wcześniej niż miesiąc poprzedzający wydanie ${bulletinId}.`;
  return null;
}

export function exportMapPeriodWarning(tables: PreparedBulletinTable[], selection: ExportMapTableSelection, bulletinId: string) {
  const ids = EXPORT_MAP_SLOTS.map((slot) => selection[slot.key]);
  if (ids.some((id) => !id) || new Set(ids).size !== 4) return null;
  const periods = ids.map((id) => {
    const table = tables.find((item) => item.id === id);
    const headerIndex = table?.rows.findIndex((row) => row.some((cell) => /kraj\s+przeznaczenia/i.test(cell))) ?? -1;
    const period = headerIndex < 0 ? undefined : table?.rows.slice(0, headerIndex + 2).flat().find((cell) => /za\s+okres/i.test(cell));
    return period?.replace(/^\s*za\s+okres\s*:\s*/i, "").trim();
  });
  if (periods.some((period) => !period) || new Set(periods).size !== 1) return null;
  return periodWarning(periods[0]!, bulletinId);
}

export function buildExportMapData(tables: PreparedBulletinTable[], selection: ExportMapTableSelection, bulletinId?: string): ExportMapData {
  const ids = EXPORT_MAP_SLOTS.map((slot) => selection[slot.key]);
  if (ids.some((id) => !id) || new Set(ids).size !== 4) throw new Error("Wybierz cztery różne tabele eksportowe.");
  if (exportMapTitleWarnings(tables, selection).length && !selection.confirmedTitleMismatch) throw new Error("Potwierdź rozbieżności tytułów wybranych tabel.");
  const countries = new Map<string, ExportMapCountry>();
  const periods = new Set<string>();

  for (const slot of EXPORT_MAP_SLOTS) {
    const table = tables.find((item) => item.id === selection[slot.key]);
    if (!table) throw new Error(`Nie znaleziono tabeli ${selection[slot.key]} (${slot.label}).`);
    const columns = headerColumns(table);
    const period = table.rows.slice(0, columns.firstDataRow).flat().find((cell) => /za\s+okres/i.test(cell));
    if (!period) throw new Error(`Tabela ${table.id} nie zawiera okresu danych.`);
    periods.add(period.replace(/^\s*za\s+okres\s*:\s*/i, "").trim());
    let rows = 0;
    for (const row of table.rows.slice(columns.firstDataRow)) {
      if (!/^\s*\d+[.)]?\s*$/.test(row[0] ?? "")) continue;
      const sourceName = row[columns.country] ?? "";
      const resolved = countryCode(sourceName);
      if (!resolved.iso3) throw new Error(`Tabela ${table.id}: nie rozpoznano państwa „${sourceName}”. Popraw nazwę w dokumencie przed publikacją.`);
      const country = countries.get(resolved.iso3) ?? { iso3: resolved.iso3, name: resolved.name, region: slot.region, records: {} };
      if (country.region !== slot.region) throw new Error(`Państwo „${sourceName}” występuje zarówno w tabelach UE, jak i poza UE.`);
      if (country.records[slot.code]) throw new Error(`Tabela ${table.id}: powtórzony rekord państwa „${sourceName}”.`);
      country.records[slot.code] = {
        netMassKg: numberCell(row[columns.netMassKg] ?? "", "masa netto"),
        valuePln: numberCell(row[columns.valuePln] ?? "", "wartość PLN"),
        valueUsd: numberCell(row[columns.valueUsd] ?? "", "wartość USD"),
        valueEur: numberCell(row[columns.valueEur] ?? "", "wartość EUR"),
        shareKg: numberCell(row[columns.shareKg] ?? "", "udział kg"),
        shareEur: numberCell(row[columns.shareEur] ?? "", "udział EUR"),
        sourceTable: table.id,
      };
      countries.set(country.iso3, country);
      rows++;
    }
    if (!rows) throw new Error(`Tabela ${table.id} nie zawiera rekordów państw.`);
  }
  if (periods.size !== 1) throw new Error("Wybrane tabele dotyczą różnych okresów danych.");
  const period = [...periods][0];
  const warning = bulletinId ? periodWarning(period, bulletinId) : null;
  if (warning && !selection.confirmedPeriodMismatch) throw new Error(`${warning} Potwierdź okres danych po sprawdzeniu DOCX.`);
  return { period, countries: [...countries.values()] };
}
