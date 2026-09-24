import crypto from "node:crypto";

import { and, desc, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { getDb, getMemberDocumentsBucket } from "../../db/index.ts";
import { managedPosts } from "../../db/schema.ts";
import type { NewsPost } from "./content";
import generatedPosts from "../data/generated-posts.json" with { type: "json" };
import { getLocalManagedPostsDb } from "../../db/local-managed-posts.ts";

export const TENDER_CATEGORIES = ["Zapytania ofertowe", "Zaproszenie do składania ofert", "Wybór wykonawcy", "Wyniki postępowania", "Informacja o unieważnieniu"];
const PRODUCTION_API_BASE = "https://krd-ig-website-concept.lek-wet-jk.workers.dev";
const importablePosts = (generatedPosts as NewsPost[]).filter((post) => post.slug === "wybierz-twoje-wartosci");

async function ensureManagedPostsTable() {
  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch (error) {
    if (process.env.NODE_ENV !== "development") throw error;
    db = await getLocalManagedPostsDb();
  }
  await db.run(sql`CREATE TABLE IF NOT EXISTS managed_posts (id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, excerpt TEXT NOT NULL, content TEXT NOT NULL, category TEXT NOT NULL, image_key TEXT, image_content_type TEXT, source TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by TEXT NOT NULL)`);
  try { await db.run(sql`ALTER TABLE managed_posts ADD COLUMN attachments_json TEXT NOT NULL DEFAULT '[]'`); } catch { /* column exists */ }
  const columns = await db.all<{ name: string }>(sql`PRAGMA table_info(managed_posts)`);
  for (const [name, statement] of [
    ["seo_title", sql`ALTER TABLE managed_posts ADD COLUMN seo_title TEXT NOT NULL DEFAULT ''`],
    ["seo_description", sql`ALTER TABLE managed_posts ADD COLUMN seo_description TEXT NOT NULL DEFAULT ''`],
    ["image_fit", sql`ALTER TABLE managed_posts ADD COLUMN image_fit TEXT NOT NULL DEFAULT 'contain'`],
    ["deleted_at", sql`ALTER TABLE managed_posts ADD COLUMN deleted_at TEXT`],
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

function validateImageFit(value = "contain"): "contain" | "cover" {
  if (value !== "contain" && value !== "cover") throw new Error("Wybierz poprawne dopasowanie grafiki.");
  return value;
}

function validateSeo(input: { seoTitle?: string; seoDescription?: string }) {
  const seoTitle = input.seoTitle?.trim() ?? "";
  const seoDescription = input.seoDescription?.trim() ?? "";
  if (seoTitle.length > 100) throw new Error("Tytuł SEO może mieć maksymalnie 100 znaków.");
  if (seoDescription.length > 240) throw new Error("Opis SEO może mieć maksymalnie 240 znaków.");
  return { seoTitle, seoDescription };
}

function normalizePublicationMarkdown(value: string) {
  return value
    .replace(/<\s*(?:b|strong)\s*>([\s\S]*?)<\s*\/\s*(?:b|strong)\s*>/gi, "**$1**")
    .replace(/<\s*(?:i|em)\s*>([\s\S]*?)<\s*\/\s*(?:i|em)\s*>/gi, "*$1*")
    .replace(/<\s*h2\s*>([\s\S]*?)<\s*\/\s*h2\s*>/gi, "\n\n## $1\n\n")
    .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n")
    .trim();
}

function slugify(value: string) {
  return value.toLocaleLowerCase("pl").replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e").replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o").replace(/[ś]/g, "s").replace(/[żź]/g, "z").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function toPost(row: typeof managedPosts.$inferSelect): NewsPost {
  const attachments = JSON.parse(row.attachmentsJson || "[]") as Array<{ name: string; key: string }>;
  const original = importablePosts.find((post) => post.slug === row.slug);
  return { id: Number.parseInt(row.id.slice(0, 8), 16) || 0, slug: row.slug, title: row.title, date: row.createdAt, year: Number(row.createdAt.slice(0, 4)), excerpt: row.excerpt, seoTitle: row.seoTitle, seoDescription: row.seoDescription, paragraphs: normalizePublicationMarkdown(row.content).split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean), links: [...(original?.links ?? []), ...attachments.map((attachment) => ({ label: attachment.name, href: `/api/media/${encodeURIComponent(attachment.key)}`, document: true }))], categories: original?.categories ?? [row.category], image: row.imageKey ? `/api/media/${encodeURIComponent(row.imageKey)}` : original?.image ?? null, imageFit: row.imageFit, justify: original?.justify, source: row.source };
}

export async function importExistingPost(slug: string, createdBy: string) {
  const post = importablePosts.find((item) => item.slug === slug);
  if (!post) throw new Error("Ten wpis nie jest dostępny do importu.");
  const db = await ensureManagedPostsTable();
  await db.insert(managedPosts).values({
    id: crypto.randomUUID(), kind: "news", slug: post.slug, title: post.title,
    excerpt: post.excerpt, content: post.paragraphs.join("\n\n"), category: "Aktualności",
    imageFit: post.imageFit ?? "contain", source: post.source, createdAt: post.date,
    createdBy,
  }).onConflictDoNothing({ target: managedPosts.slug });
  return post.slug;
}

export async function listImportablePosts() {
  const db = await ensureManagedPostsTable();
  const rows = await db.select({ slug: managedPosts.slug }).from(managedPosts);
  return importablePosts.filter((post) => !rows.some((row) => row.slug === post.slug))
    .map((post) => ({ slug: post.slug, title: post.title, date: post.date }));
}

export async function resolvePublishedPost(slug: string, original?: NewsPost) {
  if (original && !importablePosts.some((post) => post.slug === slug)) return original;
  const managed = await getManagedPostState(slug);
  return managed === null ? undefined : managed ?? original;
}

export async function applyManagedPostOverrides(posts: NewsPost[]) {
  const resolved = await Promise.all(posts.map((post) => resolvePublishedPost(post.slug, post)));
  return resolved.filter((post): post is NewsPost => post !== undefined);
}

export async function getManagedPostBySlug(slug: string) {
  return await getManagedPostState(slug) ?? null;
}

async function getManagedPostState(slug: string): Promise<NewsPost | null | undefined> {
  try {
    const db = await ensureManagedPostsTable();
    const rows = await db.select().from(managedPosts).where(eq(managedPosts.slug, slug)).limit(1);
    return rows[0] ? rows[0].deletedAt ? null : toPost(rows[0]) : undefined;
  } catch {
    if (process.env.NODE_ENV !== "production") {
      try {
        const response = await fetch(`${PRODUCTION_API_BASE}/api/managed-posts`);
        const data = await response.json() as { posts?: NewsPost[]; deletedSlugs?: string[] };
        return data.deletedSlugs?.includes(slug) ? null : data.posts?.find((post) => post.slug === slug);
      } catch {
        return undefined;
      }
    }
    return null;
  }
}

export async function listDeletedPostSlugs() {
  const db = await ensureManagedPostsTable();
  const rows = await db.select({ slug: managedPosts.slug }).from(managedPosts).where(isNotNull(managedPosts.deletedAt));
  return rows.map((row) => row.slug);
}

export async function listManagedPosts(kind?: "news" | "tender") {
  const db = await ensureManagedPostsTable();
  const rows = await db.select().from(managedPosts).where(and(isNull(managedPosts.deletedAt), kind ? eq(managedPosts.kind, kind) : undefined)).orderBy(desc(managedPosts.createdAt));
  return rows.map(toPost);
}

export async function createManagedPost(input: { kind: "news" | "tender"; title: string; excerpt: string; content: string; category: string; source: string; seoTitle?: string; seoDescription?: string; imageFit?: string; image?: File | null; attachments?: File[]; createdBy: string }) {
  const seo = validateSeo(input);
  const imageFit = validateImageFit(input.imageFit);
  const title = input.title.trim();
  const content = normalizePublicationMarkdown(input.content).trim();
  if (!title || !input.excerpt.trim() || !content) throw new Error("Tytuł, opis i treść są wymagane.");
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
  await db.insert(managedPosts).values({ id, kind: input.kind, slug, title, excerpt: input.excerpt.trim(), ...seo, content, category: input.kind === "news" ? "Aktualności" : input.category, imageKey, imageContentType, imageFit, source: input.source.trim(), attachmentsJson: JSON.stringify(attachments), createdBy: input.createdBy });
  return slug;
}

type ManagedAttachment = { name: string; key: string };

function parseAttachments(value: string) {
  try { return JSON.parse(value || "[]") as ManagedAttachment[]; } catch { return []; }
}

export async function listManagedPostsForAdmin() {
  const db = await ensureManagedPostsTable();
  const rows = await db.select().from(managedPosts).where(isNull(managedPosts.deletedAt)).orderBy(desc(managedPosts.createdAt));
  return rows.map((row) => ({
    id: row.id, kind: row.kind as "news" | "tender", slug: row.slug, title: row.title, excerpt: row.excerpt,
    seoTitle: row.seoTitle, seoDescription: row.seoDescription,
    content: normalizePublicationMarkdown(row.content), category: row.category, source: row.source, createdAt: row.createdAt,
    image: toPost(row).image,
    imported: importablePosts.some((post) => post.slug === row.slug),
    imageFit: row.imageFit,
    attachments: parseAttachments(row.attachmentsJson),
  }));
}

export async function updateManagedPost(id: string, input: { title: string; excerpt: string; content: string; category: string; source: string; seoTitle?: string; seoDescription?: string; imageFit?: string; image?: File | null; attachments?: File[] }) {
  const db = await ensureManagedPostsTable();
  const rows = await db.select().from(managedPosts).where(eq(managedPosts.id, id)).limit(1);
  const existing = rows[0];
  if (!existing || existing.deletedAt) throw new Error("Nie znaleziono wpisu.");
  const seo = validateSeo({ seoTitle: input.seoTitle ?? existing.seoTitle, seoDescription: input.seoDescription ?? existing.seoDescription });
  const imageFit = validateImageFit(input.imageFit ?? existing.imageFit);
  const content = normalizePublicationMarkdown(input.content).trim();
  if (!input.title.trim() || !input.excerpt.trim() || !content) throw new Error("Tytuł, opis i treść są wymagane.");
  if (existing.kind === "tender" && !TENDER_CATEGORIES.includes(input.category)) throw new Error("Wybierz poprawną kategorię zapytania.");

  const bucket = input.image?.size || input.attachments?.some((file) => file.size)
    ? getMemberDocumentsBucket()
    : undefined;
  let imageKey = existing.imageKey;
  let imageContentType = existing.imageContentType;
  if (input.image?.size) {
    if (!input.image.type.startsWith("image/")) throw new Error("Dodaj plik graficzny.");
    const nextKey = `managed-posts/${id}/${input.image.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    await bucket!.put(nextKey, await input.image.arrayBuffer(), { httpMetadata: { contentType: input.image.type } });
    if (existing.imageKey && existing.imageKey !== nextKey) await bucket!.delete(existing.imageKey);
    imageKey = nextKey;
    imageContentType = input.image.type;
  }

  const attachments = parseAttachments(existing.attachmentsJson);
  for (const attachment of input.attachments ?? []) {
    if (!/\.(pdf|docx|xlsx)$/i.test(attachment.name)) throw new Error("Załączniki mogą być tylko w formacie PDF, DOCX lub XLSX.");
    const key = `managed-posts/${id}/attachments/${attachment.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    await bucket!.put(key, await attachment.arrayBuffer(), { httpMetadata: { contentType: attachment.type || "application/octet-stream" } });
    attachments.push({ name: attachment.name, key });
  }

  await db.update(managedPosts).set({ title: input.title.trim(), excerpt: input.excerpt.trim(), ...seo, content, category: existing.kind === "news" ? "Aktualności" : input.category, source: input.source.trim(), imageKey, imageContentType, imageFit, attachmentsJson: JSON.stringify(attachments), updatedAt: new Date().toISOString() }).where(eq(managedPosts.id, id));
}

export async function deleteManagedPost(id: string) {
  const db = await ensureManagedPostsTable();
  const rows = await db.select().from(managedPosts).where(eq(managedPosts.id, id)).limit(1);
  const existing = rows[0];
  if (!existing || existing.deletedAt) return false;
  const attachments = parseAttachments(existing.attachmentsJson);
  if (existing.imageKey || attachments.length) {
    const bucket = getMemberDocumentsBucket();
    if (existing.imageKey) await bucket.delete(existing.imageKey);
    for (const attachment of attachments) await bucket.delete(attachment.key);
  }
  await db.update(managedPosts).set({ deletedAt: new Date().toISOString() }).where(eq(managedPosts.id, id));
  return true;
}