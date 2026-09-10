"use client";

import { useState } from "react";

export default function EditUserForm({ user, onSaved }: { user: { id: string; username: string; name: string; role: "member" | "admin"; hasLogo: boolean }; onSaved?: () => void }) {
  const [message, setMessage] = useState("");
  const [selectedLogo, setSelectedLogo] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    if (response.ok) {
      setMessage("Zmiany zapisane");
      onSaved?.();
    } else {
      setMessage("Nie udało się zapisać zmian");
    }
  }

  async function handleRemoveLogo() {
    const response = await fetch(`/api/admin/users/${user.id}/logo`, { method: "POST" });
    setMessage(response.ok ? "Logo usunięte" : "Nie udało się usunąć logo");
  }

  async function handlePasswordReset() {
    setMessage("");
    setTemporaryPassword("");
    setIsResettingPassword(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/password-reset`, { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { temporaryPassword?: string; error?: string };

      if (!response.ok || !data.temporaryPassword) {
        setMessage(data.error ?? "Nie udało się zresetować hasła");
        return;
      }

      setTemporaryPassword(data.temporaryPassword);
      setMessage("Wygenerowano hasło tymczasowe");
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8, minWidth: 260 }}>
      <form onSubmit={handleSave} style={{ display: "grid", gap: 8 }}>
        <label>
          <span style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Login</span>
          <input name="username" defaultValue={user.username} style={{ width: "100%", padding: 8 }} />
        </label>
        <label>
          <span style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Imię i nazwisko</span>
          <input name="name" defaultValue={user.name} style={{ width: "100%", padding: 8 }} />
        </label>
        <label>
          <span style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Rola</span>
          <select name="role" defaultValue={user.role} style={{ width: "100%", padding: 8 }}>
            <option value="member">Członek</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        <label>
          <span style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Nowe hasło <small>(opcjonalnie)</small></span>
          <input name="password" type="password" placeholder="Pozostaw puste, aby nie zmieniać" style={{ width: "100%", padding: 8 }} />
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", color: "#1f3a5f", cursor: "pointer", fontWeight: 600 }}>
            Dodaj logo
            <input name="logo" type="file" accept=".jpg,.jpeg,.bmp,.png" onChange={(event) => setSelectedLogo(event.target.files?.[0]?.name ?? "")} style={{ display: "none" }} />
          </label>
          {selectedLogo ? <small style={{ color: "#475569" }}>{selectedLogo}</small> : null}
          <button type="button" disabled={!user.hasLogo} onClick={() => void handleRemoveLogo()} style={{ padding: "8px 12px", border: "1px solid #fecaca", background: "#fff1f2", color: "#b91c1c", borderRadius: 6, opacity: user.hasLogo ? 1 : 0.5 }}>
            Usuń logo
          </button>
        </div>
        <button type="submit" style={{ padding: "8px 12px", background: "#1f3a5f", color: "white", border: 0, borderRadius: 6, fontWeight: 700 }}>
          Zapisz zmiany
        </button>
        {message ? <small style={{ color: message.includes("zapisane") || message.includes("usunięte") ? "#166534" : "#b91c1c", fontWeight: 600 }}>{message}</small> : null}
      </form>
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10, display: "grid", gap: 8 }}>
        <button type="button" onClick={() => void handlePasswordReset()} disabled={isResettingPassword} style={{ padding: "8px 12px", border: "1px solid #f59e0b", background: "#fffbeb", color: "#92400e", borderRadius: 6, fontWeight: 700 }}>
          {isResettingPassword ? "Resetowanie..." : "Wygeneruj hasło tymczasowe"}
        </button>
        {temporaryPassword ? (
          <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#14532d", borderRadius: 6, padding: 10 }}>
            <strong style={{ display: "block", marginBottom: 4 }}>Hasło tymczasowe do przekazania użytkownikowi:</strong>
            <code style={{ display: "block", fontSize: 16, wordBreak: "break-all" }}>{temporaryPassword}</code>
            <small>Po zalogowaniu użytkownik zostanie poproszony o ustawienie własnego hasła.</small>
          </div>
        ) : null}
      </div>
    </div>
  );
}
