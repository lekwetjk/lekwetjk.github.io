"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MemberLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("czlonek");
  const [password, setPassword] = useState("Test123!");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    await fetch("/member/logout", { method: "POST" });
    router.refresh();
    router.push("/login/czlonkowie");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/member/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Nieprawidłowe dane logowania.");
        return;
      }

      const redirectTo = searchParams.get("redirect") ?? "/member/profil";
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Wystąpił błąd podczas logowania. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 420, margin: "0 auto" }}>
      <div style={{ display: "grid", gap: 12 }}>
        <label>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Login</div>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </label>

        <label>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Hasło</div>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </label>

        {error ? (
          <p style={{ color: "#b91c1c", margin: 0, fontWeight: 600 }}>{error}</p>
        ) : null}

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "12px 18px",
              background: "#1f3a5f",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: isSubmitting ? "wait" : "pointer",
              fontWeight: 700,
              flex: 1,
            }}
          >
            {isSubmitting ? "Logowanie..." : "Zaloguj się"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: "12px 18px",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              background: "#fff",
              color: "#0f172a",
              fontWeight: 600,
            }}
          >
            Wyloguj
          </button>
        </div>
      </div>
    </form>
  );
}
