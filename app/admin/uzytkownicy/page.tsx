import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PageShell } from "../../components/SiteChrome";
import { AUTH_COOKIE_NAME, getMemberLogo, getMemberUsers, verifySessionToken } from "../../lib/auth";
import CreateUserForm from "./CreateUserForm";
import AdminUsersList from "./AdminUsersList";
import MemberReport from "./MemberReport";

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session || session.role !== "admin") {
    redirect("/login/czlonkowie?redirect=/admin/uzytkownicy");
  }

  const users = await getMemberUsers();
  const usersWithLogos = await Promise.all(users.map(async (user) => ({ user, logo: await getMemberLogo(user.id) })));

  return (
    <PageShell>
      <section className="simple-hero">
        <div className="shell" style={{ maxWidth: 980, paddingTop: 56, paddingBottom: 56 }}>
          <a
            href="/member/profil"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, color: "#1f3a5f", fontWeight: 700, textDecoration: "none" }}
          >
            <span aria-hidden="true">←</span> Powrót
          </a>
          <p className="article-kicker">Administracja</p>
          <h1>Zarządzanie użytkownikami</h1>
          <p>Lista użytkowników strefy członków.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
            <a href="/api/admin/users/export" style={{ display: "inline-flex", width: "fit-content", padding: "12px 18px", background: "#1f3a5f", color: "white", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>
              Pobierz dane członków w formacie .csv
            </a>
            <a href="#raport-czlonkow" style={{ display: "inline-flex", width: "fit-content", padding: "12px 18px", background: "#0f766e", color: "white", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>
              Generuj raport
            </a>
          </div>
          <div id="raport-czlonkow"><MemberReport /></div>
          <div style={{ marginTop: 28, marginBottom: 28 }}>
            <CreateUserForm />
          </div>

          <AdminUsersList users={usersWithLogos} />
        </div>
      </section>
    </PageShell>
  );
}
