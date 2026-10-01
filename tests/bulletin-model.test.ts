import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBulletinModel,
  getMissingBulletinSections,
  shouldCollectBulletinSourceSheet,
  type BulletinModel,
  type BulletinSourceSheet,
} from "../app/lib/bulletin-model.ts";
import { BULLETIN_CHAPTERS, documentContainsBulletinValue, matchingBulletinChapterIds } from "../app/lib/bulletin-chapters.ts";

test("monthly bulletin sources are recognized by semantic sheet names", () => {
  assert.equal(shouldCollectBulletinSourceSheet("KRD_VIII_2026.xlsx", "EKSPORT 0207"), true);
  assert.equal(shouldCollectBulletinSourceSheet("handel-wrzesien.xlsx", "IMPORT 1602"), true);
  assert.equal(shouldCollectBulletinSourceSheet("Pasze 9-2026.xlsx", "DRÓB PL"), true);
  assert.equal(shouldCollectBulletinSourceSheet("Jaja 41-2026.xlsx", "SPRZEDAŻ-Z. PAKOWANIA"), true);
  assert.equal(shouldCollectBulletinSourceSheet("Produkcja i inflacja 2026.xlsx", "Arkusz1"), true);
  assert.equal(shouldCollectBulletinSourceSheet("dowolny.xlsx", "Arkusz1"), false);
});

test("report month and source week determine generated periods", () => {
  const speciesRows = Array.from({ length: 11 }, () => Array<unknown>(7).fill(null));
  speciesRows[3][2] = "Kurczęta";
  speciesRows[4][2] = 100;
  speciesRows[8][2] = 200;
  speciesRows[10][2] = 70;

  const poultryRows = Array.from({ length: 14 }, () => Array<unknown>(3).fill(null));
  poultryRows[7][1] = "Kurczęta brojlery";
  poultryRows[7][2] = 5_000;

  const sheets: BulletinSourceSheet[] = [
    { workbook: "Gatunki drobiu I-VIII.2026.xlsx", name: "tabela", rows: speciesRows },
    { workbook: "4.drób 41_2026.xlsx", name: "SKUP DROBIU POLSKA", rows: poultryRows },
  ];
  const model = buildBulletinModel(sheets, 2026, 9);

  assert.equal(model.indicators.find((item) => item.category === "Handel")?.period, "I–VIII 2026");
  assert.equal(model.indicators.find((item) => item.category === "Ceny tygodniowe")?.period, "tydzień 41 / 2026");
});

test("incomplete bulletin models identify every missing publication section", () => {
  const model: BulletinModel = {
    indicators: [],
    series: [],
    trade: [],
    species: [],
    countries: [],
    feed: [],
    eggs: [],
    summary: { latestProduction: null, latestProductionYear: null, exportKg: 0, exportEur: 0, euShare: null },
  };

  assert.deepEqual(getMissingBulletinSections(model), [
    "produkcja",
    "ceny skupu i sprzedaży",
    "wylęgi",
    "handel według gatunków",
    "handel szczegółowy",
    "pasze",
    "tygodniowe ceny drobiu",
    "jaja",
  ]);
});

test("egg prices are recognized despite a renamed sheet and shifted columns", () => {
  const rows = Array.from({ length: 8 }, () => Array<unknown>(8).fill(null));
  rows[3][3] = "Klatkowy";
  rows[3][4] = "L";
  rows[3][5] = 72.4;
  rows[3][6] = 71.8;
  rows[3][7] = 75.1;
  rows[4][4] = "M";
  rows[4][5] = 53.2;
  const sheet = { workbook: "jaja-41_2026.xlsx", name: "Ceny jaj z pakowni", rows };

  assert.equal(shouldCollectBulletinSourceSheet(sheet.workbook, sheet.name), true);
  const model = buildBulletinModel([sheet], 2026, 10);
  assert.deepEqual(model.eggs, [
    { name: "Klatkowy / L", value: 72.4, previous: 71.8, annual: 75.1 },
    { name: "Klatkowy / M", value: 53.2, previous: undefined, annual: undefined },
  ]);
  assert.equal(model.indicators.find((item) => item.category === "Jaja")?.cell, "F4");
});

test("chapter registry covers every authored bulletin chapter and source family", () => {
  assert.equal(BULLETIN_CHAPTERS.length, 20);
  assert.deepEqual(matchingBulletinChapterIds("KRD_VIII_2026.xlsx", "EKSPORT 0105"), ["live-export"]);
  assert.ok(matchingBulletinChapterIds("Dane z Eurostat wylegi.xlsx", "Wykorzystanie piskląt w 2026").includes("turkey-placements"));
  assert.ok(matchingBulletinChapterIds("4.drob-41_2026.xlsx", "UE (KRAJE) MIESIĘCZNIE").includes("eu-market"));
});

test("geographic chapters use their dedicated current and historical sheets", () => {
  const sheets: BulletinSourceSheet[] = [
    { workbook: "Kierunki geograficzne I-VII.2026.xlsx", name: "Arkusz1", rows: [[], [], [], [], [], [1, "Niemcy", 197_101_004, null, null, 685_240_447]] },
    { workbook: "Kierunki geograficzne I-VII.2026.xlsx", name: "Arkusz2", rows: [["Europa", 80], ["Azja", 12]] },
    { workbook: "Główne kierunki exportowe porównanie lat.xlsx", name: "Arkusz1", rows: [[], [], [], [], [], [1, "Niemcy", 2025, "UE", 340_382_509, null, null, 1_292_556_092], [null, null, 2026, null, 350_000_000, null, null, 1_350_000_000]] },
  ];
  const model = buildBulletinModel(sheets, 2026, 8);

  assert.deepEqual(model.geography, [{ name: "Niemcy", kg: 197_101_004, eur: 685_240_447 }]);
  assert.deepEqual(model.mainDirections, [
    { name: "Niemcy", year: 2025, kg: 340_382_509, eur: 1_292_556_092 },
    { name: "Niemcy", year: 2026, kg: 350_000_000, eur: 1_350_000_000 },
  ]);
  assert.equal(model.chapters?.find((chapter) => chapter.id === "continents")?.count, 2);
});

test("document validation accepts Polish grouping, decimal commas and scaled values", () => {
  const documentText = "Produkcja 3 743 tys. ton; eksport 1 009 267,02 tys. kg; cena 85,31 zł.";
  assert.equal(documentContainsBulletinValue(documentText, 3743), true);
  assert.equal(documentContainsBulletinValue(documentText, 1_009_267_020), true);
  assert.equal(documentContainsBulletinValue(documentText, 85.31), true);
  assert.equal(documentContainsBulletinValue("Wartość pomocnicza: 85.", 85.31), false);
  assert.equal(documentContainsBulletinValue(documentText, 999_999), false);
});