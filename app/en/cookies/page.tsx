import { PageShell } from "../../components/SiteChrome";

export default function EnglishCookiesPage() {
  return (
    <PageShell language="en">
      <section className="subpage-hero">
        <div className="shell subpage-hero-grid">
          <div>
            <p className="eyebrow">Legal information</p>
            <h1>Cookie policy.</h1>
            <p className="subpage-lead">
              This website may use cookies to improve usability, maintain website
              performance and support basic analytics and technical functionality.
            </p>
          </div>
        </div>
      </section>

      <section className="shell section-block">
        <div className="article-body prose">
          <p>
            Cookies are small text files stored in the browser to support the functioning
            of the site and provide a smoother user experience.
          </p>
          <p>
            Some cookies are strictly necessary for the website to operate correctly,
            while others may be used for analytics and measurement purposes.
          </p>
          <p>
            Users can change browser settings to block or delete cookies, although this
            may affect some site functions and performance.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
