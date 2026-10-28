import type { PreparedBulletin } from "./prepared-bulletin-model";

const HISTORICAL_RANGE = /\s*w latach 2021\s*[-–—]\s*2026/giu;

function removeHistoricalRange(value: string) {
  return value.replace(HISTORICAL_RANGE, "").replace(/\s+([.,;:])/g, "$1").trim();
}

export function getBulletinHighlights(bulletin: PreparedBulletin) {
  const year = bulletin.id.slice(0, 4);
  return bulletin.charts.flatMap((chart) => {
    const series = chart.series.find((item) => item.name.replace(/\*/g, "").trim() === year);
    if (!series) return [];
    let lastIndex = -1;
    series.values.forEach((value, index) => { if (value !== null) lastIndex = index; });
    const value = lastIndex >= 0 ? series.values[lastIndex] : null;
    const total = chart.categories[lastIndex] === "Łącznie";
    const months = chart.categories.filter((category, index) => category !== "Łącznie" && series.values[index] != null);
    const period = total && months.length
      ? `${months[0]}–${months[months.length - 1]} · ${series.name} (narastająco)`
      : `${chart.categories[lastIndex] ?? ""} · ${series.name}`;
    const displayValue = value === null ? "-" : (chart.metric?.format === "percent" ? value * 100 : value)
      .toLocaleString("pl-PL", { maximumFractionDigits: chart.metric?.unit === "zł/kg" ? 3 : 1 });
    return [{
      id: chart.id,
      label: chart.metric?.label || chart.title || chart.section,
      description: chart.metric?.description || chart.section,
      unit: chart.metric?.unit || "Jednostka niepodana w modelu",
      displayValue,
      period,
      preliminary: series.name.includes("*"),
    }];
  }).slice(0, 4).map((metric, index) => index === 0 ? metric : {
    ...metric,
    label: removeHistoricalRange(metric.label),
    description: removeHistoricalRange(metric.description),
  });
}
