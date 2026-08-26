import { PageShell } from "../../components/SiteChrome";
import { withBasePath } from "../../lib/basePath";

const facts = [
  { value: "№ 1", label: "Poland among poultry producers in the EU" },
  { value: "21%", label: "share of EU poultry production" },
  { value: "63%+", label: "of exports directed to the EU market" },
];

const topics = [
  {
    title: "Trade flows",
    text: "We monitor export growth, product diversification and access to key outlets in Europe and beyond.",
  },
  {
    title: "EU regulations",
    text: "We assess the impact of trade rules, sanitary conditions and import procedures on production and logistics.",
  },
  {
    title: "Export opportunities",
    text: "We help identify new channels, evaluate market risks and strengthen the competitiveness of Polish poultry.",
  },
  {
    title: "Market outlook",
    text: "We gather market intelligence and sector updates needed by producers, traders and value-chain partners.",
  },
];

export default function EnglishMarketPage() {
  return (
    <PageShell language="en">
      <section className="subpage-hero">
        <div className="shell subpage-hero-grid">
          <div>
            <p className="eyebrow">Market and trade</p>
            <h1>Data, exports and growth opportunities.</h1>
            <p className="subpage-lead">
              We follow the main trends in the poultry market, including EU trade,
              export performance, supply chains and business conditions affecting the
              sector.
            </p>
          </div>
          <div className="subpage-image">
            <img src={withBasePath("/media/meat-seasoned.webp")} alt="Market overview and poultry trading" />
          </div>
        </div>
      </section>

      <section className="fact-band" aria-label="Market facts">
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
            <p className="eyebrow">Core priorities</p>
            <h2>Information for a competitive market</h2>
          </div>
          <div className="directory-grid">
            {topics.map((item, index) => (
              <article key={item.title} className="directory-card">
                <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="directory-card-arrow" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
