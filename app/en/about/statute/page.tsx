import { PageShell } from "../../../components/SiteChrome";
import { SectionLinks } from "../SectionLinks";

export default function EnglishStatutePage() {
  return (
    <PageShell language="en">
      <section className="subpage-hero">
        <div className="shell subpage-hero-grid">
          <div>
            <p className="eyebrow">Statute</p>
            <h1>Formal framework of the chamber.</h1>
            <p className="subpage-lead">
              The statute defines governance principles, organisational roles, and
              the scope of activity of National Poultry Council - Chamber of Commerce.
            </p>
          </div>
        </div>
      </section>

      <section className="shell section-block">
        <div className="article-body prose">
          <p>
            The statute is the core legal document governing the chamber's
            operation and internal organisation.
          </p>
          <p>
            It defines membership rules, powers of governing bodies,
            representation mechanisms, and key decision-making procedures.
          </p>
          <p>
            The currently published text includes consolidated updates adopted in
            subsequent court and organisational decisions.
          </p>
          <p>
            This framework ensures transparency, continuity, and legal certainty
            in activities conducted on behalf of the Polish poultry sector.
          </p>
        </div>
      </section>

      <SectionLinks currentSlug="statute" />
    </PageShell>
  );
}
