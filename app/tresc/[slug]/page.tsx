import type { Metadata } from "next";
import { ArticleBody } from "../../components/ArticleBody";
import { PageShell } from "../../components/SiteChrome";
import { pageBySlug } from "../../lib/content";

function sanitizeLeadText(value: string) {
  return value
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(/î€Š/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = pageBySlug(slug);

  if (!page) {
    return {
      title: "Nie znaleziono treści",
      description: "Nie znaleziono żądanej treści w bazie wiedzy KRD-IG.",
    };
  }

  const title = page.title;
  const description =
    sanitizeLeadText(page.excerpt) ||
    `Informacje o ${page.title} z sekcji ${page.section} w bazie wiedzy KRD-IG.`;
  const canonicalUrl = `https://krd-ig.com.pl/tresc/${page.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    keywords: [
      page.title,
      page.section,
      "KRD-IG",
      "drobiarstwo",
      "baza wiedzy",
      "sektor drobiarski",
    ],
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
      siteName: "KRD-IG",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = pageBySlug(slug);
  const leadText =
    slug === "o-nas"
      ? "Informacja o Krajowej Radzie Drobiarstwa – Izbie Gospodarczej w Warszawie. Krajowa Rada Drobiarstwa istnieje od 1991 roku. Od 11 marca 1998r. Krajowa Rada Drobiarstwa posiada statut Izby Gospodarczej. Aktualnie do KRD-IG należy ponad 100 podmiotów gospodarczych."
      : slug === "komisje"
        ? "W Krajowej Radzie Drobiarstwa – Izbie Gospodarczej działa dziewięć komisji branżowych."
      : page?.excerpt
        ? sanitizeLeadText(page.excerpt)
        : undefined;

  if (!page) {
    return (
      <PageShell>
        <section className="simple-hero">
          <div className="shell">
            <h1>Nie znaleziono informacji</h1>
            <a href="/baza-wiedzy">Wróć do bazy wiedzy</a>
          </div>
        </section>
      </PageShell>
    );
  }

  const image = page.images.find(
    (url) =>
      !/-480x|-300x|-980x/.test(url) &&
      /\.(jpe?g|png|webp)(?:\?|$)/i.test(url),
  );

  return (
    <PageShell>
      <section className="article-hero">
        <div className="shell article-hero-grid">
          <div>
            <p className="article-kicker">{page.section}</p>
            <h1>{page.title}</h1>
            {leadText && <p>{leadText}</p>}
          </div>
          {image && <img src={image} alt="" />}
        </div>
      </section>
      <ArticleBody
        paragraphs={page.paragraphs}
        links={page.links}
        source={page.source}
        slug={slug}
      />
    </PageShell>
  );
}
