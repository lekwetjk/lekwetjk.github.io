"use client";

import { useEffect, useState } from "react";

export default function ExportPermitOptions() {
  const [permits, setPermits] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/admin/member-profile/options")
      .then((response) => response.json())
      .then((data: { exportPermits?: string[] }) => setPermits(data.exportPermits ?? []));
  }, []);

  async function addPermit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/member-profile/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json() as { exportPermits?: string[]; error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Nie udało się dodać kraju.");
      return;
    }
    setPermits(data.exportPermits ?? []);
    setName("");
    setMessage("Kraj dodany");
  }

  return (
    <section style={{ marginTop: 18, padding: 16, border: "1px solid #d5d9df", borderRadius: 8 }}>
      <h2 style={{ margin: "0 0 8px" }}>Kraje uprawnień eksportowych</h2>
      <p style={{ margin: "0 0 12px", color: "#475569" }}>Nowe kraje pojawią się alfabetycznie w obu formularzach.</p>
      <form onSubmit={addPermit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nazwa kraju" aria-label="Nazwa kraju" style={{ flex: "1 1 240px", padding: 9, border: "1px solid #94a3b8", borderRadius: 6 }} />
        <button type="submit" style={{ padding: "9px 14px", background: "#1f3a5f", color: "white", border: 0, borderRadius: 6, fontWeight: 700 }}>Dodaj kraj</button>
      </form>
      {message ? <small style={{ display: "block", marginTop: 8, color: message === "Kraj dodany" ? "#166534" : "#b91c1c" }}>{message}</small> : null}
      <p style={{ margin: "12px 0 0", color: "#64748b", fontSize: 14 }}>{permits.join(", ")}</p>
    </section>
  );
}
