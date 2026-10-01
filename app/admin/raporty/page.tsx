import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageShell } from "../../components/SiteChrome";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";
import ReportsManager from "./ReportsManager";

export default async function ReportsAdminPage() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") redirect("/login/czlonkowie?redirect=/admin/raporty");
  return (
    <PageShell>
      <section className="simple-hero">
        <div className="shell report-admin-shell">
          <a className="report-back-link" href="/member/profil">← Powrót do profilu</a>
          <p className="article-kicker">Administracja</p>
          <h1>Raporty</h1>
          <p>Wybierz okres i materiały. Arkusze XLSX utworzą interaktywny biuletyn, a plik PDF będzie jego wersją do pobrania. DOCX pozostanie wyłącznie materiałem administracyjnym.</p>
          <ReportsManager />
        </div>
      </section>
    </PageShell>
  );
}