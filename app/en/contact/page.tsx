import { PageShell } from "../../components/SiteChrome";
import { withBasePath } from "../../lib/basePath";

export default function EnglishContactPage() {
  return (
    <PageShell language="en">
      <section className="subpage-hero">
        <div className="shell subpage-hero-grid">
          <div>
            <p className="eyebrow">Contact</p>
            <h1>Get in touch with National Poultry Council - Chamber of Commerce.</h1>
            <p className="subpage-lead">
              We are available for cooperation, membership and sector-related enquiries.
            </p>
          </div>
          <div className="subpage-image">
            <img src={withBasePath("/media/logo-krd-ig.svg")} alt="National Poultry Council - Chamber of Commerce contact" />
          </div>
        </div>
      </section>

      <section className="content-directory">
        <div className="shell">
          <div className="section-intro">
            <p className="eyebrow">Contact details</p>
            <h2>We welcome cooperation</h2>
          </div>
          <div className="directory-grid">
            <article className="directory-card">
              <span className="card-index">01</span>
              <h3>Email</h3>
              <p>krd-ig@krd-ig.com.pl</p>
            </article>
            <article className="directory-card">
              <span className="card-index">02</span>
              <h3>Phone</h3>
              <p>+48 22 828 23 89</p>
            </article>
            <article className="directory-card">
              <span className="card-index">03</span>
              <h3>Address</h3>
              <p>ul. Czackiego 3/5, 00-043 Warsaw</p>
            </article>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
