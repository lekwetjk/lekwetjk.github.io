import { PageShell } from "../../components/SiteChrome";
import { withBasePath } from "../../lib/basePath";

const docs = [
  {
    title: "Sector regulations",
    text: "Key legal and policy documents relevant for the poultry production and trade environment.",
  },
  {
    title: "Industry guidance",
    text: "Practical guidance on implementation, quality assurance and operational standards in the sector.",
  },
  {
    title: "Public reports",
    text: "Reports and briefing material designed for producers, partners and stakeholders in the industry.",
  },
  {
    title: "Background materials",
    text: "Useful context and reference documents for those working in the poultry sector and related value chains.",
  },
];

export default function EnglishDocumentsPage() {
  return (
    <PageShell language="en">
      <section className="subpage-hero">
        <div className="shell subpage-hero-grid">
          <div>
            <p className="eyebrow">Documents</p>
            <h1>Regulatory and practical resources.</h1>
            <p className="subpage-lead">
              Access key documents, guidance and background materials that support the
              Polish poultry sector and help explain current challenges and requirements.
            </p>
          </div>
          <div className="subpage-image">
            <img src={withBasePath("/media/meat-drumsticks.webp")} alt="Poultry documents and resources" />
          </div>
        </div>
      </section>

      <section className="content-directory">
        <div className="shell">
          <div className="section-intro">
            <p className="eyebrow">Reference files</p>
            <h2>Useful and relevant documents</h2>
          </div>
          <div className="directory-grid">
            {docs.map((item, index) => (
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
