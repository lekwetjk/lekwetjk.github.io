import { PageShell } from "../../components/SiteChrome";
import { withBasePath } from "../../lib/basePath";

const facts = [
  { value: "1991", label: "year of foundation" },
  { value: "9", label: "industry commissions within the chamber" },
  { value: "4", label: "key international organisations and partners" },
];

const topics = [
  {
    title: "Industry representation",
    text: "We speak on behalf of the Polish poultry sector with public institutions, policy makers and European partners.",
  },
  {
    title: "Market focus",
    text: "We support producers, traders and processors with data, analysis and practical insight into export and trade conditions.",
  },
  {
    title: "Knowledge and standards",
    text: "We promote quality, animal welfare, food safety and sustainable production across the value chain.",
  },
  {
    title: "Business cooperation",
    text: "We build networks among poultry companies and help strengthen the sector's voice in the domestic and international arena.",
  },
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
            <p className="eyebrow">What we do</p>
            <h2>Focused on the priorities of the sector</h2>
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
