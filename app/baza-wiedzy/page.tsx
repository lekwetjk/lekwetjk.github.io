import type { Metadata } from "next";
import { knowledgePages } from "../lib/content";
import { Arrow, PageShell } from "../components/SiteChrome";

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

export default function KnowledgeBasePage() {
  const sections = Array.from(
    new Set(knowledgePages.map((page) => page.section)),
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
            <strong>{knowledgePages.length}</strong>
            <span>uporządkowanych stron tematycznych</span>
          </div>
        </div>
      </section>
      <section className="library-index">
        <div className="shell">
          {sections.map((section) => {
            const pages = knowledgePages.filter(
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
                    <a href={`/tresc/${page.slug}`} key={page.slug} className="library-card">
                      <span className="library-card-index">{page.section}</span>
                      <h3>{page.title}</h3>
                      <p>{page.excerpt}</p>
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
