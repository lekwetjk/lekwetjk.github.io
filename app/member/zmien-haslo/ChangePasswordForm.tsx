"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAfterReset = searchParams.get("reset") === "1";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (newPassword.length < 8) {
      setMessage("Nowe hasło musi mieć co najmniej 8 znaków.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Powtórzone hasło nie jest takie samo.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/member/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "Nie udało się zmienić hasła.");
        return;
      }

      router.push("/member/profil");
      router.refresh();
    } catch {
      setMessage("Nie udało się połączyć z usługą zmiany hasła.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14, maxWidth: 460 }}>
      {isAfterReset ? (
        <p style={{ margin: 0, color: "#475569" }}>
          Zalogowano hasłem tymczasowym. Ustaw nowe hasło, aby kontynuować.
        </p>
      ) : null}

      <label>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Obecne hasło</div>
        <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }} />
      </label>
      <label>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Nowe hasło</div>
        <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }} />
      </label>
      <label>
        <div style={{ marginBottom: 6, fontWeight: 600 }}>Powtórz nowe hasło</div>
        <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }} />
      </label>

      {message ? <p style={{ color: "#b91c1c", margin: 0, fontWeight: 600 }}>{message}</p> : null}

      <button type="submit" disabled={isSubmitting} style={{ padding: "12px 18px", background: "#1f3a5f", color: "white", border: "none", borderRadius: 8, cursor: isSubmitting ? "wait" : "pointer", fontWeight: 700 }}>
        {isSubmitting ? "Zapisywanie..." : "Zapisz nowe hasło"}
      </button>
    </form>
  );
}