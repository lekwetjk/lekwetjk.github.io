import { PageShell } from "../../components/SiteChrome";

export default function EnglishPrivacyPage() {
  return (
    <PageShell language="en">
      <section className="subpage-hero">
        <div className="shell subpage-hero-grid">
          <div>
            <p className="eyebrow">Legal information</p>
            <h1>Privacy policy.</h1>
            <p className="subpage-lead">
              This page outlines how we process personal data, use information collected
              through the website, and respect privacy obligations in line with current
              regulations.
            </p>
          </div>
        </div>
      </section>

      <section className="shell section-block">
        <div className="article-body prose">
          <p>
            The National Poultry Council - Chamber of Commerce website collects only
            the information necessary to provide services and improve the quality of
            the content offered to visitors.
          </p>
          <p>
            Data may be used to respond to inquiries, manage contact requests, and
            support communication with partners and members of the sector.
          </p>
          <p>
            We protect personal data in accordance with applicable law and do not use
            it for unrelated purposes. You may contact us at any time to request
            access, correction or deletion of your personal information.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
