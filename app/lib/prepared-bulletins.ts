import january from "../data/bulletins/2026-01.json";
import february from "../data/bulletins/2026-02.json";
import march from "../data/bulletins/2026-03.json";
import aprilMay from "../data/bulletins/2026-04-05.json";
import june from "../data/bulletins/2026-06.json";
import july from "../data/bulletins/2026-07.json";
import august from "../data/bulletins/2026-08.json";

export type PreparedBulletinSeries = {
  name: string;
  values: Array<number | null>;
};

export type PreparedBulletinChart = {
  id: string;
  section: string;
  title: string;
  kind: string;
  categories: string[];
  series: PreparedBulletinSeries[];
};

export type PreparedBulletinTable = {
  id: string;
  section: string;
  rows: string[][];
};

export type PreparedBulletin = {
  id: string;
  period: string;
  title: string;
  sections: string[];
  charts: PreparedBulletinChart[];
  tables: PreparedBulletinTable[];
  stats: {
    paragraphs: number;
    charts: number;
    tables: number;
    numericCells: number;
  };
};

type SourceBulletin = PreparedBulletin & { sourceFile: string };

const sources = [january, february, march, aprilMay, june, july, august] as SourceBulletin[];

const publications = sources.map(({ sourceFile: _sourceFile, ...bulletin }) => ({
  slug: `biuletyn-informacyjny-${bulletin.id}`,
  bulletin,
}));

export const preparedBulletinEditions = publications.map(({ slug, bulletin }) => ({
  slug,
  id: bulletin.id,
  period: bulletin.period,
  title: bulletin.title,
}));

export function getPreparedBulletin(slug: string) {
  return publications.find((publication) => publication.slug === slug)?.bulletin ?? null;
}