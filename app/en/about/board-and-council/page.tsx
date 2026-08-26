import { ArticleBody } from "../../../components/ArticleBody";
import { PageShell } from "../../../components/SiteChrome";
import { pageBySlug } from "../../../lib/content";

export default function EnglishBoardAndCouncilPage() {
  const sourcePage = pageBySlug("zarzad-i-rada-izby");

  if (!sourcePage) {
    return null;
  }

  return (
    <PageShell language="en">
      <section className="article-hero">
        <div className="shell article-hero-grid">
          <div>
            <p className="article-kicker">About the chamber</p>
            <h1>Management Board and Council</h1>
            <p className="article-lead article-lead-full">
              The Management Board and Council of the National Poultry Council -
              Chamber of Commerce represent the interests of the chamber's members
              and guide its activities.
            </p>
          </div>
        </div>
      </section>

      <ArticleBody
        paragraphs={sourcePage.paragraphs}
        links={sourcePage.links}
        source="https://krd-ig.com.pl/zarzad-i-rada-izby/"
        slug="zarzad-i-rada-izby"
        language="en"
      />
    </PageShell>
  );
}
