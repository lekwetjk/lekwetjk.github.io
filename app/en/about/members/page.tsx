import { ArticleBody } from "../../../components/ArticleBody";
import { PageShell } from "../../../components/SiteChrome";
import { pageBySlug } from "../../../lib/content";

export default function EnglishMembersPage() {
  const membersPage = pageBySlug("czlonkowie");

  return (
    <PageShell language="en">
      <section className="article-hero">
        <div className="shell article-hero-grid">
          <div>
            <p className="article-kicker">About the chamber</p>
            <h1>Members KRD-IG</h1>
          </div>
        </div>
      </section>

      {membersPage && (
        <ArticleBody
          paragraphs={[
            "Members",
            "National Poultry Council - Chamber of Commerce",
          ]}
          links={membersPage.links}
          source={membersPage.source}
          slug="czlonkowie"
          language="en"
        />
      )}
    </PageShell>
  );
}
