"use client";

import { useEffect, useState } from "react";

export default function MemberDocumentsList() {
  const [documents, setDocuments] = useState<Array<{ title: string; href: string; fileName: string; uploadedAt: string }>>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDocuments() {
      try {
        const response = await fetch("/api/member/documents");
        if (!response.ok) {
          throw new Error("Failed to load documents");
        }

        const data = (await response.json()) as { isAdmin?: boolean; documents?: Array<{ title: string; fileName: string; uploadedAt: string }> };
        if (!mounted) return;

        setIsAdmin(data.isAdmin === true);
        setDocuments(
          (data.documents ?? []).map((document) => ({
            title: document.title,
            fileName: document.fileName,
            uploadedAt: document.uploadedAt,
            href: `/member/dokumenty/${encodeURIComponent(document.fileName)}`,
          })),
        );
      } catch {
        if (mounted) {
          setDocuments([]);
        }
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    }

    void loadDocuments();

    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return <p style={{ marginTop: 24 }}>Ładowanie dokumentów…</p>;
  }

  async function handleDelete(fileName: string) {
    if (!window.confirm(`Usunąć plik ${fileName}?`)) return;

    const response = await fetch(`/api/admin/member-documents/${encodeURIComponent(fileName)}`, { method: "DELETE" });
    if (response.ok) {
      setDocuments((current) => current.filter((document) => document.fileName !== fileName));
    }
  }

  if (documents.length === 0) {
    return <p style={{ marginTop: 24 }}>Brak dokumentów dostępnych dla członków.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, marginTop: 32, display: "grid", gap: 18 }}>
      {documents.map((document) => (
        <li key={document.href} style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
          <a
            href={document.href}
            style={{
              display: "flex",
              flex: 1,
              justifyContent: "space-between",
              padding: "16px 18px",
              border: "1px solid #d5d9df",
              borderRadius: 12,
              textDecoration: "none",
              color: "#0f172a",
              fontWeight: 600,
            }}
          >
            <span>
              {document.title}
            </span>
            <small style={{ color: "#64748b", fontWeight: 400, whiteSpace: "nowrap" }}>
              {new Date(document.uploadedAt).toLocaleDateString("pl-PL")}
            </small>
          </a>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => void handleDelete(document.fileName)}
              style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#b91c1c", borderRadius: 6, padding: "6px 10px", fontWeight: 600 }}
            >
              Usuń
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
