"use client";
import { useEffect, useRef, useState } from "react";
import MarkdownEditor from "./MarkdownEditor";
import { renderInlineMarkdown } from "../../lib/inlineMarkdown";

const tenderCategories = ["Zapytania ofertowe", "Zaproszenie do składania ofert", "Wybór wykonawcy", "Wyniki postępowania", "Informacja o unieważnieniu"];

export default function PublicationForm({ kind }: { kind: "news" | "tender" }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageFit, setImageFit] = useState<"contain" | "cover">("contain");
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const tender = kind === "tender";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const form = event.currentTarget;
    try { const response = await fetch("/api/admin/managed-posts", { method: "POST", body: new FormData(form) }); const data = await response.json().catch(() => ({})) as { error?: string }; if (!response.ok) throw new Error(data.error ?? "Nie udało się zapisać."); formRef.current?.reset(); setTitle(""); setExcerpt(""); setContent(""); setImagePreview(""); setImageName(""); setImageFit("contain"); setAttachmentNames([]); setMessage("Wpis został opublikowany."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Nie udało się zapisać."); } finally { setSaving(false); }
  }
  return <form ref={formRef} onSubmit={submit} style={{ display: "grid", gap: 12, border: "1px solid #d5d9df", borderRadius: 8, padding: 18 }}>
    <input type="hidden" name="kind" value={kind} />
    <h2 style={{ margin: 0 }}>{tender ? "Dodaj zapytanie ofertowe" : "Dodaj post"}</h2>
    <label>Tytuł<input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} style={{ width: "100%", padding: 10 }} /></label>
    {tender ? <label>Kategoria<select name="category" required defaultValue={tenderCategories[0]} style={{ width: "100%", padding: 10 }}>{tenderCategories.map((category) => <option key={category}>{category}</option>)}</select></label> : null}
    <label>Krótki opis<input name="excerpt" required value={excerpt} onChange={(event) => setExcerpt(event.target.value)} style={{ width: "100%", padding: 10 }} /></label>
    <fieldset style={{ margin: 0, padding: 0, border: 0, minWidth: 0, display: "grid", gap: 12 }}>
      <legend>SEO</legend>
      <label>Tytuł SEO (opcjonalnie)<input name="seoTitle" maxLength={100} placeholder={title} style={{ width: "100%", padding: 10 }} /></label>
      <label>Opis SEO (opcjonalnie)<textarea name="seoDescription" maxLength={240} rows={3} placeholder={excerpt} style={{ width: "100%", padding: 10 }} /></label>
    </fieldset>
    <label>Treść
      <MarkdownEditor name="content" required rows={10} value={content} onChange={setContent} />
    </label>
    <label className="button button-outline" style={{ width: "fit-content", cursor: "pointer" }}>Dodaj grafikę<input name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const image = event.target.files?.[0]; setImageName(image?.name ?? ""); setImagePreview(image ? URL.createObjectURL(image) : ""); }} style={{ display: "none" }} /></label>
    {imageName ? <small style={{ color: "#166534" }}>Wybrano grafikę: {imageName}</small> : null}
    <label>Dopasowanie grafiki<select name="imageFit" value={imageFit} onChange={(event) => setImageFit(event.target.value as "contain" | "cover")} style={{ width: "100%", padding: 10 }}><option value="contain">Cały obraz</option><option value="cover">Wypełnij ramkę</option></select></label>
    {imagePreview ? <img src={imagePreview} alt="Podgląd grafiki kafelka" style={{ width: "100%", maxWidth: 400, height: 220, objectFit: imageFit, objectPosition: "center", padding: imageFit === "contain" ? 16 : 0, background: "#fff", border: "1px solid #d5d9df" }} /> : null}
    <label className="button button-outline" style={{ width: "fit-content", cursor: "pointer" }}>Dodaj pliki<input name="attachments" type="file" accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple onChange={(event) => setAttachmentNames(Array.from(event.target.files ?? []).map((file) => file.name))} style={{ display: "none" }} /></label>
    {attachmentNames.length ? <small style={{ color: "#166534" }}>Wybrane pliki: {attachmentNames.join(", ")}</small> : null}
    <label>Link źródłowy (opcjonalnie)<input name="source" type="url" style={{ width: "100%", padding: 10 }} /></label>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button type="button" onClick={() => setPreview(true)} className="button button-outline">Podgląd</button><button type="submit" disabled={saving} className="button button-primary">{saving ? "Publikowanie..." : "Opublikuj"}</button></div>
    {message ? <p style={{ margin: 0, color: message.includes("opublikowany") ? "#166534" : "#b91c1c" }}>{message}</p> : null}
    {preview ? (
      <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", padding: 24, zIndex: 100, overflow: "auto" }}>
        <article style={{ maxWidth: 760, margin: "40px auto", background: "#fff", padding: 28, borderRadius: 8 }}>
          <button type="button" onClick={() => setPreview(false)} style={{ float: "right" }}>Zamknij</button>
          <p>{tender ? "Zapytanie ofertowe" : "Aktualność"}</p>
          <h1>{title || "Tytuł"}</h1>
          <p>{excerpt}</p>
          {imagePreview ? <img src={imagePreview} alt="Podgląd grafiki" style={{ width: "100%", height: 360, objectFit: imageFit, objectPosition: "center", padding: imageFit === "contain" ? 16 : 0, background: "#fff" }} /> : null}
          <div>{content.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => paragraph.startsWith("## ")
            ? <h2 key={index}>{renderInlineMarkdown(paragraph.slice(3), `preview-${index}`)}</h2>
            : <p key={index}>{renderInlineMarkdown(paragraph, `preview-${index}`)}</p>)}</div>
          {attachmentNames.length ? <section className="resource-box" aria-label="Pliki do pobrania"><h2>Pliki do pobrania</h2>{attachmentNames.map((name) => <p key={name} style={{ margin: "8px 0" }}><strong>{name}</strong></p>)}</section> : null}
        </article>
      </div>
    ) : null}
  </form>;
}