import type { MetadataRoute } from "next";
import { knowledgePages, newsPosts } from "./lib/content";

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

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    ...staticRoutes,
    ...knowledgePages.map((page) => `tresc/${page.slug}`),
    ...newsPosts.map((post) => `aktualnosci/${post.slug}`),
  ];

  return routes.map((route) => ({
    url: new URL(route ? `${route}/` : "/", `${siteUrl.replace(/\/$/, "")}/`).toString(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}