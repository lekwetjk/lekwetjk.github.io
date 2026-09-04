import type { Metadata } from "next";
import { ArticleBody } from "../../components/ArticleBody";
import { PageShell } from "../../components/SiteChrome";
import { withBasePath } from "../../lib/basePath";
import { knowledgePages, pageBySlug } from "../../lib/content";

export function generateStaticParams() {
  return knowledgePages.map((page) => ({ slug: page.slug }));
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
    page.excerpt.trim() ||
    `Informacje o ${page.title} z sekcji ${page.section} w bazie wiedzy KRD-IG.`;
  const canonicalUrl = `https://krd-ig.com.pl/tresc/${page.slug}`;
  const socialImage = slug === "wazne-linki" ? "/media/wazne-linki-hero.png" : undefined;

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
      images: socialImage
        ? [
            {
              url: socialImage,
              alt: "Ważne linki - KRD-IG",
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: socialImage ? [socialImage] : undefined,
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
      : slug === "zarzad-i-rada-izby"
        ? "Krajowa Rada Drobiarstwa - Izba Gospodarcza jest organizacją samorządu gospodarczego, reprezentującą interesy gospodarcze zrzeszonych w niej przedsiębiorców, w szczególności wobec organów władzy publicznej. Organami Izby są: Walne Zgromadzenie, Rada Izby, Zarząd Izby, Komisja Rewizyjna, Komisja Rozjemcza."
      : slug === "akty-prawne"
        ? "Źródłami powszechnie obowiązującego prawa Rzeczypospolitej Polskiej są: Konstytucja, ustawy, ratyfikowane umowy międzynarodowe oraz rozporządzenia. Źródłami powszechnie obowiązującego prawa Rzeczypospolitej Polskiej są na obszarze działania organów, które je ustanowiły, akty prawa miejscowego."
      : slug === "dane-kontaktowe"
        ? "KRD-IG wykonuje kluczowe dla branży drobiarskiej zadania z zakresu hodowli i oceny drobiu. Za realizację zadań związanych z kompetencjami Izby w tym zakresie odpowiada Dział Hodowli i Oceny Drobiu z siedzibą w Poznaniu. Poniżej dane kontaktowe do Specjalistów Działu, któego Kierownikiem jest dr. inż Eugeniusz Wencek."
      : slug === "dzial-hodowli-i-oceny-drobiu"
        ? "Dział Hodowli i Oceny Drobiu realizuje zadania KRD-IG związane z hodowlą, oceną wartości użytkowej i hodowlanej oraz ochroną zasobów genetycznych drobiu."
      : slug === "korzysci-z-czlonkostwa"
        ? "Członkostwo w KRD-IG daje przedsiębiorcom branży drobiarskiej realny wpływ na rozwój rynku, dostęp do wiedzy i udział w projektach krajowych oraz zagranicznych."
      : slug === "dezinformacja-zywnosciowa"
        ? "Dezinformacja żywnościowa to fałszywe lub zmanipulowane informacje, które mogą podważać zaufanie konsumentów i powodować realne straty w całym sektorze rolno-spożywczym."
      : page?.excerpt;
  const legalEuRegulationText =
    "Stosuje się je wprost, ponieważ z mocy traktatu mają charakter ogólny, wiążą w całości i są bezpośrednio stosowane w każdym państwie członkowskim od dnia ich wejścia w życie.";

  if (!page) {
    return (
      <PageShell>
        <section className="simple-hero">
          <div className="shell">
            <h1>Nie znaleziono informacji</h1>
            <a href={withBasePath("/baza-wiedzy")}>Wróć do bazy wiedzy</a>
          </div>
        </section>
      </PageShell>
    );
  }

  const image =
    slug === "akty-prawne"
      ? "/media/prawo.png"
      : slug === "czlonkowie"
      ? "/media/memb.jpg"
      : slug === "wazne-linki"
        ? "/media/wazne-linki-hero.png"
      : page.images.find(
          (url) =>
            !/-480x|-300x|-980x/.test(url) &&
            /\.(jpe?g|png|webp)(?:\?|$)/i.test(url),
        );
  const displayTitle =
    slug === "wazne-linki"
      ? "Ważne linki"
      : page.title;
  const wazneLinkiSubtitle =
    "to szybki dostęp do najważniejszych linków stron i portali internetowych w obszarze rolnictwa i sektora drobiarskiego";
  const shouldUseWideLead = slug === "zarzad-i-rada-izby";
  const shouldShowLeadText = Boolean(leadText) && slug !== "wazne-linki" && slug !== "czlonkowie";
  const heroImageClassName =
    slug === "akty-prawne"
      ? "article-hero-image-legal"
      : slug === "dezinformacja-zywnosciowa" || slug === "kampanie"
        ? "article-hero-image-contain"
        : undefined;
  const articleLeadClassName = `${
    shouldUseWideLead ? "article-lead article-lead-full" : "article-lead"
  }${slug === "akty-prawne" ? " article-lead-full" : ""}`;
  const heroImageStyle =
    slug === "czlonkowie"
      ? {
          objectFit: "cover" as const,
          objectPosition: "center top",
          WebkitMaskImage:
            "radial-gradient(160% 132% at 50% 42%, #000 42%, rgba(0,0,0,0.45) 62%, rgba(0,0,0,0.15) 80%, transparent 100%)",
          maskImage:
            "radial-gradient(160% 132% at 50% 42%, #000 42%, rgba(0,0,0,0.45) 62%, rgba(0,0,0,0.15) 80%, transparent 100%)",
        }
      : undefined;

  return (
    <PageShell>
      <section className="article-hero">
        <div className="shell article-hero-grid">
          <div>
            <p className="article-kicker">{page.section}</p>
            <h1 className={slug === "wazne-linki" ? "article-title-wazne-linki" : undefined}>
              {slug === "wazne-linki" ? (
                <>
                  {displayTitle}
                  <br />
                  <span className="article-title-wazne-linki-subline">{wazneLinkiSubtitle}</span>
                </>
              ) : (
                displayTitle
              )}
            </h1>
            {shouldShowLeadText && (
              <p className={articleLeadClassName}>
                {slug === "akty-prawne" ? (
                  <>
                    {leadText} Rozporządzenia UE: {legalEuRegulationText}
                  </>
                ) : (
                  leadText
                )}
              </p>
            )}
          </div>
          {image && (
            <img
              src={withBasePath(image)}
              alt=""
              className={heroImageClassName}
              style={heroImageStyle}
            />
          )}
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
