import { PageShell } from "../../components/SiteChrome";
import { withBasePath } from "../../lib/basePath";

const benefits = [
  {
    title: "Industry voice",
    text: "Membership gives companies a stronger collective position in political and business discussions.",
  },
  {
    title: "Market insight",
    text: "Members receive updates, analysis and practical information helping them assess risks and opportunities.",
  },
  {
    title: "Networking",
    text: "A member network supports exchange of knowledge and cooperation across the poultry sector.",
  },
  {
    title: "Strategic support",
    text: "We help create conditions for sustainable production, competitiveness and long-term development.",
  },
];

export default function EnglishMembershipPage() {
  return (
    <PageShell language="en">
      <section className="subpage-hero">
        <div className="shell subpage-hero-grid">
          <div>
            <p className="eyebrow">Membership</p>
            <h1>Join the sector's common voice.</h1>
            <p className="subpage-lead">
              Membership helps strengthen the sector through cooperation, information
              exchange and a shared strategy for sustainable growth.
            </p>
          </div>
          <div className="subpage-image">
            <img src={withBasePath("/media/partners/partner1.webp")} alt="Membership and cooperation in the poultry sector" />
          </div>
        </div>
      </section>

      <section className="content-directory">
        <div className="shell">
          <div className="section-intro">
            <p className="eyebrow">Why join</p>
            <h2>Benefits for businesses and stakeholders</h2>
          </div>
          <div className="directory-grid">
            {benefits.map((item, index) => (
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
