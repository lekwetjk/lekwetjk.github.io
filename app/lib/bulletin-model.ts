export type BulletinSourceSheet = {
  workbook: string;
  name: string;
  rows: unknown[][];
};

export type BulletinIndicator = {
  indicator: string;
  category: string;
  year: number;
  period: string;
  value: number;
  unit: string;
  source: string;
  sheet: string;
  cell: string;
  scope: string;
};

export type BulletinSeries = {
  label: string;
  unit: string;
  note: string;
  points: [string, number][];
};

export type BulletinTradeRow = {
  month: number;
  code: string;
  country: string;
  market: "UE" | "Poza UE";
  direction: "Eksport" | "Import";
  group: string;
  description: string;
  kg: number;
  eur: number;
  source: string;
  sheet: string;
  first: number;
  last: number;
};

export type BulletinMetric = {
  name: string;
  value: number;
  previous?: number;
  annual?: number;
};

export type BulletinSpecies = {
  name: string;
  kg: number;
  eur: number;
  ue: number;
};

export type BulletinCountry = {
  name: string;
  kg: number;
  eur: number;
};

export type BulletinModel = {
  indicators: BulletinIndicator[];
  series: BulletinSeries[];
  trade: BulletinTradeRow[];
  species: BulletinSpecies[];
  countries: BulletinCountry[];
  feed: BulletinMetric[];
  eggs: BulletinMetric[];
  summary: {
    latestProduction: number | null;
    latestProductionYear: number | null;
    exportKg: number;
    exportEur: number;
    euShare: number | null;
  };
};

const MONTHS_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const REQUIRED_SECTIONS = [
  ["production", "produkcja"],
  ["prices", "ceny skupu i sprzedaży"],
  ["hatcheries", "wylęgi"],
  ["species", "handel według gatunków"],
  ["trade", "handel szczegółowy"],
  ["feed", "pasze"],
  ["poultry", "tygodniowe ceny drobiu"],
  ["eggs", "jaja"],
] as const;

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizedName(value: string) {
  return value.toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, " ").trim();
}

function hasWords(value: string, words: string[]) {
  const normalized = normalizedName(value);
  return words.every((word) => normalized.includes(normalizedName(word)));
}

function columnIndex(column: string) {
  return [...column].reduce((result, character) => result * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function valueAt(sheet: BulletinSourceSheet, row: number, column: string) {
  return sheet.rows[row - 1]?.[columnIndex(column)];
}

function sheetNameIs(sheet: BulletinSourceSheet, expected: string) {
  return normalizedName(sheet.name) === normalizedName(expected);
}

function weekFromWorkbook(workbook: string) {
  return Number(workbook.match(/(?:^|[^0-9])(\d{1,2})[_ .-]+20\d{2}(?:[^0-9]|$)/)?.[1]) || null;
}

function cellAddress(column: string, row: number) {
  return `${column}${row}`;
}

export function shouldCollectBulletinSourceSheet(workbook: string, sheetName: string) {
  const normalizedSheet = normalizedName(sheetName);
  return (
    (hasWords(workbook, ["produkcja", "inflacja"]) && normalizedSheet === "arkusz1") ||
    normalizedSheet.startsWith("ceny m ne tuszka skup sprze") ||
    normalizedSheet.startsWith("cen sprzed tuszka kurc file ind") ||
    normalizedSheet.startsWith("wylegi") ||
    (hasWords(workbook, ["gatunki", "drobiu"]) && normalizedSheet === "tabela") ||
    normalizedSheet === "drob pl" ||
    normalizedSheet === "skup drobiu polska" ||
    normalizedSheet.startsWith("sprzedaz z pakowania") ||
    ["eksport 0207", "eksport 1602", "import 0207", "import 1602"].includes(normalizedSheet)
  );
}

export function buildBulletinModel(sheets: BulletinSourceSheet[], reportYear: number, reportMonth: number): BulletinModel {
  const indicators: BulletinIndicator[] = [];
  const series: BulletinSeries[] = [];
  const trade: BulletinTradeRow[] = [];
  const species: BulletinSpecies[] = [];
  const feed: BulletinMetric[] = [];
  const eggs: BulletinMetric[] = [];

  function addIndicator(
    sheet: BulletinSourceSheet,
    cell: string,
    indicator: string,
    category: string,
    year: number,
    period: string,
    value: unknown,
    unit: string,
    scope: string,
  ) {
    const numericValue = number(value);
    if (numericValue === null) return;
    indicators.push({ indicator, category, year, period, value: numericValue, unit, source: sheet.workbook, sheet: sheet.name, cell, scope });
  }

  const production = sheets.find((sheet) => hasWords(sheet.workbook, ["produkcja", "inflacja"]) && sheetNameIs(sheet, "Arkusz1"));
  if (production) {
    const points: [string, number][] = [];
    const header = production.rows[3] ?? [];
    for (let index = 1; index < header.length; index += 1) {
      const year = Number.parseInt(text(header[index]).slice(0, 4), 10);
      const productionValue = number(production.rows[4]?.[index]);
      if (!Number.isInteger(year) || productionValue === null) continue;
      const column = String.fromCharCode(65 + index);
      addIndicator(production, cellAddress(column, 5), "Produkcja mięsa drobiowego (10+ osób)", "Produkcja", year, String(year), productionValue, "tys. t", "GUS; najnowszy rok może być oznaczony jako dane wstępne");
      points.push([String(year), productionValue]);
    }
    if (points.length) series.push({ label: "Produkcja roczna — zakłady 10+ osób", unit: "tys. t", points, note: "GUS; produkcja mięsa drobiowego w zakładach zatrudniających co najmniej 10 osób." });
  }

  const priceConfigs: [string, [string, string[]][]][] = [
    ["CENY m-ne TUSZKA skup sprze (2)", [
      ["Kurczęta — skup", ["B", "C", "D", "E", "F"]],
      ["Kurczęta — sprzedaż tuszki", ["G", "H", "I", "J", "K"]],
      ["Indyki — skup", ["M", "N", "O", "P", "Q"]],
      ["Indyki — sprzedaż tuszki", ["R", "S", "T", "U", "V"]],
    ]],
    ["Cen.sprzed TUSZKA kurc file ind", [
      ["Kurczak — filet z piersi", ["G", "H", "I", "J", "K"]],
      ["Indyk — filet z piersi", ["R", "S", "T", "U", "V"]],
    ]],
  ];
  for (const [sheetName, groups] of priceConfigs) {
    const priceSheet = sheets.find((sheet) => sheetNameIs(sheet, sheetName));
    if (!priceSheet) continue;
    for (const [label, columns] of groups) {
      columns.forEach((column, yearOffset) => {
        const year = reportYear - yearOffset;
        const points: [string, number][] = [];
        for (let row = 6; row <= 17; row += 1) {
          const month = row - 5;
          const currentValue = number(valueAt(priceSheet, row, column));
          if (currentValue === null || currentValue <= 0) continue;
          addIndicator(priceSheet, cellAddress(column, row), label, "Ceny", year, `${MONTHS_ROMAN[month - 1]} ${year}`, currentValue, "zł/kg", "MRiRW; średnia miesięczna");
          points.push([MONTHS_ROMAN[month - 1] ?? String(month), currentValue]);
        }
        if (points.length) series.push({ label: `${label} — ${year}`, unit: "zł/kg", points, note: "MRiRW; średnie miesięczne. Brakujących notowań nie zastępuje się zerem." });
      });
    }
  }

  for (const hatchery of sheets.filter((sheet) => normalizedName(sheet.name).startsWith("wylegi"))) {
    const label = text(valueAt(hatchery, 1, "A")) || hatchery.name;
    const unit = hatchery.name.includes("brojler") ? "mln szt." : "tys. szt.";
    const header = hatchery.rows[3] ?? [];
    for (let index = 0; index < header.length; index += 1) {
      const yearValue = number(header[index]);
      if (yearValue === null || yearValue < 2019 || yearValue > reportYear) continue;
      const column = String.fromCharCode(65 + index);
      const points: [string, number][] = [];
      for (let row = 6; row <= 17; row += 1) {
        const month = row - 5;
        const currentValue = number(valueAt(hatchery, row, column));
        if (currentValue === null) continue;
        addIndicator(hatchery, cellAddress(column, row), label, "Wylęgi", yearValue, `${MONTHS_ROMAN[month - 1]} ${yearValue}`, currentValue, unit, "Eurostat; symbole w arkuszu oznaczają brak dostępnej wartości");
        points.push([MONTHS_ROMAN[month - 1] ?? String(month), currentValue]);
      }
      if (yearValue >= reportYear - 2 && points.length) series.push({ label: `${label} — ${yearValue}`, unit, points, note: "Eurostat; zakres dostępnych miesięcy pozostaje zgodny z arkuszem źródłowym." });
    }
  }

  const speciesSheet = sheets.find((sheet) => hasWords(sheet.workbook, ["gatunki", "drobiu"]) && sheetNameIs(sheet, "tabela"));
  if (speciesSheet) {
    const tradePeriod = MONTHS_ROMAN[Math.max(1, reportMonth - 1) - 1];
    for (const column of ["C", "D", "E", "F", "G"]) {
      const name = text(valueAt(speciesSheet, 4, column));
      const kg = number(valueAt(speciesSheet, 5, column));
      const eur = number(valueAt(speciesSheet, 9, column));
      const ue = number(valueAt(speciesSheet, 11, column));
      if (!name || kg === null || eur === null || ue === null) continue;
      species.push({ name, kg, eur, ue });
      addIndicator(speciesSheet, cellAddress(column, 5), `Eksport CN 0207 — masa — ${name}`, "Handel", reportYear, `I–${tradePeriod} ${reportYear}`, kg, "kg", "Dane wstępne; mięso i podroby; CN 0207");
      addIndicator(speciesSheet, cellAddress(column, 9), `Eksport CN 0207 — wartość — ${name}`, "Handel", reportYear, `I–${tradePeriod} ${reportYear}`, eur, "EUR", "Dane wstępne; mięso i podroby; CN 0207");
    }
  }

  const feedSheet = sheets.find((sheet) => sheetNameIs(sheet, "DRÓB PL"));
  if (feedSheet) {
    for (let row = 9; row <= 17; row += 1) {
      const current = number(valueAt(feedSheet, row, "D"));
      const name = text(valueAt(feedSheet, row, "B"));
      if (!name || current === null) continue;
      const previous = number(valueAt(feedSheet, row, "E")) ?? undefined;
      const annual = number(valueAt(feedSheet, row, "F")) ?? undefined;
      feed.push({ name, value: current, previous, annual });
      addIndicator(feedSheet, cellAddress("D", row), name, "Pasze", reportYear, `${MONTHS_ROMAN[reportMonth - 1]} ${reportYear}`, current, "zł/t", "MRiRW; średnia cena sprzedaży pasz");
    }
  }

  const poultrySheet = sheets.find((sheet) => sheetNameIs(sheet, "SKUP DROBIU POLSKA"));
  if (poultrySheet) {
    const week = weekFromWorkbook(poultrySheet.workbook);
    for (let row = 8; row <= 14; row += 1) {
      const name = text(valueAt(poultrySheet, row, "B"));
      if (name) addIndicator(poultrySheet, cellAddress("C", row), `Skup — ${name}`, "Ceny tygodniowe", reportYear, week ? `tydzień ${week} / ${reportYear}` : `${MONTHS_ROMAN[reportMonth - 1]} ${reportYear}`, valueAt(poultrySheet, row, "C"), "zł/t", "MRiRW; cena skupu netto");
    }
  }

  const eggSheet = sheets.find((sheet) => normalizedName(sheet.name).startsWith("sprzedaz z pakowania"));
  if (eggSheet) {
    const week = weekFromWorkbook(eggSheet.workbook);
    let system = "";
    for (let row = 9; row <= 24; row += 1) {
      system = text(valueAt(eggSheet, row, "B")) || system;
      const size = text(valueAt(eggSheet, row, "C"));
      const current = number(valueAt(eggSheet, row, "D"));
      if (!system || !["XL", "L", "M", "S"].includes(size) || current === null) continue;
      const name = `${system} / ${size}`;
      eggs.push({ name, value: current, previous: number(valueAt(eggSheet, row, "E")) ?? undefined, annual: number(valueAt(eggSheet, row, "F")) ?? undefined });
      addIndicator(eggSheet, cellAddress("D", row), `Jaja — ${name}`, "Jaja", reportYear, week ? `tydzień ${week} / ${reportYear}` : `${MONTHS_ROMAN[reportMonth - 1]} ${reportYear}`, current, "zł/100 szt.", "MRiRW; ceny sprzedaży z zakładów pakowania");
    }
  }

  const tradeConfigs: [string, string, string][] = [
    ["EKSPORT 0207", "H", "K"],
    ["EKSPORT 1602", "G", "J"],
    ["IMPORT 0207", "J", "M"],
    ["IMPORT 1602", "J", "M"],
  ];
  for (const [sheetName, massColumn, valueColumn] of tradeConfigs) {
    const tradeSheet = sheets.find((sheet) => sheetNameIs(sheet, sheetName));
    if (!tradeSheet) continue;
    const aggregated = new Map<string, BulletinTradeRow>();
    tradeSheet.rows.forEach((row, index) => {
      const period = text(row[0]);
      const code = text(row[1]);
      const kg = number(row[columnIndex(massColumn)]);
      const eur = number(row[columnIndex(valueColumn)]);
      if (!/^0[1-9]-\d{2}$/.test(period) || !/^\d{8}$/.test(code) || kg === null || eur === null) return;
      const month = Number(period.slice(0, 2));
      const country = text(row[3]);
      const market = text(row[5]) === "UE" ? "UE" : "Poza UE";
      const key = [month, code, country, market].join("|");
      const existing = aggregated.get(key);
      if (existing) {
        existing.kg += kg;
        existing.eur += eur;
        existing.last = index + 1;
      } else {
        aggregated.set(key, {
          month,
          code,
          country,
          market,
          direction: sheetName.startsWith("EKSPORT") ? "Eksport" : "Import",
          group: sheetName.split(" ")[1] ?? "",
          description: text(row[2]),
          kg,
          eur,
          source: tradeSheet.workbook,
          sheet: tradeSheet.name,
          first: index + 1,
          last: index + 1,
        });
      }
    });
    trade.push(...aggregated.values());
  }

  const countryMap = new Map<string, BulletinCountry>();
  for (const row of trade.filter((item) => item.direction === "Eksport" && item.group === "0207")) {
    const country = countryMap.get(row.country) ?? { name: row.country, kg: 0, eur: 0 };
    country.kg += row.kg;
    country.eur += row.eur;
    countryMap.set(row.country, country);
  }

  const productionPoints = series.find((item) => item.label === "Produkcja roczna — zakłady 10+ osób")?.points ?? [];
  const latestProduction = productionPoints.at(-1);
  const exportKg = species.reduce((sum, item) => sum + item.kg, 0) || trade.filter((item) => item.direction === "Eksport" && item.group === "0207").reduce((sum, item) => sum + item.kg, 0);
  const exportEur = species.reduce((sum, item) => sum + item.eur, 0) || trade.filter((item) => item.direction === "Eksport" && item.group === "0207").reduce((sum, item) => sum + item.eur, 0);
  const ueKg = species.reduce((sum, item) => sum + item.ue, 0);

  return {
    indicators,
    series,
    trade,
    species,
    countries: [...countryMap.values()].sort((left, right) => right.kg - left.kg),
    feed,
    eggs,
    summary: {
      latestProduction: latestProduction?.[1] ?? null,
      latestProductionYear: latestProduction ? Number(latestProduction[0]) : null,
      exportKg,
      exportEur,
      euShare: exportKg && ueKg ? ueKg / exportKg * 100 : null,
    },
  };
}

export function getMissingBulletinSections(model: BulletinModel) {
  const present = {
    production: model.summary.latestProduction !== null,
    prices: model.indicators.some((item) => item.category === "Ceny"),
    hatcheries: model.indicators.some((item) => item.category === "Wylęgi"),
    species: model.species.length > 0,
    trade: model.trade.length > 0 && model.countries.length > 0,
    feed: model.feed.length > 0,
    poultry: model.indicators.some((item) => item.category === "Ceny tygodniowe"),
    eggs: model.eggs.length > 0,
  };
  return REQUIRED_SECTIONS.filter(([key]) => !present[key]).map(([, label]) => label);
}