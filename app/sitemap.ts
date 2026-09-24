import type { MetadataRoute } from "next";
import { knowledgePages, newsPosts } from "./lib/content";
import { listDeletedPostSlugs } from "./lib/managed-posts";
import { connection } from "next/server";

const defaultSiteUrl = "https://lekwetjk.github.io";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || defaultSiteUrl;

const staticRoutes = [
  "",
  "o-izbie",
  "aktualnosci",
  "rynek",
  "hodowla",
  "zrownowazony-rozwoj",
  "dezinformacja",
  "baza-wiedzy",
  "czlonkostwo",
  "kontakt",
  "dokumenty",
  "zapytania-ofertowe",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const deletedRoutes = new Set((await listDeletedPostSlugs()).map((slug) => `aktualnosci/${slug}`));
  const routes = [
    ...staticRoutes,
    ...knowledgePages.map((page) => `tresc/${page.slug}`),
    ...newsPosts.map((post) => `aktualnosci/${post.slug}`),
  ];

  return routes.filter((route) => !deletedRoutes.has(route)).map((route) => ({
    url: new URL(route ? `${route}/` : "/", `${siteUrl.replace(/\/$/, "")}/`).toString(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}