export type WstawieniaChartRow = { year: string; values: string[] };

export type WstawieniaYearPoint = {
  year: string;
  total: number;
  isPartialYear: boolean;
  comparedMonths: number;
};

export type WstawieniaDynamicsPoint = {
  year: string;
  dynamics: number;
  isPartial: boolean;
  comparedMonths: number;
};

const MONTHLY_INDEXES = [0, 1, 2, 5, 6, 7, 12, 13, 14, 17, 18, 19];

function parsePolishNumber(value: string) {
  const normalized = value.trim().replace(/\*/g, "").replace(/\s+/g, "").replace(/,/g, ".");
  if (!normalized || normalized === "-" || normalized === "—") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePolishPercent(value: string) {
  if (!value.includes("%")) return null;
  return parsePolishNumber(value.replace(/%/g, ""));
}

export function buildWstawieniaChartSeries(rows: WstawieniaChartRow[]) {
  const sortedRows = [...rows].sort((left, right) => left.year.localeCompare(right.year));
  const rowsByYear = new Map(sortedRows.map((row) => [Number(row.year), row]));

  const yearly: WstawieniaYearPoint[] = [];
  const dynamics: WstawieniaDynamicsPoint[] = [];

  for (const row of sortedRows) {
    const monthlyValues = MONTHLY_INDEXES.map((index) => parsePolishNumber(row.values[index] ?? ""));
    const availableValues = monthlyValues.filter((value): value is number => value !== null);
    const directTotal = parsePolishNumber(row.values[24] ?? "");
    const total = directTotal ?? (availableValues.length ? availableValues.reduce((sum, value) => sum + value, 0) : null);

    if (total !== null) {
      yearly.push({
        year: row.year,
        total,
        isPartialYear: directTotal === null,
        comparedMonths: directTotal === null ? availableValues.length : 12,
      });
    }

    const directDynamics = parsePolishPercent(row.values[25] ?? "");
    if (directDynamics !== null) {
      dynamics.push({ year: row.year, dynamics: directDynamics, isPartial: false, comparedMonths: 12 });
      continue;
    }

    const previousRow = rowsByYear.get(Number(row.year) - 1);
    if (!previousRow) continue;

    let currentSum = 0;
    let previousSum = 0;
    let comparedMonths = 0;
    for (const [monthOffset, index] of MONTHLY_INDEXES.entries()) {
      const current = monthlyValues[monthOffset];
      const previous = parsePolishNumber(previousRow.values[index] ?? "");
      if (current === null || previous === null) continue;
      currentSum += current;
      previousSum += previous;
      comparedMonths += 1;
    }

    if (comparedMonths && previousSum) {
      dynamics.push({
        year: row.year,
        dynamics: (currentSum / previousSum) * 100,
        isPartial: comparedMonths < 12,
        comparedMonths,
      });
    }
  }

  return { yearly, dynamics };
}