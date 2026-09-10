"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const DEFAULT_MEMBER_APP_BASE = "https://krd-ig-website-concept.lek-wet-jk.workers.dev";

function resolveMemberAppBase() {
  const configuredBase = process.env.NEXT_PUBLIC_MEMBER_APP_URL?.trim();

  if (configuredBase && /^https?:\/\//i.test(configuredBase)) {
    return configuredBase.replace(/\/+$/, "");
  }

  return "";
}

export default function MemberLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberAppBase = useMemo(resolveMemberAppBase, []);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const targetBase = memberAppBase || (window.location.hostname.endsWith("github.io") ? DEFAULT_MEMBER_APP_BASE : "");

    if (!targetBase || window.location.origin === targetBase) {
      return;
    }

    const targetUrl = new URL("/login/czlonkowie", targetBase);
    const redirect = searchParams.get("redirect");

    if (redirect) {
      targetUrl.searchParams.set("redirect", redirect);
    }

    setRedirectUrl(targetUrl.toString());
    window.location.replace(targetUrl.toString());
  }, [memberAppBase, searchParams]);

  async function handleLogout() {
    await fetch("/member/logout", { method: "POST" });
    router.refresh();
    router.push("/login/czlonkowie");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (redirectUrl) {
      window.location.assign(redirectUrl);
      return;
    }

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

      const data = (await response.json().catch(() => ({}))) as { error?: string; mustChangePassword?: boolean };

      if (!response.ok) {
        setError(data.error ?? "Nieprawidłowe dane logowania.");
        return;
      }

      const redirectTo = data.mustChangePassword ? "/member/zmien-haslo?reset=1" : searchParams.get("redirect") ?? "/member/profil";
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Wystąpił błąd podczas logowania. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", display: "grid", gap: 12 }}>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        {redirectUrl ? (
          <p style={{ color: "#475569", margin: 0, fontWeight: 600 }}>
            Przekierowuję do panelu logowania członków...
          </p>
        ) : null}

        <label>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Login</div>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            disabled={Boolean(redirectUrl)}
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
            disabled={Boolean(redirectUrl)}
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </label>

        {error ? (
          <p style={{ color: "#b91c1c", margin: 0, fontWeight: 600 }}>{error}</p>
        ) : null}

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="submit"
            disabled={isSubmitting || Boolean(redirectUrl)}
            style={{
              padding: "12px 18px",
              background: "#1f3a5f",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: isSubmitting || redirectUrl ? "wait" : "pointer",
              fontWeight: 700,
              flex: 1,
            }}
          >
            {isSubmitting ? "Logowanie..." : "Zaloguj się"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={Boolean(redirectUrl)}
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
      </form>

      <button
        type="button"
        onClick={() => {
          setIsResetOpen((current) => !current);
        }}
        style={{ border: "none", background: "transparent", color: "#1f3a5f", cursor: "pointer", fontWeight: 700, padding: 0, textAlign: "left" }}
      >
        Nie pamiętam hasła
      </button>

      {isResetOpen ? (
        <p style={{ color: "#475569", margin: 0, borderTop: "1px solid #e2e8f0", paddingTop: 12, fontWeight: 600 }}>
          Skontaktuj się z administratorem KRD-IG. Administrator wygeneruje hasło tymczasowe i po zalogowaniu ustawisz własne nowe hasło.
        </p>
      ) : null}
    </div>
  );
}
