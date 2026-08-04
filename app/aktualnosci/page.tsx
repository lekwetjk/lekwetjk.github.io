import type { Metadata } from "next";
import { NewsArchive } from "../components/NewsArchive";
import { PageShell } from "../components/SiteChrome";
import { isTenderPost, newsPosts } from "../lib/content";

export const metadata: Metadata = {
  title: "Aktualności",
  description:
    "Archiwum aktualności, komunikatów, stanowisk i wydarzeń sektora drobiarskiego. Wszystkie najważniejsze informacje z branży w jednym miejscu.",
  alternates: {
    canonical: "https://krd-ig.com.pl/aktualnosci",
  },
  keywords: [
    "aktualności drobiarskie",
    "komunikaty branżowe",
    "polski sektor drobiarski",
    "wydarzenia drobiarskie",
    "KRD-IG aktualności",
  ],
  openGraph: {
    title: "Aktualności | KRD-IG",
    description:
      "Śledź najnowsze informacje, komunikaty i wydarzenia z sektora drobiarskiego oraz KRD-IG.",
    url: "https://krd-ig.com.pl/aktualnosci",
    type: "website",
  },
};

export default function NewsPage() {
  const archive = newsPosts
    .filter((post) => !isTenderPost(post))
    .map(({ slug, title, date, year, excerpt, categories, image }) => ({
      slug,
      title,
      date,
      year,
      excerpt,
      categories,
      image,
    }));

  return (
    <PageShell>
      <section className="archive-hero">
        <div className="shell archive-hero-grid">
          <div>
            <p className="eyebrow eyebrow-light">Aktualności i archiwum</p>
            <h1>Branża drobiarska — informacje u źródła</h1>
          </div>
          <p>
            Kompletne archiwum wydarzeń, komunikatów, kampanii, stanowisk,
            informacji o sytuacji epizootycznej w Polsce oraz postępowań ofertowych.
          </p>
        </div>
      </section>
      <section className="archive-section">
        <div className="shell">
          <NewsArchive posts={archive} />
        </div>
      </section>
    </PageShell>
  );
}
