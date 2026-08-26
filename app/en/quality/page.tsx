import { PageShell } from "../../components/SiteChrome";
import { withBasePath } from "../../lib/basePath";

const facts = [
  { value: "QAFP", label: "quality and food safety framework" },
  { value: "Animal welfare", label: "a central focus of modern production" },
  { value: "Sustainability", label: "development of responsible production systems" },
];

const topics = [
  {
    title: "Quality assurance",
    text: "We support consistent production quality, traceability and cooperation across the value chain.",
  },
  {
    title: "Animal welfare",
    text: "We promote standards that help maintain good production conditions, safe supply and consumer trust.",
  },
  {
    title: "Food safety",
    text: "We work to strengthen preventive systems and inform the public about safe, transparent production.",
  },
  {
    title: "Responsible growth",
    text: "We build the conditions for development that combines productivity with environmental awareness and public confidence.",
  },
];

export default function EnglishQualityPage() {
  return (
    <PageShell language="en">
      <section className="subpage-hero">
        <div className="shell subpage-hero-grid">
          <div>
            <p className="eyebrow">Quality and development</p>
            <h1>High standards. Better production. Stronger trust.</h1>
            <p className="subpage-lead">
              Quality, safety and sustainability are essential to the future of the
              Polish poultry industry. We support practical standards that improve
              performance and protect consumer confidence.
            </p>
          </div>
          <div className="subpage-image">
            <img src={withBasePath("/media/healthy-poultry.webp")} alt="Poultry quality and sustainable production" />
          </div>
        </div>
      </section>

      <section className="fact-band" aria-label="Quality facts">
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
            <p className="eyebrow">Main themes</p>
            <h2>Quality as a strategic advantage</h2>
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
