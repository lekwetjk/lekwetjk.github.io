"use client";

import { useState } from "react";

export default function ExportMemberDocumentsButton() {
  const [status, setStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/member-documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => ({ ok: false, error: `Błąd wysyłania pliku (${response.status}).` }))) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        if (response.status === 413) {
          throw new Error("Plik jest za duży. Maksymalny rozmiar to 100 MB.");
        }

        throw new Error(data.error ?? "Nie udało się wysłać pliku.");
      }

      setStatus(`Przesłano: ${file.name}`);
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nie udało się wysłać pliku.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div style={{ marginTop: 24, marginBottom: 18, display: "grid", gap: 12 }}>
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          width: "fit-content",
          padding: "12px 18px",
          background: "#1f3a5f",
          color: "white",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.zip,.rar,.7z,.tar,.gz,.bz2,.xz"
          onChange={handleUpload}
          disabled={isUploading}
          style={{ display: "none" }}
        />
        {isUploading ? "Wysyłanie..." : "Prześlij plik dla członków"}
      </label>
      <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>PDF, DOC, DOCX, TXT oraz archiwa do 100 MB.</p>
      {status ? <p style={{ margin: 0, color: status.startsWith("Przesłano") ? "#166534" : "#b91c1c" }}>{status}</p> : null}
    </div>
  );
}
