import Link from "next/link";
import { PageShell } from "../../components/SiteChrome";
import { withBasePath } from "../../lib/basePath";
import { aboutSectionHref, aboutSections } from "./sections";

const facts = [
  { value: "1991", label: "year of foundation" },
  { value: "9", label: "industry commissions within the chamber" },
  { value: "4", label: "key international organisations and partners" },
];

export default function EnglishAboutPage() {
  return (
    <PageShell language="en">
      <section className="subpage-hero">
        <div className="shell subpage-hero-grid">
          <div>
            <p className="eyebrow">National Poultry Council</p>
            <h1>One organisation. One industry voice.</h1>
            <p className="subpage-lead">
              National Poultry Council - Chamber of Commerce brings together poultry
              businesses and stakeholders to promote competitiveness, safety and
              responsible development of the sector in Poland and abroad.
            </p>
          </div>
          <div className="subpage-image">
            <img src={withBasePath("/media/meat-seasoned.webp")} alt="Poultry meat and seasonal ingredients" />
          </div>
        </div>
      </section>

      <section className="fact-band" aria-label="Key facts">
        <div className="shell fact-band-grid">
          {facts.map((fact) => (
            <div key={fact.label}>
              <strong>{fact.value}</strong>
              <p>{fact.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="content-directory">
        <div className="shell">
          <div className="section-intro">
            <p className="eyebrow">Full information</p>
            <h2>About us: all English pages</h2>
            <p>
              Explore the organisation and its international partnerships, the Board
              and Council, nine commissions, members and statute. Every tile below
              leads to an English page.
            </p>
          </div>
          <div className="directory-grid">
            {aboutSections.map((item, index) => (
              <Link key={item.slug} className="directory-card" href={aboutSectionHref(item.slug)}>
                <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.teaser}</p>
                <span className="directory-card-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
