import { PageShell } from "../../components/SiteChrome";
import MemberLoginForm from "./MemberLoginForm";

export default function MemberLoginPage() {
  return (
    <PageShell>
      <section className="simple-hero">
        <div className="shell" style={{ maxWidth: 720, paddingTop: 48, paddingBottom: 48 }}>
          <p className="article-kicker">Strefa członków</p>
          <h1 style={{ marginBottom: 10 }}>Logowanie do strefy chronionej</h1>
          <p style={{ marginBottom: 32, maxWidth: 620 }}>
            Ta sekcja jest dostępna wyłącznie dla zalogowanych użytkowników KRD-IG.
          </p>

          <MemberLoginForm />
        </div>
      </section>
    </PageShell>
  );
}
