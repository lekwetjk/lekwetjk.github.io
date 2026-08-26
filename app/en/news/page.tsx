import { PageShell } from "../../components/SiteChrome";
import { withBasePath } from "../../lib/basePath";

const stories = [
  {
    title: "Regulatory updates and market impact",
    text: "We monitor the most relevant policy changes affecting the poultry supply chain and trade environment.",
  },
  {
    title: "Trade and export signal",
    text: "The industry is exposed to changing conditions in the EU and global markets, which requires fast and reliable information.",
  },
  {
    title: "Quality and welfare topics",
    text: "We regularly share insights on standards, health management, animal welfare and production efficiency.",
  },
  {
    title: "Industry communication",
    text: "Our role includes explaining complex developments in a clear way for producers, partners and decision makers.",
  },
];

export default function EnglishNewsPage() {
  return (
    <PageShell language="en">
      <section className="subpage-hero">
        <div className="shell subpage-hero-grid">
          <div>
            <p className="eyebrow">News</p>
            <h1>Latest information from the poultry sector.</h1>
            <p className="subpage-lead">
              We share updates on trade, regulations, quality, animal welfare and the
              major challenges and opportunities facing the industry in Poland and the EU.
            </p>
          </div>
          <div className="subpage-image">
            <img src={withBasePath("/media/news/logo-komisji-europejskiej.svg")} alt="Industry news and updates" />
          </div>
        </div>
      </section>

      <section className="content-directory">
        <div className="shell">
          <div className="section-intro">
            <p className="eyebrow">Latest topics</p>
            <h2>Current developments and sector analysis</h2>
          </div>
          <div className="directory-grid">
            {stories.map((item, index) => (
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
