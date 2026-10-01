import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBulletinModel,
  getMissingBulletinSections,
  shouldCollectBulletinSourceSheet,
  type BulletinModel,
  type BulletinSourceSheet,
} from "../app/lib/bulletin-model.ts";

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