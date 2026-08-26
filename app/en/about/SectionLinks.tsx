import Link from "next/link";
import { aboutSectionHref, aboutSections } from "./sections";

type SectionLinksProps = {
  currentSlug: string;
  eyebrow?: string;
  title?: string;
};

export function SectionLinks({
  currentSlug,
  eyebrow = "About section",
  title = "Explore the About section",
}: SectionLinksProps) {
  const links = aboutSections.filter((section) => section.slug !== currentSlug);

  return (
    <section className="content-directory">
      <div className="shell">
        <div className="section-intro">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <div className="directory-grid">
          {links.map((item, index) => (
            <Link className="directory-card" href={aboutSectionHref(item.slug)} key={item.slug}>
              <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.teaser}</p>
              <span className="directory-card-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
