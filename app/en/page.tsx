import Link from "next/link";
import { PageShell } from "../components/SiteChrome";
import { withBasePath } from "../lib/basePath";

const englishHighlights = [
  {
    href: "/en/about",
    title: "About the association",
    text: "We represent the interests of the Polish poultry sector and support sustainable production, market development and industry knowledge.",
  },
  {
    href: "/en/market",
    title: "Market and trade",
    text: "We follow market developments, trade conditions, export opportunities and regulatory changes affecting poultry producers.",
  },
  {
    href: "/en/quality",
    title: "Quality and development",
    text: "We support production standards, animal welfare, sustainability, food safety and the long-term competitiveness of the sector.",
  },
];

export default function EnglishHomePage() {
  return (
    <PageShell language="en">
      <section className="home-hero">
        <div className="shell home-hero-grid">
          <div className="home-hero-copy">
            <p className="eyebrow">A shared voice for the poultry sector</p>
            <h1>
              Building a <em>stronger</em>
              <br />
              poultry industry.
            </h1>
            <p>
              National Poultry Council - Chamber of Commerce supports the development
              of the Polish poultry sector through strategic market intelligence,
              policy engagement, and practical cooperation across the value chain.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href={withBasePath("/en/about")}>
                Learn more
              </a>
              <a className="button button-quiet" href={withBasePath("/en/news")}>
                News
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="shell section-block">
        <div className="section-intro">
          <p className="eyebrow eyebrow-dark">What we do</p>
          <h2>Industry knowledge and practical support</h2>
        </div>

        <div className="pathway-grid">
          {englishHighlights.map((item) => (
            <article key={item.href} className="pathway-card">
              <div className="pathway-card-index">{item.title}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <Link href={withBasePath(item.href)} className="pathway-card-link">
                Read more
              </Link>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
