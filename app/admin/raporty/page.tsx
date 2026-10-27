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
          <h1>Biuletyny</h1>
          <p>Utwórz biuletyn interaktywny ze źródłowego pliku DOCX, sprawdź podgląd i opublikuj go dla zalogowanych członków. Możesz dołączyć oryginalny PDF do pobrania.</p>
          <ReportsManager />
        </div>
      </section>
    </PageShell>
  );
}