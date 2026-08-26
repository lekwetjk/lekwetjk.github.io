import { ArticleBody } from "../../../components/ArticleBody";
import { PageShell } from "../../../components/SiteChrome";
import { pageBySlug } from "../../../lib/content";

export default function EnglishOurOrganisationPage() {
  const sourcePage = pageBySlug("o-nas");

  if (!sourcePage) {
    return null;
  }

  return (
    <PageShell language="en">
      <section className="article-hero">
        <div className="shell article-hero-grid">
          <div>
            <p className="article-kicker">About the chamber</p>
            <h1>About the National Poultry Council - Chamber of Commerce</h1>
            <p className="article-lead article-lead-full">
              Information about the National Poultry Council - Chamber of Commerce
              in Warsaw. The National Poultry Council has existed since 1991 and
              has held chamber of commerce status since 11 March 1998.
            </p>
          </div>
        </div>
      </section>

      <ArticleBody
        paragraphs={[
          "Information about the National Poultry Council - Chamber of Commerce in Warsaw.",
          "The purpose of the National Poultry Council - Chamber of Commerce is, among other things, the further development and modernisation of Polish poultry farming, protection of the interests of poultry breeders and producers and poultry meat processors, their integration, and representation of the domestic poultry sector before state authorities.",
          "KRD-IG members account for approximately 70% of live poultry production and around 80% of domestic poultry meat slaughter and processing.",
          "Supply in the poultry industry is often higher than demand, and spontaneous growth in demand is unlikely.",
          "Expanding the market requires a shared strategy for promoting poultry as food and protecting the image of the entire industry.",
          "We must persuade domestic and foreign consumers to increase their consumption of poultry.",
        ]}
        links={sourcePage.links}
        source="https://krd-ig.com.pl/o-nas/"
        slug="o-nas"
        language="en"
      />
    </PageShell>
  );
}
