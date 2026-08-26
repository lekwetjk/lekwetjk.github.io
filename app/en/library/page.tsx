import { PageShell } from "../../components/SiteChrome";
import { withBasePath } from "../../lib/basePath";

const topics = [
  {
    title: "Market reports",
    text: "Key updates on trade, production volumes, export conditions and sector trends in Poland and the EU.",
  },
  {
    title: "Breeding and production",
    text: "Information on breeding systems, production metrics, certification and operational efficiency.",
  },
  {
    title: "Quality and welfare",
    text: "Guidance and background on safety, welfare standards and practical quality assurance systems.",
  },
  {
    title: "Regulatory updates",
    text: "Timely explanations of legislative and policy developments affecting poultry producers and processors.",
  },
];

export default function EnglishLibraryPage() {
  return (
    <PageShell language="en">
      <section className="subpage-hero">
        <div className="shell subpage-hero-grid">
          <div>
            <p className="eyebrow">Knowledge library</p>
            <h1>Essential knowledge for the poultry sector.</h1>
            <p className="subpage-lead">
              A structured library of materials covering market conditions, production,
              quality, regulations and practical industry knowledge.
            </p>
          </div>
          <div className="subpage-image">
            <img src={withBasePath("/media/healthy-poultry.webp")} alt="Poultry industry reference library" />
          </div>
        </div>
      </section>

      <section className="content-directory">
        <div className="shell">
          <div className="section-intro">
            <p className="eyebrow">Reference areas</p>
            <h2>Selected areas of knowledge</h2>
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
