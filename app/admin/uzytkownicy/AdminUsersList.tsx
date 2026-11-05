"use client";

import { useMemo, useRef, useState } from "react";
import { Save } from "lucide-react";

import type { MemberUser } from "../../lib/auth";
import type { MemberCompany } from "../../lib/member-companies";
import AdminMemberProfileForm from "./AdminMemberProfileForm";
import EditUserForm from "./EditUserForm";

type UserWithLogoState = {
  user: Omit<MemberUser, "passwordHash">;
  hasLogo: boolean;
  logoScale: number;
  companyId?: string;
};

export default function AdminUsersList({ users, companies = [] }: { users: UserWithLogoState[]; companies?: MemberCompany[] }) {
  const [sortBy, setSortBy] = useState<"name" | "role">("name");
  const [descending, setDescending] = useState(false);
  const [query, setQuery] = useState("");

  const sortedUsers = useMemo(() => users.filter(({ user, companyId }) => {
    const company = companies.find(item => item.id === companyId)?.name ?? "";
    return `${user.name} ${user.username} ${company}`.toLocaleLowerCase("pl").includes(query.trim().toLocaleLowerCase("pl"));
  }).sort((left, right) => {
    const leftValue = sortBy === "name" ? left.user.name : left.user.role;
    const rightValue = sortBy === "name" ? right.user.name : right.user.role;
    const result = leftValue.localeCompare(rightValue, "pl", { sensitivity: "base" });
    return descending ? -result : result;
  }), [companies, descending, query, sortBy, users]);

  return (
    <div style={{ marginTop: 28, border: "1px solid #d5d9df", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 10, padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <input type="search" aria-label="Szukaj użytkownika lub firmy" placeholder="Użytkownik, login lub firma" value={query} onChange={event => setQuery(event.target.value)} style={{ flex: "1 1 220px", minWidth: 0, padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 4 }} />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#475569", fontSize: 14 }}>
          Sortuj po
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "name" | "role")} style={{ padding: "6px 8px" }}>
            <option value="name">Nazwie</option>
            <option value="role">Roli</option>
          </select>
        </label>
        <button type="button" onClick={() => setDescending((current) => !current)} style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", color: "#1f3a5f", fontWeight: 600 }}>
          {descending ? "Z malejąco" : "Rosnąco"}
        </button>
      </div>
      <div className="admin-users-grid" style={{ padding: "12px 16px", background: "#f8fafc", color: "#475569", fontSize: 13, fontWeight: 700 }}>
        <span>Nazwa</span>
        <span>Rola</span>
        <span>Akcje</span>
      </div>
      {sortedUsers.map(({ user, hasLogo, logoScale, companyId }) => (
        <UserRow key={user.id} user={user} hasLogo={hasLogo} logoScale={logoScale} companyId={companyId} companies={companies} />
      ))}
      {sortedUsers.length === 0 ? <p role="status" style={{ padding: 16 }}>Brak użytkowników.</p> : null}
    </div>
  );
}

function UserRow({ user, hasLogo, logoScale, companyId, companies }: UserWithLogoState & { companies: MemberCompany[] }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [expanded, setExpanded] = useState(false);

  async function toggleAccountState(nextStatus: boolean) {
    const response = await fetch(`/api/admin/users/${user.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: nextStatus }),
    });

    if (response.ok) {
      window.location.reload();
    }
  }

  return (
    <details ref={detailsRef} onToggle={event => setExpanded(event.currentTarget.open)} style={{ borderTop: "1px solid #e2e8f0" }}>
      <summary className="admin-users-grid" style={{ listStyle: "none", alignItems: "center", padding: "14px 16px", cursor: "pointer" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {hasLogo ? <img src={`/api/admin/users/${encodeURIComponent(user.id)}/logo`} alt={`Logo ${user.name}`} style={{ width: 38, height: 38, objectFit: "contain" }} /> : null}
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
            <strong style={{ display: "block" }}>{user.name}</strong>
            <small style={{ color: "#475569" }}>Login: {user.username}</small>
            {user.role === "member" && companies.length > 0 ? <small style={{ display: "block", color: "#116b53" }}>Firma: {companies.find(company => company.id === companyId)?.name ?? user.name}</small> : null}
          </span>
        </span>
        <span>{user.role === "admin" ? "Administrator" : "Członek"}{!user.isActive ? <small style={{ display: "block", color: "#92400e" }}>Zablokowany</small> : null}</span>
        <span style={{ color: "#1f3a5f", fontWeight: 700 }}>Edytuj</span>
      </summary>
      <div style={{ padding: "0 16px 18px", display: "grid", gap: 16 }}>
        <EditUserForm user={{ id: user.id, username: user.username, name: user.name, role: user.role, hasLogo, logoScale }} onSaved={() => { if (detailsRef.current) detailsRef.current.open = false; }} />
        {expanded && user.role === "member" && companyId && companies.length > 0 ? <CompanyAssignmentForm userId={user.id} companyId={companyId} companies={companies} /> : null}
        {user.id !== "member-admin" ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => void toggleAccountState(!user.isActive)} style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: user.isActive ? "#fef3c7" : "#dcfce7", color: user.isActive ? "#92400e" : "#166534", fontWeight: 700 }}>
              {user.isActive ? "Zablokuj konto" : "Odblokuj konto"}
            </button>
            <form action="/api/admin/users/delete" method="post" style={{ margin: 0 }}>
              <input type="hidden" name="userId" value={user.id} />
              <button type="submit" disabled={user.id === "member-admin"} style={{ padding: "8px 12px", border: "1px solid #fecaca", borderRadius: 6, background: "#fff1f2", color: "#b91c1c", fontWeight: 700, opacity: user.id === "member-admin" ? 0.5 : 1 }}>
                Usuń użytkownika
              </button>
            </form>
          </div>
        ) : null}
        {user.id !== "member-admin" ? (
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Profil członkowski</summary>
            {expanded ? <AdminMemberProfileForm userId={user.id} /> : null}
          </details>
        ) : null}
      </div>
    </details>
  );
}

function CompanyAssignmentForm({ userId, companyId, companies }: { userId: string; companyId: string; companies: MemberCompany[] }) {
  const [selectedId, setSelectedId] = useState(companyId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/company`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: selectedId }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Nie udało się zapisać przypisania.");
      }
      window.location.reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Błąd połączenia.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end", borderTop: "1px solid #d5d9df", paddingTop: 16 }}>
      <label style={{ flex: "1 1 240px", minWidth: 0 }}>
        <strong style={{ display: "block", marginBottom: 6 }}>Firma użytkownika</strong>
        <select value={selectedId} disabled={busy} onChange={event => setSelectedId(event.target.value)} style={{ width: "100%", padding: 10 }}>
          {companies.map(company => <option key={company.id} value={company.id}>{company.name} ({company.userCount} kont; {company.id.slice(-6)})</option>)}
        </select>
      </label>
      <button type="submit" disabled={busy || selectedId === companyId} style={{ display: "inline-flex", gap: 8, alignItems: "center", padding: "11px 16px", border: "1px solid #116b53", borderRadius: 6, background: "#fff", color: "#116b53" }}>
        <Save size={16} aria-hidden="true" />{busy ? "Zapisywanie..." : "Zapisz firmę"}
      </button>
      {error ? <p role="alert" style={{ width: "100%", margin: 0, color: "#b91c1c" }}>{error}</p> : null}
    </form>
  );
}
