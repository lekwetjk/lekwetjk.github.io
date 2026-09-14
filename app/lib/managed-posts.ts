import crypto from "node:crypto";

import { desc, eq } from "drizzle-orm";
import { getDb, getMemberDocumentsBucket } from "../../db/index.ts";
import { managedPosts } from "../../db/schema.ts";
import type { NewsPost } from "./content";

export const TENDER_CATEGORIES = ["Zapytania ofertowe", "Zaproszenie do składania ofert", "Wybór wykonawcy", "Wyniki postępowania", "Informacja o unieważnieniu"];

function slugify(value: string) {
  return value.toLocaleLowerCase("pl").replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e").replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o").replace(/[ś]/g, "s").replace(/[żź]/g, "z").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function toPost(row: typeof managedPosts.$inferSelect): NewsPost {
  return { id: Number.parseInt(row.id.slice(0, 8), 16) || 0, slug: row.slug, title: row.title, date: row.createdAt, year: Number(row.createdAt.slice(0, 4)), excerpt: row.excerpt, paragraphs: row.content.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean), links: [], categories: [row.category], image: row.imageKey ? `/api/media/${encodeURIComponent(row.imageKey)}` : null, source: row.source };
}

export async function listManagedPosts(kind?: "news" | "tender") {
  const db = getDb();
  const rows = kind ? await db.select().from(managedPosts).where(eq(managedPosts.kind, kind)).orderBy(desc(managedPosts.createdAt)) : await db.select().from(managedPosts).orderBy(desc(managedPosts.createdAt));
  return rows.map(toPost);
}

export async function createManagedPost(input: { kind: "news" | "tender"; title: string; excerpt: string; content: string; category: string; source: string; image?: File | null; createdBy: string }) {
  const title = input.title.trim();
  if (!title || !input.excerpt.trim() || !input.content.trim()) throw new Error("Tytuł, opis i treść są wymagane.");
  if (input.kind === "tender" && !TENDER_CATEGORIES.includes(input.category)) throw new Error("Wybierz poprawną kategorię zapytania.");
  const db = getDb();
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
  await db.insert(managedPosts).values({ id, kind: input.kind, slug, title, excerpt: input.excerpt.trim(), content: input.content.trim(), category: input.kind === "news" ? "Aktualności" : input.category, imageKey, imageContentType, source: input.source.trim(), createdBy: input.createdBy });
  return slug;
}