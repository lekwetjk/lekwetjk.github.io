import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { knowledgePages, newsPosts } from "../../lib/content";
import { proposedSummaries } from "../../lib/local-proposal-content";
import LocalSeoEditor from "./LocalSeoEditor";

export const metadata: Metadata = { title: "Lokalne wersje SEO", robots: { index: false, follow: false } };

export default function SeoPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const entries = [
    ...knowledgePages.map((page) => ({ path: `/tresc/${page.slug}`, title: page.title, description: proposedSummaries[page.slug] ?? page.excerpt })),
    ...newsPosts.map((post) => ({ path: `/aktualnosci/${post.slug}`, title: post.title, description: post.excerpt })),
  ];
  return <main className="proposal-panel"><a href="/podglad-zmian">Powrót do propozycji</a><h1>Lokalne wersje SEO</h1><p>SEO zostało zaakceptowane. Wersja robocza dotyczy jednej strony i tej przeglądarki, bez zapisu do bazy. Docelową domenę ustalimy przed publikacją.</p><LocalSeoEditor entries={entries} /></main>;
}