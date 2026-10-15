import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MethodologyDocuments } from "../../components/MethodologyDocuments";
import { PageShell } from "../../components/SiteChrome";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";

export default async function MethodologyAdminPage() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session) {
    redirect("/login/czlonkowie?redirect=/admin/metodyka-i-biuletyny");
  }
  if (session.role !== "admin") redirect("/member/profil");

  return (
    <PageShell>
      <section className="simple-hero">
        <div className="shell" style={{ maxWidth: 900, paddingTop: 56, paddingBottom: 56 }}>
          <a className="report-back-link" href="/member/profil">← Powrót do profilu</a>
          <p className="article-kicker">Administracja</p>
          <h1>Metodyka i biuletyny</h1>
          <p>Ustal tytuł publikacji i wybierz plik. Opublikowane materiały są dostępne dla wszystkich bez logowania.</p>
          <a href="/tresc/metodyka-i-biuletyny">Zobacz stronę publiczną →</a>
          <MethodologyDocuments manage />
        </div>
      </section>
    </PageShell>
  );
}
