"use client";

import { useMemo, useState } from "react";

type ReportRow = {
  login: string;
  name: string;
  role: string;
  profile: {
    companyName?: string;
    selectedScopes?: string[];
    selectedSpecies?: string[];
    selectedCertifications?: string[];
    selectedExportPermits?: string[];
  } | null;
};

export default function MemberReport() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("");
  const [species, setSpecies] = useState("");
  const [certification, setCertification] = useState("");
  const [exportPermit, setExportPermit] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function loadReport() {
    const response = await fetch("/api/admin/users/report");
    if (response.ok) setRows((await response.json()).rows as ReportRow[]);
    setLoaded(true);
  }

  const options = useMemo(() => ({
    scopes: [...new Set(rows.flatMap((row) => row.profile?.selectedScopes ?? []))].sort(),
    species: [...new Set(rows.flatMap((row) => row.profile?.selectedSpecies ?? []))].sort(),
    certifications: [...new Set(rows.flatMap((row) => row.profile?.selectedCertifications ?? []))].sort(),
    exportPermits: [...new Set(rows.flatMap((row) => row.profile?.selectedExportPermits ?? []))].sort(),
  }), [rows]);

  const filteredRows = rows.filter((row) => {
    const text = `${row.name} ${row.login} ${row.profile?.companyName ?? ""}`.toLocaleLowerCase("pl");
    return (!query || text.includes(query.toLocaleLowerCase("pl")))
      && (!scope || row.profile?.selectedScopes?.includes(scope))
      && (!species || row.profile?.selectedSpecies?.includes(species))
      && (!certification || row.profile?.selectedCertifications?.includes(certification))
      && (!exportPermit || row.profile?.selectedExportPermits?.includes(exportPermit));
  });
  const hasActiveFilters = Boolean(query || scope || species || certification || exportPermit);

  function downloadFilteredCsv() {
    const headers = ["nazwa", "login", "rola", "firma", "zakres działalności", "gatunek drobiu", "certyfikaty", "uprawnienia eksportowe"];
    const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rowsCsv = filteredRows.map((row) => [
      row.name,
      row.login,
      row.role,
      row.profile?.companyName ?? "",
      row.profile?.selectedScopes?.join(", ") ?? "",
      row.profile?.selectedSpecies?.join(", ") ?? "",
      row.profile?.selectedCertifications?.join(", ") ?? "",
      row.profile?.selectedExportPermits?.join(", ") ?? "",
    ].map(csvCell).join(";"));
    const blob = new Blob([`\uFEFF${headers.map(csvCell).join(";")}\r\n${rowsCsv.join("\r\n")}\r\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "raport-czlonkow.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section style={{ marginTop: 18, border: "1px solid #d5d9df", borderRadius: 8, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Raport członków</h2>
        {!loaded ? <button type="button" onClick={() => void loadReport()} style={{ padding: "8px 12px", background: "#1f3a5f", color: "white", border: 0, borderRadius: 6, fontWeight: 700 }}>Załaduj dane</button> : null}
      </div>
      {loaded ? (
        <>
          <div style={{ marginTop: 16, padding: 16, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc" }}>
            <strong style={{ display: "block", marginBottom: 12, color: "#0f172a" }}>Filtry raportu</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
              <label style={{ display: "grid", gap: 5, color: "#334155", fontSize: 13, fontWeight: 700 }}>
                Szukaj
                <input placeholder="Nazwa, login lub firma" value={query} onChange={(event) => setQuery(event.target.value)} style={{ minHeight: 40, padding: "8px 10px", border: "1px solid #94a3b8", borderRadius: 6, background: "#fff", color: "#0f172a" }} />
              </label>
              <label style={{ display: "grid", gap: 5, color: "#334155", fontSize: 13, fontWeight: 700 }}>
                Zakres działalności
                <select value={scope} onChange={(event) => setScope(event.target.value)} style={{ minHeight: 40, padding: "8px 10px", border: "1px solid #94a3b8", borderRadius: 6, background: "#fff", color: "#0f172a" }}><option value="">Wszystkie zakresy</option>{options.scopes.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <label style={{ display: "grid", gap: 5, color: "#334155", fontSize: 13, fontWeight: 700 }}>
                Gatunek drobiu
                <select value={species} onChange={(event) => setSpecies(event.target.value)} style={{ minHeight: 40, padding: "8px 10px", border: "1px solid #94a3b8", borderRadius: 6, background: "#fff", color: "#0f172a" }}><option value="">Wszystkie gatunki</option>{options.species.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <label style={{ display: "grid", gap: 5, color: "#334155", fontSize: 13, fontWeight: 700 }}>
                Certyfikat
                <select value={certification} onChange={(event) => setCertification(event.target.value)} style={{ minHeight: 40, padding: "8px 10px", border: "1px solid #94a3b8", borderRadius: 6, background: "#fff", color: "#0f172a" }}><option value="">Wszystkie certyfikaty</option>{options.certifications.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <label style={{ display: "grid", gap: 5, color: "#334155", fontSize: 13, fontWeight: 700 }}>
                Uprawnienie eksportowe
                <select value={exportPermit} onChange={(event) => setExportPermit(event.target.value)} style={{ minHeight: 40, padding: "8px 10px", border: "1px solid #94a3b8", borderRadius: 6, background: "#fff", color: "#0f172a" }}><option value="">Wszystkie uprawnienia</option>{options.exportPermits.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <button
                type="button"
                disabled={!hasActiveFilters}
                onClick={() => { setQuery(""); setScope(""); setSpecies(""); setCertification(""); setExportPermit(""); }}
                style={{ alignSelf: "end", minHeight: 40, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 6, background: hasActiveFilters ? "#fff" : "#f1f5f9", color: hasActiveFilters ? "#1e293b" : "#94a3b8", fontWeight: 700, cursor: hasActiveFilters ? "pointer" : "not-allowed" }}
              >
                Wyczyść filtry
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
            <p style={{ margin: 0, color: "#475569" }}>Wyniki: {filteredRows.length}</p>
            <button type="button" onClick={downloadFilteredCsv} disabled={filteredRows.length === 0} style={{ padding: "9px 14px", border: "1px solid #0f766e", borderRadius: 6, background: filteredRows.length ? "#0f766e" : "#f1f5f9", color: filteredRows.length ? "#fff" : "#94a3b8", fontWeight: 700, cursor: filteredRows.length ? "pointer" : "not-allowed" }}>
              Pobierz wyniki CSV
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Nazwa", "Firma", "Zakres działalności", "Gatunek drobiu", "Certyfikaty", "Uprawnienia eksportowe"].map((heading) => <th key={heading} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #cbd5e1" }}>{heading}</th>)}</tr></thead>
              <tbody>{filteredRows.map((row) => <tr key={row.login}><td style={{ padding: 8 }}>{row.name}</td><td style={{ padding: 8 }}>{row.profile?.companyName ?? ""}</td><td style={{ padding: 8 }}>{row.profile?.selectedScopes?.join(", ") ?? ""}</td><td style={{ padding: 8 }}>{row.profile?.selectedSpecies?.join(", ") ?? ""}</td><td style={{ padding: 8 }}>{row.profile?.selectedCertifications?.join(", ") ?? ""}</td><td style={{ padding: 8 }}>{row.profile?.selectedExportPermits?.join(", ") ?? ""}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
