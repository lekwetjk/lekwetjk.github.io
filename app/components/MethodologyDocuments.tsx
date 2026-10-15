"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MethodologyDocument = {
  title: string;
  fileName: string;
  uploadedAt: string;
};

const scope = "methodology";
const acceptedFileTypes = ".pdf,.docx,.xlsx,.jpg,.jpeg,.png";
const maxDocumentBytes = 100 * 1024 * 1024;

export function MethodologyDocuments({ manage = false }: { manage?: boolean }) {
  const [documents, setDocuments] = useState<MethodologyDocument[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editingFileName, setEditingFileName] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const uploadInput = useRef<HTMLInputElement>(null);
  const canManage = manage && isAdmin;

  const loadDocuments = useCallback(async () => {
    const response = await fetch(`/api/member/documents?scope=${scope}`, { cache: "no-store" });
    const data = (await response.json().catch(() => null)) as {
      isAdmin?: boolean;
      documents?: MethodologyDocument[];
      error?: string;
    } | null;

    if (!response.ok || !data || !Array.isArray(data.documents)) {
      throw new Error(data?.error ?? "Nie udało się pobrać listy materiałów.");
    }

    setIsAdmin(data?.isAdmin === true);
    setDocuments(data.documents);
  }, []);

  useEffect(() => {
    let active = true;

    loadDocuments()
      .catch((error) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Nie udało się pobrać listy materiałów.");
          setIsError(true);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadDocuments]);

  async function uploadFile(file: File, publicationTitle: string, replaceFileName = "") {
    if (file.size > maxDocumentBytes) {
      setMessage("Plik jest za duży. Maksymalny rozmiar to 100 MB.");
      setIsError(true);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", publicationTitle);
    if (replaceFileName) formData.append("replaceFileName", replaceFileName);

    setIsUploading(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch(`/api/admin/member-documents/upload?scope=${scope}`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? `Nie udało się przesłać pliku (${response.status}).`);
      }

      await loadDocuments();
      if (!replaceFileName) {
        setTitle("");
        setFile(null);
        if (uploadInput.current) uploadInput.current.value = "";
      }
      setMessage(replaceFileName ? `Zastąpiono: ${replaceFileName}` : `Dodano: ${file.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się przesłać pliku.");
      setIsError(true);
    } finally {
      setIsUploading(false);
    }
  }

  async function saveTitle(fileName: string) {
    setIsUploading(true);
    setMessage("");
    setIsError(false);
    try {
      const response = await fetch(`/api/admin/member-documents/${encodeURIComponent(fileName)}?scope=${scope}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingTitle }),
      });
      const data = (await response.json().catch(() => null)) as { title?: string; error?: string } | null;
      if (!response.ok || !data?.title) {
        throw new Error(data?.error ?? "Nie udało się zapisać tytułu publikacji.");
      }
      const savedTitle = data.title;
      setDocuments((current) => current.map((document) =>
        document.fileName === fileName ? { ...document, title: savedTitle } : document,
      ));
      setEditingFileName("");
      setMessage("Zapisano tytuł publikacji.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się zapisać tytułu publikacji.");
      setIsError(true);
    } finally {
      setIsUploading(false);
    }
  }

  async function deleteFile(fileName: string) {
    if (!window.confirm(`Usunąć materiał „${fileName}”?`)) return;

    setMessage("");
    setIsError(false);
    setIsUploading(true);
    try {
      const response = await fetch(
        `/api/admin/member-documents/${encodeURIComponent(fileName)}?scope=${scope}`,
        { method: "DELETE" },
      );
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Nie udało się usunąć materiału.");
      }
      setDocuments((current) => current.filter((document) => document.fileName !== fileName));
      setMessage(`Usunięto: ${fileName}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się usunąć materiału.");
      setIsError(true);
    } finally {
      setIsUploading(false);
    }
  }

  if (isLoading) {
    return <p>Ładowanie materiałów…</p>;
  }

  return (
    <section aria-label="Materiały do pobrania">
      {isAdmin && !manage ? <p><a href="/admin/metodyka-i-biuletyny">Zarządzaj materiałami →</a></p> : null}
      {canManage ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (file) void uploadFile(file, title);
          }}
          style={{ margin: "24px 0", padding: 20, border: "1px solid #d5d9df", borderRadius: 12, display: "grid", gap: 14 }}
        >
          <strong>Administracja materiałami</strong>
          <label style={{ display: "grid", gap: 6 }}>
            Tytuł publikacji
            <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required disabled={isUploading} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            Plik publikacji
            <input
              ref={uploadInput}
              name="file"
              type="file"
              accept={acceptedFileTypes}
              required
              disabled={isUploading}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {file ? <small>Wybrano: {file.name}</small> : null}
          <button type="submit" className="button button-primary" disabled={isUploading || !file || !title.trim()} style={{ width: "fit-content" }}>
            {isUploading ? "Zapisywanie…" : "Dodaj materiał"}
          </button>
          <small style={{ display: "block", marginTop: 10, color: "#64748b" }}>
            PDF, DOCX, XLSX, JPEG lub PNG, do 100 MB. Tytuł jest niezależny od nazwy pliku.
          </small>
        </form>
      ) : null}

      {message ? (
        <p role={isError ? "alert" : "status"} style={{ color: isError ? "#b91c1c" : "#166534" }}>
          {message}
        </p>
      ) : null}

      {documents.length === 0 && !isError ? (
        <p>Brak opublikowanych materiałów.</p>
      ) : (
        <ul className="metodyka-list">
          {documents.map((document) => (
            <li key={document.fileName}>
              <a href={`/member/dokumenty/${encodeURIComponent(document.fileName)}?scope=${scope}`}>
                <span>{document.title}</span>
                <span aria-hidden="true">→</span>
              </a>
              {canManage && editingFileName === document.fileName ? (
                <form onSubmit={(event) => { event.preventDefault(); void saveTitle(document.fileName); }} style={{ display: "grid", gap: 10, margin: "10px 0" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    Tytuł publikacji
                    <input name="title" value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} required maxLength={200} disabled={isUploading} />
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" className="button button-primary" disabled={isUploading || !editingTitle.trim()}>Zapisz tytuł</button>
                    <button type="button" className="button button-outline" disabled={isUploading} onClick={() => setEditingFileName("")}>Anuluj</button>
                  </div>
                </form>
              ) : null}
              {canManage ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 12px" }}>
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={isUploading}
                    onClick={() => { setEditingFileName(document.fileName); setEditingTitle(document.title); }}
                    style={{ padding: "7px 12px" }}
                  >
                    Edytuj tytuł
                  </button>
                  <label className="button button-outline" style={{ cursor: "pointer", padding: "7px 12px" }}>
                    <input
                      type="file"
                      accept={`.${document.fileName.split(".").pop()?.toLowerCase() ?? ""}`}
                      disabled={isUploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void uploadFile(file, document.title, document.fileName);
                        }
                        event.currentTarget.value = "";
                      }}
                      style={{ display: "none" }}
                    />
                    Zastąp
                  </label>
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={isUploading}
                    onClick={() => void deleteFile(document.fileName)}
                    style={{ padding: "7px 12px", color: "#b91c1c", borderColor: "#fecaca" }}
                  >
                    Usuń
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
