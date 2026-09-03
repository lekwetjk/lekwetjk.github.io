import { ArticleBody } from "../../components/ArticleBody";
import { PageShell } from "../../components/SiteChrome";
import { withBasePath } from "../../lib/basePath";
import { formatDate, newsPosts, postBySlug } from "../../lib/content";

export function generateStaticParams() {
  return newsPosts.map((post) => ({ slug: post.slug }));
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = postBySlug(slug);
  const shouldUseTenderSplitTitle =
    slug ===
    "zapytanie-ofertowe-dot-projektu-ochrona-wizerunku-polskiego-sektora-drobiarskiego-na-rynku-krajowym-wraz-z-przeprowadzeniem-przez-niezalezny-podmiot-badania-efektywnosci-projektu-6";
  const shouldCompactStopDezinformacjiTitle =
    slug === "kampania-stopdezinformacjizywnosciowej-i-kluczowe-wyzwania-rynkowe";
  const shouldUseAlimentariaTitleSize =
    slug ===
    "polish-poultry-na-alimentaria-2026-rekordowa-edycja-rekordowa-energia-rekordowa-polska";
  const shouldContainWoahLogoImage =
    slug === "polska-odzyskala-status-kraju-wolnego-od-grypy-ptakow-2026" ||
    slug === "komisja-europejska-gospodarstwa-rolne-to-nie-zaklady-przemyslowe";
  const shouldContainZsrirLogoImage =
    slug === "nowy-link-zsrir-w-zakladce-dokumenty";
  const shouldUseZsrirTitleSize =
    slug === "nowy-link-zsrir-w-zakladce-dokumenty";
  const shouldUseWebinarHeroImage =
    slug === "szczepienia-przeciwko-nd-w-polsce-doswiadczenia-po-roku-od-obowiazywania-przepisu";
  const shouldUseSeptemberTurkeyImage =
    slug === "indyk-ma-wiele-do-dania-podsumowanie-wrzesnia-2024";
  const isTenderLikeSlug =
    /(zapytanie-ofertowe|wybor-wykonawcy|zaproszenie-do-skladania-ofert|wyniki-postepowania|uniewaznienie)/.test(
      slug,
    );
  const shouldHighlightTenderDeadline =
    slug ===
    "zapytanie-ofertowe-dot-projektu-ochrona-wizerunku-polskiego-sektora-drobiarskiego-na-rynku-krajowym-wraz-z-przeprowadzeniem-przez-niezalezny-podmiot-badania-efektywnosci-projektu-6";
  const tenderDeadlineSentence =
    "Termin składania ofert upływa 24 sierpnia 2026 r. o godz. 10:00.";

  if (!post) {
    return (
      <PageShell>
        <section className="simple-hero">
          <div className="shell">
            <h1>Nie znaleziono materiału</h1>
            <a href={withBasePath("/aktualnosci")}>Wróć do archiwum</a>
          </div>
        </section>
      </PageShell>
    );
  }

  const tenderSplitTitlePrefix = "ZAPYTANIE OFERTOWE";
  const tenderSplitTitleSuffix = shouldUseTenderSplitTitle
    ? post.title.replace(/^Zapytanie ofertowe/i, "").trimStart()
    : "";
  const tenderHeadingClassName = isTenderLikeSlug
    ? "article-title-tender-unified"
    : undefined;
  const tenderHeadingStyle = isTenderLikeSlug
    ? {
        fontSize: "clamp(26px, 4.2vw, 34px)",
        lineHeight: 1.18,
        letterSpacing: "-0.015em",
        maxWidth: "980px",
      }
    : undefined;

  return (
    <PageShell>
      <section className="article-hero">
        <div className="shell article-hero-grid">
          <div>
            <p className="article-kicker">
              {post.categories.join(" · ")} · {formatDate(post.date)}
            </p>
            {shouldCompactStopDezinformacjiTitle ? (
              <h1 className="article-title-campaign-split">
                <span className="article-title-line">Kampania</span>
                <span className="article-title-hashtag-line">#StopDezinformacjiŻywnościowej</span>
                <span className="article-title-line">i kluczowe wyzwania rynkowe</span>
              </h1>
            ) : shouldUseTenderSplitTitle ? (
              <h1
                className={`article-title-tender-split${tenderHeadingClassName ? ` ${tenderHeadingClassName}` : ""}`}
                style={tenderHeadingStyle}
              >
                <span className="article-title-tender-primary">{tenderSplitTitlePrefix}</span>
                {tenderSplitTitleSuffix && (
                  <span className="article-title-tender-secondary"> {tenderSplitTitleSuffix}</span>
                )}
              </h1>
            ) : (
              <h1
                className={
                  shouldUseAlimentariaTitleSize
                    ? "article-title-alimentaria-compact"
                    : shouldUseZsrirTitleSize
                      ? "article-title-zsrir"
                      : shouldUseWebinarHeroImage
                        ? "article-title-webinar"
                        : shouldUseSeptemberTurkeyImage
                          ? "article-title-turkey-campaign"
                        : tenderHeadingClassName
                }
                style={!shouldUseAlimentariaTitleSize ? tenderHeadingStyle : undefined}
              >
                {post.title}
              </h1>
            )}
            {post.excerpt && shouldHighlightTenderDeadline && post.excerpt.includes(tenderDeadlineSentence) ? (
              <p>
                {post.excerpt.split(tenderDeadlineSentence)[0]}
                <span className="tender-deadline-highlight">{tenderDeadlineSentence}</span>
              </p>
            ) : (
              post.excerpt && <p>{post.excerpt}</p>
            )}
          </div>
          {(shouldUseSeptemberTurkeyImage || post.image) && (
            <img
              src={withBasePath(
                shouldUseSeptemberTurkeyImage ? "/media/poultry-promotion.jpg" : post.image,
              )}
              alt={shouldUseSeptemberTurkeyImage ? "Poultry promotion campaign" : ""}
              className={
                shouldContainWoahLogoImage
                  ? "article-hero-image-contain"
                  : shouldContainZsrirLogoImage
                    ? "article-hero-image-zsrir"
                    : shouldUseWebinarHeroImage
                      ? "article-hero-image-webinar"
                      : isTenderLikeSlug
                        ? "article-hero-image-contain"
                        : undefined
              }
            />
          )}
        </div>
      </section>
      <ArticleBody
        paragraphs={post.paragraphs}
        links={post.links}
        source={post.source}
        slug={slug}
        justify={post.justify}
      />
    </PageShell>
  );
}
