import type { Metadata } from "next";
import { knowledgePages } from "../lib/content";
import { withBasePath } from "../lib/basePath";
import { Arrow, PageShell } from "../components/SiteChrome";
import { getLocalProposals } from "../lib/local-proposals-server";
import { excludedLibrarySlugs, proposedPageHref, proposedSection, proposedSummaries } from "../lib/local-proposal-content";

export const metadata: Metadata = {
  title: "Baza wiedzy",
  description:
    "Pełna baza wiedzy KRD-IG — dokumenty, komunikaty, publikacje, informacje prawne i materiały edukacyjne dla sektora drobiarskiego.",
  alternates: {
    canonical: "https://krd-ig.com.pl/baza-wiedzy",
  },
  keywords: [
    "baza wiedzy drobiarskiej",
    "dokumenty KRD-IG",
    "publikacje drobiarskie",
    "materiały edukacyjne",
    "dokumenty branżowe",
  ],
  openGraph: {
    title: "Baza wiedzy | KRD-IG",
    description:
      "Zbiór kluczowych materiałów i dokumentów dotyczących drobiarstwa, rynku, jakości i rozwoju sektora.",
    url: "https://krd-ig.com.pl/baza-wiedzy",
    type: "website",
  },
};

export default async function KnowledgeBasePage() {
  const proposals = await getLocalProposals();
  const catalog = proposals.library ? knowledgePages.filter((page) => !excludedLibrarySlugs.has(page.slug)).map((page) => ({ ...page, section: proposedSection(page.slug, page.section) })) : knowledgePages;
  const sections = Array.from(
    new Set(catalog.map((page) => page.section)),
  );

  return (
    <PageShell>
      <section className="library-hero">
        <div className="shell library-hero-grid">
          <div>
            <p className="eyebrow eyebrow-light">Baza wiedzy KRD-IG</p>
            <h1>Pełny katalog informacji tematycznych</h1>
            <p>
              Wszystkie dokumenty i komunikaty we właściwym miejscu.
            </p>
          </div>
          <div className="library-count">
            <strong>{catalog.length}</strong>
            <span>uporządkowanych stron tematycznych</span>
          </div>
        </div>
      </section>
      <section className="library-index">
        <div className="shell">
          {sections.map((section) => {
            const pages = catalog.filter(
              (page) => page.section === section,
            );
            return (
              <div className="library-section" key={section}>
                <div className="library-section-title">
                  <h2>{section}</h2>
                  <span>{pages.length}</span>
                </div>
                <div className="library-grid">
                  {pages.map((page) => (
                    <a href={withBasePath(proposals.library || proposals.links ? proposedPageHref(page.slug) : `/tresc/${page.slug}`)} key={page.slug} className="library-card">
                      <span className="library-card-index">{page.section}</span>
                      <h3>{page.title}</h3>
                      <p>
                        {proposals.summaries ? proposedSummaries[page.slug] ?? "" : page.slug === "akty-prawne"
                          ? "Aktualna baza krajowych i unijnych aktów prawnych dotyczących branży drobiarskiej"
                          : page.excerpt}
                      </p>
                      <span className="library-card-link">
                        Czytaj <Arrow />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
