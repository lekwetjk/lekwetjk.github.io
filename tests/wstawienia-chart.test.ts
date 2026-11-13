import assert from "node:assert/strict";
import test from "node:test";

import { buildWstawieniaChartSeries } from "../app/lib/wstawienia-chart.ts";

const monthlyIndexes = [0, 1, 2, 5, 6, 7, 12, 13, 14, 17, 18, 19];

function row(year: string, months: number[]) {
  const values = Array(26).fill("");
  months.forEach((value, index) => { values[monthlyIndexes[index]] = String(value); });
  if (months.length === 12) values[24] = String(months.reduce((sum, value) => sum + value, 0));
  return { year, values };
}

test("incomplete placement years use the sum of available months", () => {
  const series = buildWstawieniaChartSeries([
    row("2025", Array(12).fill(100)),
    row("2026", [110, 120, 130]),
  ]);

  assert.deepEqual(series.yearly.at(-1), {
    year: "2026",
    total: 360,
    isPartialYear: true,
    comparedMonths: 3,
  });
  assert.deepEqual(series.dynamics.at(-1), {
    year: "2026",
    dynamics: 120,
    isPartial: true,
    comparedMonths: 3,
  });
});

test("complete placement years retain their annual total", () => {
  const series = buildWstawieniaChartSeries([row("2026", Array(12).fill(100))]);
  assert.deepEqual(series.yearly[0], {
    year: "2026",
    total: 1200,
    isPartialYear: false,
    comparedMonths: 12,
  });
});