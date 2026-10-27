import type { Metadata } from "next";
import { NewsArchive } from "../components/NewsArchive";
import { PageShell } from "../components/SiteChrome";
import { tenderPosts } from "../lib/content";
import { mergeManagedPosts } from "../lib/managed-posts";

function normalizeTenderArchiveTitle(title: string) {
  const normalized = title.trim();
  const lower = normalized.toLocaleLowerCase("pl");

  const variants: Array<{ startsWith: string; label: string }> = [
    { startsWith: "zapytanie ofertowe", label: "ZAPYTANIE OFERTOWE" },
    { startsWith: "wybór wykonawcy", label: "WYBÓR WYKONAWCY" },
    { startsWith: "zaproszenie do składania ofert", label: "ZAPROSZENIE DO SKŁADANIA OFERT" },
    { startsWith: "wyniki postępowania", label: "WYNIKI POSTĘPOWANIA" },
    {
      startsWith: "informacja o unieważnieniu zapytania ofertowego",
      label: "INFORMACJA O UNIEWAŻNIENIU ZAPYTANIA OFERTOWEGO",
    },
  ];

  for (const variant of variants) {
    if (!lower.startsWith(variant.startsWith)) {
      continue;
    }

    const suffix = normalized.slice(variant.startsWith.length).trimStart();
    return suffix ? `${variant.label} ${suffix}` : variant.label;
  }

  return normalized;
}

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

export default async function TenderRequestsPage() {
  const archive = (await mergeManagedPosts(tenderPosts(), "tender")).map(
    ({ slug, title, date, year, excerpt, categories, image, imageFit }) => ({
      slug,
      title: normalizeTenderArchiveTitle(title),
      date,
      year,
      excerpt,
      categories,
      image,
      imageFit,
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
        <div className="shell tender-archive">
          <NewsArchive posts={archive} forceContainImages managedKind="tender" />
        </div>
      </section>
    </PageShell>
  );
}
