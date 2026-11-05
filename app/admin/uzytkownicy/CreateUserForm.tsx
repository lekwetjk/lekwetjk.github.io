"use client";

import { useState } from "react";
import type { MemberCompany } from "../../lib/member-companies";

export default function CreateUserForm({ companies = [] }: { companies?: MemberCompany[] }) {
  const [username, setUsername] = useState("nowy-czlonek");
  const [name, setName] = useState("Nowy członek");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [password, setPassword] = useState("Test123!");
  const [message, setMessage] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users/create", {
      method: "POST",
      body: (() => { const formData = new FormData(); formData.append("username", username); formData.append("name", name); formData.append("role", role); formData.append("password", password); if (companyId && role === "member") formData.append("companyId", companyId); if (logo && !companyId) formData.append("logo", logo); return formData; })(),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się utworzyć użytkownika.");
      return;
    }

    setMessage(`Utworzono użytkownika ${data.user.username}.`);
    setUsername("");
    setName("");
    setPassword("Test123!");
    setRole("member");
    setLogo(null);
    setCompanyId("");
    window.location.reload();
    } catch {
      setMessage("Nie udało się połączyć z serwerem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ border: "1px solid #d5d9df", borderRadius: 12, padding: 18, display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Dodaj użytkownika</h2>

      <label>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Logo użytkownika (.jpg, .bmp, .png)</div>
        <input type="file" disabled={!!companyId || busy} accept=".jpg,.jpeg,.bmp,.png" onChange={(event) => setLogo(event.target.files?.[0] ?? null)} />
      </label>

      <label>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Login</div>
        <input value={username} onChange={(event) => setUsername(event.target.value)} style={{ width: "100%", padding: 10 }} />
      </label>

      <label>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Imię i nazwisko</div>
        <input value={name} onChange={(event) => setName(event.target.value)} style={{ width: "100%", padding: 10 }} />
      </label>

      <label>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Rola</div>
        <select value={role} onChange={(event) => { setRole(event.target.value as "member" | "admin"); setCompanyId(""); }} style={{ width: "100%", padding: 10 }}>
          <option value="member">Członek</option>
          <option value="admin">Administrator</option>
        </select>
      </label>

      {companies.length > 0 && role === "member" ? (
        <label>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Firma</div>
          <select value={companyId} disabled={busy} onChange={(event) => { setCompanyId(event.target.value); setLogo(null); }} style={{ width: "100%", padding: 10 }}>
            <option value="">Nowa firma / oddzielny profil</option>
            {companies.map(company => <option key={company.id} value={company.id}>{company.name} ({company.userCount} kont; {company.id.slice(-6)})</option>)}
          </select>
        </label>
      ) : null}

      <label>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Hasło</div>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} style={{ width: "100%", padding: 10 }} />
      </label>

      <button type="submit" disabled={busy} style={{ padding: "12px 18px", background: "#1f3a5f", color: "white", border: "none", borderRadius: 8, fontWeight: 700 }}>
        {busy ? "Zapisywanie..." : "Utwórz użytkownika"}
      </button>

      {message ? <p style={{ margin: 0, color: message.includes("Utworzono") ? "#166534" : "#b91c1c" }}>{message}</p> : null}
    </form>
  );
}
