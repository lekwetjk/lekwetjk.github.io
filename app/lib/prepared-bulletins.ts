import january from "../data/bulletins/2026-01.json";
import february from "../data/bulletins/2026-02.json";
import march from "../data/bulletins/2026-03.json";
import aprilMay from "../data/bulletins/2026-04-05.json";
import june from "../data/bulletins/2026-06.json";
import july from "../data/bulletins/2026-07.json";
import august from "../data/bulletins/2026-08.json";
import tableDescriptions from "../data/bulletins/table-descriptions.json";
import type { PreparedBulletin, PreparedBulletinChart } from "./prepared-bulletin-model";
import { describePreparedCharts } from "./bulletin-chart-descriptions";

export type { PreparedBulletin, PreparedBulletinChart } from "./prepared-bulletin-model";

type SourceBulletin = PreparedBulletin & { sourceFile: string };

const sources = [january, february, march, aprilMay, june, july, august] as SourceBulletin[];
const tableDescriptionsByEdition: Record<string, Record<string, { title: string; description: string }>> = tableDescriptions;

const productionMetric: PreparedBulletinChart["metric"] = {
  label: "Przemysłowa produkcja mięsa drobiowego",
  description: "Produkcja miesięczna w zakładach zatrudniających powyżej 50 osób.",
  unit: "tys. ton",
  format: "number",
};
const exportShareMetric: PreparedBulletinChart["metric"] = {
  label: "Udział eksportu w produkcji mięsa drobiowego",
  description: "Eksport mięsa i przetworów z drobiu (CN 0207 i 1602) w odniesieniu do produkcji w zakładach zatrudniających co najmniej 50 osób.",
  unit: "%",
  format: "percent",
};
const importMetric: PreparedBulletinChart["metric"] = {
  label: "Import mięsa i przetworów z drobiu",
  description: "Łączna masa netto mięsa i podrobów jadalnych (CN 0207) oraz przetworów z drobiu (CN 1602) od początku roku.",
  unit: "kg",
  format: "number",
};
const exportMetric: PreparedBulletinChart["metric"] = {
  ...importMetric,
  label: "Eksport mięsa i przetworów z drobiu",
};

const publications = sources.map(({ sourceFile: _sourceFile, ...bulletin }) => {
  const metrics: Record<string, PreparedBulletinChart["metric"]> = bulletin.id === "2026-01"
    ? { "chart-24": { label: "Średnia cena skupu kurcząt", description: "Cena skupu w zakładach drobiarskich w Polsce, w ujęciu tygodniowym.", unit: "zł/kg", format: "number" } }
    : {
      "chart-1": productionMetric,
      [bulletin.id === "2026-02" ? "chart-9" : "chart-10"]: exportShareMetric,
      [bulletin.id === "2026-02" ? "chart-10" : "chart-11"]: importMetric,
      [bulletin.id === "2026-02" ? "chart-11" : "chart-12"]: exportMetric,
    };
  return {
    slug: `biuletyn-informacyjny-${bulletin.id}`,
    bulletin: {
      ...bulletin,
      charts: describePreparedCharts(bulletin.id, bulletin.charts).map((chart) => ({ ...chart, metric: metrics[chart.id] })),
      tables: bulletin.tables.map((table) => {
        const description = tableDescriptionsByEdition[bulletin.id]?.[table.id];
        if (!description) throw new Error(`Brak opisu tabeli ${table.id} w wydaniu ${bulletin.id}.`);
        return { ...table, ...description };
      }),
    },
  };
});

export const preparedBulletinEditions = publications.map(({ slug, bulletin }) => ({
  slug,
  id: bulletin.id,
  period: bulletin.period,
  title: bulletin.title,
}));

export function getPreparedBulletin(slug: string) {
  return publications.find((publication) => publication.slug === slug)?.bulletin ?? null;
}