import january from "../data/bulletins/2026-01.json";
import february from "../data/bulletins/2026-02.json";
import march from "../data/bulletins/2026-03.json";
import aprilMay from "../data/bulletins/2026-04-05.json";
import june from "../data/bulletins/2026-06.json";
import july from "../data/bulletins/2026-07.json";
import august from "../data/bulletins/2026-08.json";
import type { PreparedBulletin } from "./prepared-bulletin-model";

export type { PreparedBulletin, PreparedBulletinChart } from "./prepared-bulletin-model";

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