import assert from "node:assert/strict";
import test from "node:test";
import { getBulletinHighlights } from "../app/lib/bulletin-highlights.ts";
import type { PreparedBulletin, PreparedBulletinChart } from "../app/lib/prepared-bulletin-model.ts";

function bulletin(charts: PreparedBulletinChart[], id = "2026-04-05"): PreparedBulletin {
  return { id, period: "kwiecień–maj 2026", title: "", sections: [], charts, tables: [], stats: { charts: charts.length, tables: 0, paragraphs: 0, numericCells: 0 } };
}

function chart(overrides: Partial<PreparedBulletinChart> = {}): PreparedBulletinChart {
  return {
    id: "chart-1", title: "", section: "Handel zagraniczny", kind: "line",
    categories: ["I", "II", "III", "IV"],
    series: [{ name: "2026", values: [0.562, 0.565, 0.55, 0.533] }],
    metric: { label: "Udział eksportu w produkcji mięsa drobiowego", description: "Opis zakresu danych", unit: "%", format: "percent" },
    ...overrides,
  };
}

test("export share is displayed as 53.3 percent with indicator, unit and period", () => {
  const [metric] = getBulletinHighlights(bulletin([chart()]));
  assert.equal(metric.displayValue, "53,3");
  assert.equal(metric.unit, "%");
  assert.equal(metric.label, "Udział eksportu w produkcji mięsa drobiowego");
  assert.equal(metric.description, "Opis zakresu danych");
  assert.equal(metric.period, "IV · 2026");
});

test("trade totals show the covered months and preliminary flag without multiplying kilograms", () => {
  const [metric] = getBulletinHighlights(bulletin([chart({
    categories: ["I", "II", "III", "IV", "V", "Łącznie"],
    series: [{ name: "2026*", values: [10, 20, 30, 40, null, 100] }],
    metric: { label: "Import", description: "Masa netto", unit: "kg", format: "number" },
  })]));
  assert.equal(metric.displayValue, "100");
  assert.equal(metric.period, "I–IV · 2026* (narastająco)");
  assert.equal(metric.unit, "kg");
  assert.equal(metric.preliminary, true);
});

test("weekly prices preserve three decimals and do not display a month label", () => {
  const [metric] = getBulletinHighlights(bulletin([chart({
    categories: ["5", "6"],
    series: [{ name: "2026", values: [4.85, 4.893] }],
    metric: { label: "Cena skupu kurcząt", description: "Cena tygodniowa", unit: "zł/kg", format: "number" },
  })]));
  assert.equal(metric.displayValue, "4,893");
  assert.equal(metric.period, "6 · 2026");
});

test("summary uses the edition year, ignores missing points and keeps zero", () => {
  const [metric] = getBulletinHighlights(bulletin([chart({
    series: [{ name: "2026", values: [1, 1, 1, 1] }, { name: "2027*", values: [0.1, 0, null, null] }],
  })], "2027-03"));
  assert.equal(metric.displayValue, "0");
  assert.equal(metric.period, "II · 2027*");
});

test("missing units are explicit and a missing value is not replaced with zero", () => {
  const [metric] = getBulletinHighlights(bulletin([chart({
    title: "Nowy wskaźnik", metric: undefined,
    series: [{ name: "2026", values: [null, null, null, null] }],
  })]));
  assert.equal(metric.label, "Nowy wskaźnik");
  assert.equal(metric.unit, "Jednostka niepodana w modelu");
  assert.equal(metric.displayValue, "-");
});

test("historical range is removed only from the second through fourth highlight", () => {
  const charts = Array.from({ length: 4 }, (_, index) => chart({
    id: `chart-${index + 1}`,
    title: `Wskaźnik ${index + 1} w latach 2021 - 2026`,
    metric: undefined,
  }));

  const highlights = getBulletinHighlights(bulletin(charts));

  assert.equal(highlights[0].label, "Wskaźnik 1 w latach 2021 - 2026");
  assert.deepEqual(highlights.slice(1).map((metric) => metric.label), [
    "Wskaźnik 2",
    "Wskaźnik 3",
    "Wskaźnik 4",
  ]);
});
