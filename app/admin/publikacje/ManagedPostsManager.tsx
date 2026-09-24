"use client";

import { useEffect, useState } from "react";
import MarkdownEditor from "./MarkdownEditor";

type Post = {
  id: string;
  kind: "news" | "tender";
  slug: string;
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  content: string;
  category: string;
  source: string;
  createdAt: string;
  image: string | null;
  imageFit?: "contain" | "cover";
  imported?: boolean;
  attachments: Array<{ name: string }>;
};

type ImportablePost = { slug: string; title: string; date: string };

const tenderCategories = ["Zapytania ofertowe", "Zaproszenie do składania ofert", "Wybór wykonawcy", "Wyniki postępowania", "Informacja o unieważnieniu"];

export default function ManagedPostsManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [message, setMessage] = useState("");
  const [importablePosts, setImportablePosts] = useState<ImportablePost[]>([]);
  const [importing, setImporting] = useState(false);

  function toggleEditor(post: Post) {
    setEditing((current) => current?.id === post.id ? null : { id: post.id, content: post.content });
  }

  async function loadPosts() {
    const response = await fetch("/api/admin/managed-posts");
    const data = await response.json().catch(() => ({})) as { posts?: Post[]; importablePosts?: ImportablePost[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Nie udało się pobrać wpisów.");
    setPosts(data.posts ?? []);
    setImportablePosts(data.importablePosts ?? []);
    return data.posts ?? [];
  }

  async function importPost(slug: string) {
    setImporting(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("action", "import");
      form.set("slug", slug);
      const response = await fetch("/api/admin/managed-posts", { method: "POST", body: form });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Nie udało się zaimportować wpisu.");
      const updatedPosts = await loadPosts();
      const importedPost = updatedPosts.find((post) => post.slug === slug);
      setEditing(importedPost ? { id: importedPost.id, content: importedPost.content } : null);
      setMessage("Wpis jest dostępny do edycji. Zachowano adres i datę publikacji.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się zaimportować wpisu.");
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => { void loadPosts().catch((error) => setMessage(error instanceof Error ? error.message : "Nie udało się pobrać wpisów.")); }, []);

  async function savePost(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setMessage("");
    const response = await fetch(`/api/admin/managed-posts/${id}`, { method: "PATCH", body: new FormData(event.currentTarget) });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { setMessage(data.error ?? "Nie udało się zapisać wpisu."); return; }
    setEditing(null);
    setMessage("Zmiany zostały zapisane.");
    await loadPosts();
  }

  async function removePost(post: Post) {
    if (!window.confirm(`Usunąć wpis „${post.title}”? Tej operacji nie można cofnąć.`)) return;
    const response = await fetch(`/api/admin/managed-posts/${post.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { setMessage(data.error ?? "Nie udało się usunąć wpisu."); return; }
    setPosts((current) => current.filter((item) => item.id !== post.id));
    setMessage("Wpis został usunięty.");
  }

  return <section style={{ marginTop: 32, display: "grid", gap: 14 }}>
    <h2 style={{ margin: 0 }}>Opublikowane wpisy</h2>
    {message ? <p style={{ margin: 0, color: message.includes("Nie udało") ? "#b91c1c" : "#166534" }}>{message}</p> : null}
    {!posts.length ? <p style={{ margin: 0, color: "#475569" }}>Brak wpisów dodanych z panelu administratora.</p> : null}
    {importablePosts.map((post) => <article key={post.slug} style={{ border: "1px solid #d5d9df", borderRadius: 8, padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div><strong>{post.title}</strong><small style={{ display: "block", marginTop: 4 }}>Wpis z repozytorium · {new Date(post.date).toLocaleDateString("pl-PL")}</small></div>
      <button type="button" className="button button-outline" disabled={importing} onClick={() => void importPost(post.slug)}>{importing ? "Importowanie..." : "Włącz edycję w panelu"}</button>
    </article>)}
    {posts.map((post) => <article key={post.id} style={{ border: "1px solid #d5d9df", borderRadius: 8, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
        <div><strong>{post.title}</strong><small style={{ display: "block", color: "#475569", marginTop: 4 }}>{post.kind === "tender" ? post.category : "Aktualność"} · {new Date(post.createdAt).toLocaleDateString("pl-PL")}</small></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><a className="button button-outline" href={`/aktualnosci/${post.slug}`} target="_blank" rel="noreferrer">Otwórz wpis</a><button type="button" className="button button-outline" disabled={post.id.startsWith("preview-")} title={post.id.startsWith("preview-") ? "Edycja jest dostępna po wdrożeniu na Workerze." : undefined} onClick={() => toggleEditor(post)}>Edytuj</button><button type="button" disabled={post.id.startsWith("preview-")} title={post.id.startsWith("preview-") ? "Usuwanie jest dostępne po wdrożeniu na Workerze." : undefined} onClick={() => void removePost(post)} style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#b91c1c", borderRadius: 6, padding: "8px 12px", fontWeight: 700 }}>Usuń</button></div>
      </div>
      {editing?.id === post.id ? <form onSubmit={(event) => void savePost(event, post.id)} style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <label>Tytuł<input name="title" defaultValue={post.title} required style={{ width: "100%", padding: 10 }} /></label>
        {post.kind === "tender" ? <label>Kategoria<select name="category" defaultValue={post.category} style={{ width: "100%", padding: 10 }}>{tenderCategories.map((category) => <option key={category}>{category}</option>)}</select></label> : <input type="hidden" name="category" value="Aktualności" />}
        <label>Krótki opis<input name="excerpt" defaultValue={post.excerpt} required style={{ width: "100%", padding: 10 }} /></label>
        <fieldset style={{ margin: 0, padding: 0, border: 0, minWidth: 0, display: "grid", gap: 10 }}>
          <legend>SEO</legend>
          <label>Tytuł SEO (opcjonalnie)<input name="seoTitle" defaultValue={post.seoTitle ?? ""} maxLength={100} placeholder={post.title} style={{ width: "100%", padding: 10 }} /></label>
          <label>Opis SEO (opcjonalnie)<textarea name="seoDescription" defaultValue={post.seoDescription ?? ""} maxLength={240} rows={3} placeholder={post.excerpt} style={{ width: "100%", padding: 10 }} /></label>
        </fieldset>
        <label>Treść<MarkdownEditor name="content" value={editing.content} onChange={(content) => setEditing((current) => current?.id === post.id ? { ...current, content } : current)} rows={10} required /></label>
        <label>Nowa grafika (opcjonalnie)<input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <label>Dopasowanie grafiki<select name="imageFit" defaultValue={post.imageFit ?? "contain"} style={{ width: "100%", padding: 10 }}><option value="contain">Cały obraz</option><option value="cover">Wypełnij ramkę</option></select></label>
        <label>Dodaj załączniki (PDF, DOCX, XLSX)<input name="attachments" type="file" accept=".pdf,.docx,.xlsx" multiple /></label>
        {post.attachments.length ? <small>Obecne załączniki: {post.attachments.map((item) => item.name).join(", ")}</small> : null}
        <label>Link źródłowy<input name="source" type="url" defaultValue={post.source} style={{ width: "100%", padding: 10 }} /></label>
        <div style={{ display: "flex", gap: 8 }}><button type="submit" className="button button-primary">Zapisz zmiany</button><button type="button" className="button button-outline" onClick={() => setEditing(null)}>Anuluj</button></div>
      </form> : null}
    </article>)}
  </section>;
}