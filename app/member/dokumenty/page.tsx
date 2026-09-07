import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageShell } from "../../components/SiteChrome";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";
import ExportMemberDocumentsButton from "./ExportMemberDocumentsButton";
import MemberDocumentsList from "./MemberDocumentsList";

export default async function MemberDocumentsPage() {
  const sessionToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const session = verifySessionToken(sessionToken);

  if (!session) {
    redirect("/login/czlonkowie?redirect=/member/dokumenty");
  }

  const isAdmin = session?.role === "admin";

  return (
    <PageShell>
      <section className="simple-hero">
        <div className="shell" style={{ maxWidth: 860, paddingTop: 56, paddingBottom: 56 }}>
          <a
            href="/member/profil"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 28,
              color: "#1f3a5f",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <span aria-hidden="true">←</span> Powrót
          </a>
          <p className="article-kicker">Strefa członków</p>
          <h1>Dokumenty dostępne po zalogowaniu</h1>
          <p style={{ maxWidth: 700 }}>
            Zalogowani użytkownicy widzą dokumenty i materiały przeznaczone wyłącznie dla członków KRD-IG.
          </p>

          {isAdmin ? <ExportMemberDocumentsButton /> : null}
          <MemberDocumentsList />
        </div>
      </section>
    </PageShell>
  );
}
