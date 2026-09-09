"use client";

import { useMemo, useRef, useState } from "react";

import type { MemberUser } from "../../lib/auth";
import AdminMemberProfileForm from "./AdminMemberProfileForm";
import EditUserForm from "./EditUserForm";

type UserWithLogo = {
  user: MemberUser;
  logo: { content: string; contentType: string } | null;
};

export default function AdminUsersList({ users }: { users: UserWithLogo[] }) {
  const [sortBy, setSortBy] = useState<"name" | "role">("name");
  const [descending, setDescending] = useState(false);

  const sortedUsers = useMemo(() => [...users].sort((left, right) => {
    const leftValue = sortBy === "name" ? left.user.name : left.user.role;
    const rightValue = sortBy === "name" ? right.user.name : right.user.role;
    const result = leftValue.localeCompare(rightValue, "pl", { sensitivity: "base" });
    return descending ? -result : result;
  }), [descending, sortBy, users]);

  return (
    <div style={{ marginTop: 28, border: "1px solid #d5d9df", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 180px 120px", gap: 16, padding: "12px 16px", background: "#f8fafc", color: "#475569", fontSize: 13, fontWeight: 700 }}>
        <span>Nazwa</span>
        <span>Rola</span>
        <span>Akcje</span>
      </div>
      {sortedUsers.map(({ user, logo }) => (
        <UserRow key={user.id} user={user} logo={logo} />
      ))}
    </div>
  );
}

function UserRow({ user, logo }: UserWithLogo) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

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
    <details ref={detailsRef} style={{ borderTop: "1px solid #e2e8f0" }}>
      <summary style={{ listStyle: "none", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 180px 120px", gap: 16, alignItems: "center", padding: "14px 16px", cursor: "pointer" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {logo ? <img src={`data:${logo.contentType};base64,${logo.content}`} alt={`Logo ${user.name}`} style={{ width: 38, height: 38, objectFit: "contain" }} /> : null}
          <span style={{ minWidth: 0 }}>
            <strong style={{ display: "block" }}>{user.name}</strong>
            <small style={{ color: "#475569" }}>Login: {user.username}</small>
          </span>
        </span>
        <span>{user.role === "admin" ? "Administrator" : "Członek"}</span>
        <span style={{ color: "#1f3a5f", fontWeight: 700 }}>Edytuj</span>
      </summary>
      <div style={{ padding: "0 16px 18px", display: "grid", gap: 16 }}>
        <EditUserForm user={{ id: user.id, username: user.username, name: user.name, role: user.role, hasLogo: Boolean(logo) }} onSaved={() => { if (detailsRef.current) detailsRef.current.open = false; }} />
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
            <AdminMemberProfileForm userId={user.id} />
          </details>
        ) : null}
      </div>
    </details>
  );
}
