import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageShell } from "../../components/SiteChrome";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";
import MemberLoginForm from "./MemberLoginForm";

export default async function MemberLoginPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = verifySessionToken(sessionToken);

  if (session) {
    redirect("/member/profil");
  }

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
