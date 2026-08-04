import type { Metadata } from "next";
import { knowledgePages, newsPosts } from "../lib/content";
import { Arrow, PageShell } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "Dokumenty i przetargi",
  description:
    "Dokumenty branżowe, stanowiska, raporty, zapytania ofertowe i akty prawne z obszaru drobiarstwa i żywności.",
  alternates: {
    canonical: "https://krd-ig.com.pl/dokumenty",
  },
  keywords: [
    "dokumenty drobiarskie",
    "przetargi",
    "stanowiska",
    "raporty branżowe",
    "KRD-IG",
  ],
  openGraph: {
    title: "Dokumenty i przetargi | KRD-IG",
    description:
      "Zbiór dokumentów, stanowisk i postępowań branżowych dostępnych w ramach działań KRD-IG.",
    url: "https://krd-ig.com.pl/dokumenty",
    type: "website",
  },
};

export default function DocumentsPage() {
  const documentPages = knowledgePages.filter((page) =>
    [
      "Dokumenty i przetargi",
      "Zdrowie i prawo",
      "Hodowla i ocena",
      "Informacje prawne",
    ].includes(page.section),
  );
  const statements = newsPosts
    .filter((post) => post.categories.includes("Stanowiska i oświadczenia"))
    .slice(0, 12);
  const tenders = newsPosts
    .filter((post) => post.categories.includes("Zapytania ofertowe"))
    .slice(0, 12);

  return (
    <PageShell>
      <section className="simple-hero">
        <div className="shell">
          <p className="eyebrow">Dokumenty</p>
          <h1>Prawo, raporty, stanowiska i postępowania</h1>
          <p>
            Jeden indeks materiałów formalnych i branżowych — bez rozdzielania
            tych samych dokumentów między kilka pozycji menu.
          </p>
        </div>
      </section>
      <section className="document-index">
        <div className="shell document-columns">
          <div>
            <h2>Dokumenty tematyczne</h2>
            {documentPages.map((page) => (
              <a href={`/tresc/${page.slug}`} key={page.slug}>
                <span>
                  <small>{page.section}</small>
                  {page.title}
                </span>
                <Arrow />
              </a>
            ))}
          </div>
          <div>
            <h2>Najnowsze stanowiska</h2>
            {statements.map((post) => (
              <a href={`/aktualnosci/${post.slug}`} key={post.slug}>
                <span>
                  <small>{new Date(post.date).getFullYear()}</small>
                  {post.title}
                </span>
                <Arrow />
              </a>
            ))}
          </div>
          <div>
            <h2>Zapytania ofertowe</h2>
            {tenders.map((post) => (
              <a href={`/aktualnosci/${post.slug}`} key={post.slug}>
                <span>
                  <small>{new Date(post.date).getFullYear()}</small>
                  {post.title}
                </span>
                <Arrow />
              </a>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
