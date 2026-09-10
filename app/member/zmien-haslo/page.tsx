import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageShell } from "../../components/SiteChrome";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../lib/auth";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/login/czlonkowie?redirect=/member/zmien-haslo");
  }

  return (
    <PageShell>
      <section className="simple-hero">
        <div className="shell" style={{ maxWidth: 900, paddingTop: 56, paddingBottom: 56 }}>
          <p className="article-kicker">Strefa członków</p>
          <h1>Zmień hasło</h1>
          <ChangePasswordForm />
        </div>
      </section>
    </PageShell>
  );
}