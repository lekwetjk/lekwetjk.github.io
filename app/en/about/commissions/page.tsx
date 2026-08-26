import { ArticleBody } from "../../../components/ArticleBody";
import { PageShell } from "../../../components/SiteChrome";
import { pageBySlug } from "../../../lib/content";

export default function EnglishCommissionsPage() {
  const sourcePage = pageBySlug("komisje");

  if (!sourcePage) {
    return null;
  }

  return (
    <PageShell language="en">
      <section className="article-hero">
        <div className="shell article-hero-grid">
          <div>
            <p className="article-kicker">About the chamber</p>
            <h1>Commissions</h1>
            <p className="article-lead article-lead-full">
              Nine industry commissions operate within the National Poultry Council
              - Chamber of Commerce.
            </p>
          </div>
        </div>
      </section>

      <ArticleBody
        paragraphs={[
          "Nine commissions operate within the National Poultry Council - Chamber of Commerce.",
          "Geese and Duck Producers Commission",
          "Feather and Down Producers Commission",
          "Chicken and Turkey Producers Commission",
          "Poultry Breeding, Hatching and Evaluation Commission",
          "Strategic Development Commission",
          "Promotion and Communication Commission",
          "Food Safety, Veterinary Medicine and Poultry Meat Processing Commission",
          "Sustainable Development Commission",
          "Egg Producers and Processors Commission",
        ]}
        links={sourcePage.links}
        source="https://krd-ig.com.pl/komisje/"
        slug="komisje"
        language="en"
      />
    </PageShell>
  );
}
