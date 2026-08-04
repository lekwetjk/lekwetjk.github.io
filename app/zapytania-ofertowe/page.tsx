import type { Metadata } from "next";
import { NewsArchive } from "../components/NewsArchive";
import { PageShell } from "../components/SiteChrome";
import { tenderPosts } from "../lib/content";

export const metadata: Metadata = {
  title: "Zapytania ofertowe i wybór wykonawcy",
  description:
    "Pełna lista zapytań ofertowych, ogłoszeń i informacji o wyborze wykonawcy w branży drobiarskiej.",
  alternates: {
    canonical: "https://krd-ig.com.pl/zapytania-ofertowe",
  },
  keywords: [
    "zapytania ofertowe",
    "wybór wykonawcy",
    "przetargi",
    "drobiarstwo",
    "KRD-IG",
  ],
  openGraph: {
    title: "Zapytania ofertowe i wybór wykonawcy | KRD-IG",
    description:
      "Najważniejsze ogłoszenia, zapytania ofertowe i informacje o wyborze wykonawcy dla branży drobiarskiej.",
    url: "https://krd-ig.com.pl/zapytania-ofertowe",
    type: "website",
  },
};

export default function TenderRequestsPage() {
  const archive = tenderPosts().map(
    ({ slug, title, date, year, excerpt, categories, image }) => ({
      slug,
      title,
      date,
      year,
      excerpt,
      categories,
      image,
    }),
  );

  return (
    <PageShell>
      <section className="archive-hero">
        <div className="shell archive-hero-grid">
          <div>
            <p className="eyebrow eyebrow-light">Zapytania ofertowe</p>
            <h1>Zapytania ofertowe i wybór wykonawcy</h1>
          </div>
          <p>
            Najważniejsze ogłoszenia, zapytania ofertowe i informacje o wyborze wykonawcy
            w jednym archiwum branżowym KRD-IG.
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
