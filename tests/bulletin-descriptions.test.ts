import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { describePreparedCharts } from "../app/lib/bulletin-chart-descriptions.ts";
import { validatePreparedBulletin, type PreparedBulletin } from "../app/lib/prepared-bulletin-model.ts";

const directory = path.join(process.cwd(), "app", "data", "bulletins");
const editions = await Promise.all((await readdir(directory))
  .filter((name) => /^2026-.*\.json$/.test(name))
  .map(async (name) => JSON.parse(await readFile(path.join(directory, name), "utf8")) as PreparedBulletin));

test("every chart in all built-in editions has a specific title and short description without changing its data", () => {
  let total = 0;
  for (const edition of editions) {
    const described = describePreparedCharts(edition.id, edition.charts);
    assert.equal(described.length, edition.charts.length);
    described.forEach((chart, index) => {
      assert.ok(chart.title.length > 20, `${edition.id}/${chart.id}`);
      assert.ok(!["miesiące", "rok", "okres", "%", chart.section].includes(chart.title));
      assert.ok(chart.description.length >= 30 && chart.description.length <= 180, `${edition.id}/${chart.id}`);
      assert.equal(chart.id, edition.charts[index].id);
      assert.strictEqual(chart.series, edition.charts[index].series);
      assert.strictEqual(chart.categories, edition.charts[index].categories);
      total += 1;
    });
  }
  assert.equal(total, 176);
});

test("chart numbering shifts do not change the subject of descriptions", () => {
  for (const edition of editions) {
    const charts = describePreparedCharts(edition.id, edition.charts);
    assert.match(charts[0].title, /Miesięczna produkcja/);
    assert.ok(charts[0].title.endsWith(edition.id === "2026-01" ? "2023–2025" : "2023–2026"));
    assert.match(charts[2].title, /co najmniej 10|Globalna produkcja/);
    const early = edition.id === "2026-01" || edition.id === "2026-02";
    assert.match(charts[early ? 4 : 5].title, /tuszki kurczaka 65%/);
    assert.match(charts[early ? 9 : 10].title, /import mięsa/);
    if (early) assert.match(charts[23].title, /Tygodniowe ceny skupu/);
    else assert.match(charts[charts.length - 1].title, /według gatunków/);
  }
});

test("pie charts preserve their actual reporting period, including the previous quarter", () => {
  const edition = editions.find((item) => item.id === "2026-04-05")!;
  const charts = describePreparedCharts(edition.id, edition.charts);
  assert.match(charts[15].title, /I-IV\.2026$/);
  assert.match(charts[17].title, /I-III\.2026$/);
  assert.match(charts[16].description, /wartości.*EUR/);
  assert.match(charts[15].description, /masie netto/);
});

test("unknown chart layouts fail explicitly instead of attaching incorrect descriptions", () => {
  const edition = editions[0];
  assert.throws(() => describePreparedCharts(edition.id, edition.charts.slice(1)), /Niekompletne opisy/);
  assert.throws(() => describePreparedCharts(edition.id, edition.charts.map((chart, index) => index ? chart : { ...chart, id: "unknown" })), /Nieznany identyfikator/);
});

test("imported models preserve descriptions, accept legacy models and reject blank metadata", () => {
  const edition = structuredClone(editions.find((item) => item.id === "2026-01")!);
  assert.equal(validatePreparedBulletin(edition), edition);
  edition.charts[0].description = "Miesięczna produkcja mięsa drobiowego w tysiącach ton.";
  edition.tables[0].title = "Produkcja mięsa drobiowego według miesięcy";
  edition.tables[0].description = "Porównanie wielkości produkcji w kolejnych miesiącach i latach.";
  assert.equal(validatePreparedBulletin(edition).tables[0].title, edition.tables[0].title);
  assert.throws(() => validatePreparedBulletin({
    ...edition, charts: [{ ...edition.charts[0], description: " " }, ...edition.charts.slice(1)],
  }), /poprawnego opisu/);
  assert.throws(() => validatePreparedBulletin({
    ...edition, tables: [{ ...edition.tables[0], title: "" }, ...edition.tables.slice(1)],
  }), /poprawnego tytułu lub opisu/);
  assert.throws(() => validatePreparedBulletin({
    ...edition, tables: [{ ...edition.tables[0], description: 42 }, ...edition.tables.slice(1)],
  }), /poprawnego tytułu lub opisu/);
});

test("every built-in table has an individual title and short description with exact ID coverage", async () => {
  const descriptions: Record<string, Record<string, { title: string; description: string }>> =
    JSON.parse(await readFile(path.join(directory, "table-descriptions.json"), "utf8"));
  let total = 0;
  for (const edition of editions) {
    const metadata = descriptions[edition.id];
    assert.ok(metadata, edition.id);
    assert.deepEqual(Object.keys(metadata).sort(), edition.tables.map((table) => table.id).sort());
    for (const table of edition.tables) {
      const description = metadata[table.id];
      assert.ok(description.title.trim().length > 15, `${edition.id}/${table.id}`);
      assert.notEqual(description.title, table.section);
      assert.ok(description.description.trim().length >= 20 && description.description.length <= 200, `${edition.id}/${table.id}`);
      total += 1;
    }
  }
  assert.equal(total, 541);
});
