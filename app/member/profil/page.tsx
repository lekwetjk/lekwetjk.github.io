import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageShell } from "../../components/SiteChrome";
import { AUTH_COOKIE_NAME, getMemberLogo, getMemberProfile, verifySessionToken } from "../../lib/auth";
import MemberProfileSection from "./MemberProfileSection";
import ExportPermitOptions from "../../admin/uzytkownicy/ExportPermitOptions";

export default async function MemberProfilePage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/login/czlonkowie?redirect=/member/profil");
  }

  const logo = await getMemberLogo(session.sub);
  const profile = await getMemberProfile(session.sub);

  return (
    <PageShell>
      <section className="simple-hero">
        <div className="shell" style={{ maxWidth: 900, paddingTop: 56, paddingBottom: 56 }}>
          <p className="article-kicker">Profil użytkownika</p>
          <h1 style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {session.name}
            {logo ? <img src={`data:${logo.contentType};base64,${logo.content}`} alt="Logo użytkownika" style={{ width: 64, height: 64, objectFit: "contain" }} /> : null}
          </h1>
          <p style={{ maxWidth: 700 }}>
            Witaj w swojej strefie członkowskiej. Tutaj możesz zarządzać dostępem do materiałów, dokumentów i narzędzi dla członków.
          </p>

          <div style={{ display: "grid", gap: 18, marginTop: 32 }}>
            <div style={{ border: "1px solid #d5d9df", borderRadius: 12, padding: 18 }}>
              <strong>Login:</strong> {session.username}
            </div>
            {session.role === "admin" ? (
              <div style={{ border: "1px solid #d5d9df", borderRadius: 12, padding: 18 }}>
                <strong>Rola:</strong> Administrator
              </div>
            ) : null}
            {session.role !== "admin" ? <MemberProfileSection profile={profile} /> : null}
            <div style={{ border: "1px solid #d5d9df", borderRadius: 12, padding: 18 }}>
              <strong>Strefy dostępne:</strong>
              <ul style={{ margin: "12px 0 0 18px" }}>
                <li><a href="/tresc/dla-czlonkow">Dane Epi-Geo</a></li>
                <li><a href="/member/dokumenty">Dokumenty dla członków</a></li>
                {session.role === "admin" && <li><a href="/admin/uzytkownicy">Zarządzanie użytkownikami</a></li>}
              </ul>
            </div>
            {session.role === "admin" ? <ExportPermitOptions /> : null}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
