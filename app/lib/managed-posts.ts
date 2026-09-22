import crypto from "node:crypto";

import { desc, eq, sql } from "drizzle-orm";
import { getDb, getMemberDocumentsBucket } from "../../db/index.ts";
import { managedPosts } from "../../db/schema.ts";
import type { NewsPost } from "./content";

export const TENDER_CATEGORIES = ["Zapytania ofertowe", "Zaproszenie do składania ofert", "Wybór wykonawcy", "Wyniki postępowania", "Informacja o unieważnieniu"];
const PRODUCTION_API_BASE = "https://krd-ig-website-concept.lek-wet-jk.workers.dev";

async function ensureManagedPostsTable() {
  const db = getDb();
  await db.run(sql`CREATE TABLE IF NOT EXISTS managed_posts (id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, excerpt TEXT NOT NULL, content TEXT NOT NULL, category TEXT NOT NULL, image_key TEXT, image_content_type TEXT, source TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by TEXT NOT NULL)`);
  try { await db.run(sql`ALTER TABLE managed_posts ADD COLUMN attachments_json TEXT NOT NULL DEFAULT '[]'`); } catch { /* column exists */ }
  const columns = await db.all<{ name: string }>(sql`PRAGMA table_info(managed_posts)`);
  for (const [name, statement] of [
    ["seo_title", sql`ALTER TABLE managed_posts ADD COLUMN seo_title TEXT NOT NULL DEFAULT ''`],
    ["seo_description", sql`ALTER TABLE managed_posts ADD COLUMN seo_description TEXT NOT NULL DEFAULT ''`],
  ] as const) {
    if (columns.some((column) => column.name === name)) continue;
    try {
      await db.run(statement);
    } catch (error) {
      const currentColumns = await db.all<{ name: string }>(sql`PRAGMA table_info(managed_posts)`);
      if (!currentColumns.some((column) => column.name === name)) throw error;
    }
  }
  return db;
}

function validateSeo(input: { seoTitle?: string; seoDescription?: string }) {
  const seoTitle = input.seoTitle?.trim() ?? "";
  const seoDescription = input.seoDescription?.trim() ?? "";
  if (seoTitle.length > 100) throw new Error("Tytuł SEO może mieć maksymalnie 100 znaków.");
  if (seoDescription.length > 240) throw new Error("Opis SEO może mieć maksymalnie 240 znaków.");
  return { seoTitle, seoDescription };
}

function slugify(value: string) {
  return value.toLocaleLowerCase("pl").replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e").replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o").replace(/[ś]/g, "s").replace(/[żź]/g, "z").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function toPost(row: typeof managedPosts.$inferSelect): NewsPost {
  const attachments = JSON.parse(row.attachmentsJson || "[]") as Array<{ name: string; key: string }>;
  return { id: Number.parseInt(row.id.slice(0, 8), 16) || 0, slug: row.slug, title: row.title, date: row.createdAt, year: Number(row.createdAt.slice(0, 4)), excerpt: row.excerpt, seoTitle: row.seoTitle, seoDescription: row.seoDescription, paragraphs: row.content.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean), links: attachments.map((attachment) => ({ label: attachment.name, href: `/api/media/${encodeURIComponent(attachment.key)}`, document: true })), categories: [row.category], image: row.imageKey ? `/api/media/${encodeURIComponent(row.imageKey)}` : null, source: row.source };
}

export async function getManagedPostBySlug(slug: string) {
  try {
    const db = await ensureManagedPostsTable();
    const rows = await db.select().from(managedPosts).where(eq(managedPosts.slug, slug)).limit(1);
    return rows[0] ? toPost(rows[0]) : null;
  } catch {
    if (process.env.NODE_ENV !== "production") {
      try {
        const response = await fetch(`${PRODUCTION_API_BASE}/api/managed-posts`);
        const data = await response.json() as { posts?: NewsPost[] };
        return data.posts?.find((post) => post.slug === slug) ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function listManagedPosts(kind?: "news" | "tender") {
  const db = await ensureManagedPostsTable();
  const rows = kind ? await db.select().from(managedPosts).where(eq(managedPosts.kind, kind)).orderBy(desc(managedPosts.createdAt)) : await db.select().from(managedPosts).orderBy(desc(managedPosts.createdAt));
  return rows.map(toPost);
}

export async function createManagedPost(input: { kind: "news" | "tender"; title: string; excerpt: string; content: string; category: string; source: string; seoTitle?: string; seoDescription?: string; image?: File | null; attachments?: File[]; createdBy: string }) {
  const seo = validateSeo(input);
  const title = input.title.trim();
  if (!title || !input.excerpt.trim() || !input.content.trim()) throw new Error("Tytuł, opis i treść są wymagane.");
  if (input.kind === "tender" && !TENDER_CATEGORIES.includes(input.category)) throw new Error("Wybierz poprawną kategorię zapytania.");
  const db = await ensureManagedPostsTable();
  const id = crypto.randomUUID();
  const slug = `${slugify(title)}-${id.slice(0, 8)}`;
  let imageKey: string | null = null;
  let imageContentType: string | null = null;
  if (input.image?.size) {
    if (!input.image.type.startsWith("image/")) throw new Error("Dodaj plik graficzny.");
    imageKey = `managed-posts/${id}/${input.image.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    imageContentType = input.image.type;
    await getMemberDocumentsBucket().put(imageKey, await input.image.arrayBuffer(), { httpMetadata: { contentType: imageContentType } });
  }
  const attachments: Array<{ name: string; key: string }> = [];
  for (const attachment of input.attachments ?? []) {
    if (!/\.(pdf|docx|xlsx)$/i.test(attachment.name)) throw new Error("Załączniki mogą być tylko w formacie PDF, DOCX lub XLSX.");
    const key = `managed-posts/${id}/attachments/${attachment.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    await getMemberDocumentsBucket().put(key, await attachment.arrayBuffer(), { httpMetadata: { contentType: attachment.type || "application/octet-stream" } });
    attachments.push({ name: attachment.name, key });
  }
  await db.insert(managedPosts).values({ id, kind: input.kind, slug, title, excerpt: input.excerpt.trim(), ...seo, content: input.content.trim(), category: input.kind === "news" ? "Aktualności" : input.category, imageKey, imageContentType, source: input.source.trim(), attachmentsJson: JSON.stringify(attachments), createdBy: input.createdBy });
  return slug;
}

type ManagedAttachment = { name: string; key: string };

function parseAttachments(value: string) {
  try { return JSON.parse(value || "[]") as ManagedAttachment[]; } catch { return []; }
}

export async function listManagedPostsForAdmin() {
  const db = await ensureManagedPostsTable();
  const rows = await db.select().from(managedPosts).orderBy(desc(managedPosts.createdAt));
  return rows.map((row) => ({
    id: row.id, kind: row.kind as "news" | "tender", slug: row.slug, title: row.title, excerpt: row.excerpt,
    seoTitle: row.seoTitle, seoDescription: row.seoDescription,
    content: row.content, category: row.category, source: row.source, createdAt: row.createdAt,
    image: row.imageKey ? `/api/media/${encodeURIComponent(row.imageKey)}` : null,
    attachments: parseAttachments(row.attachmentsJson),
  }));
}

export async function updateManagedPost(id: string, input: { title: string; excerpt: string; content: string; category: string; source: string; seoTitle?: string; seoDescription?: string; image?: File | null; attachments?: File[] }) {
  const db = await ensureManagedPostsTable();
  const rows = await db.select().from(managedPosts).where(eq(managedPosts.id, id)).limit(1);
  const existing = rows[0];
  if (!existing) throw new Error("Nie znaleziono wpisu.");
  const seo = validateSeo({ seoTitle: input.seoTitle ?? existing.seoTitle, seoDescription: input.seoDescription ?? existing.seoDescription });
  if (!input.title.trim() || !input.excerpt.trim() || !input.content.trim()) throw new Error("Tytuł, opis i treść są wymagane.");
  if (existing.kind === "tender" && !TENDER_CATEGORIES.includes(input.category)) throw new Error("Wybierz poprawną kategorię zapytania.");

  const bucket = getMemberDocumentsBucket();
  let imageKey = existing.imageKey;
  let imageContentType = existing.imageContentType;
  if (input.image?.size) {
    if (!input.image.type.startsWith("image/")) throw new Error("Dodaj plik graficzny.");
    const nextKey = `managed-posts/${id}/${input.image.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    await bucket.put(nextKey, await input.image.arrayBuffer(), { httpMetadata: { contentType: input.image.type } });
    if (existing.imageKey && existing.imageKey !== nextKey) await bucket.delete(existing.imageKey);
    imageKey = nextKey;
    imageContentType = input.image.type;
  }

  const attachments = parseAttachments(existing.attachmentsJson);
  for (const attachment of input.attachments ?? []) {
    if (!/\.(pdf|docx|xlsx)$/i.test(attachment.name)) throw new Error("Załączniki mogą być tylko w formacie PDF, DOCX lub XLSX.");
    const key = `managed-posts/${id}/attachments/${attachment.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    await bucket.put(key, await attachment.arrayBuffer(), { httpMetadata: { contentType: attachment.type || "application/octet-stream" } });
    attachments.push({ name: attachment.name, key });
  }

  await db.update(managedPosts).set({ title: input.title.trim(), excerpt: input.excerpt.trim(), ...seo, content: input.content.trim(), category: existing.kind === "news" ? "Aktualności" : input.category, source: input.source.trim(), imageKey, imageContentType, attachmentsJson: JSON.stringify(attachments), updatedAt: new Date().toISOString() }).where(eq(managedPosts.id, id));
}

export async function deleteManagedPost(id: string) {
  const db = await ensureManagedPostsTable();
  const rows = await db.select().from(managedPosts).where(eq(managedPosts.id, id)).limit(1);
  const existing = rows[0];
  if (!existing) return false;
  const bucket = getMemberDocumentsBucket();
  if (existing.imageKey) await bucket.delete(existing.imageKey);
  for (const attachment of parseAttachments(existing.attachmentsJson)) await bucket.delete(attachment.key);
  await db.delete(managedPosts).where(eq(managedPosts.id, id));
  return true;
}