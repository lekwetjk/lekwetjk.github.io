import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { TENDER_CATEGORIES, createManagedPost, listManagedPostsForAdmin } from "../../../lib/managed-posts";

const PRODUCTION_API_BASE = "https://krd-ig-website-concept.lek-wet-jk.workers.dev";

export async function GET(request: Request) {
  const sessionToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const session = verifySessionToken(sessionToken);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    return NextResponse.json({ posts: await listManagedPostsForAdmin() });
  } catch {
    if (new URL(request.url).hostname === "localhost" && sessionToken) {
      const response = await fetch(`${PRODUCTION_API_BASE}/api/managed-posts`);
      if (response.ok) {
        const data = await response.json() as { posts?: Array<{ slug: string; title: string; excerpt: string; paragraphs: string[]; categories: string[]; source: string; date: string; image: string | null }> };
        return NextResponse.json({ posts: (data.posts ?? []).map((post) => ({ id: `preview-${post.slug}`, kind: post.categories.includes("Aktualności") ? "news" : "tender", slug: post.slug, title: post.title, excerpt: post.excerpt, content: post.paragraphs.join("\n\n"), category: post.categories[0] ?? "", source: post.source, createdAt: post.date, image: post.image, attachments: [] })) });
      }
    }
    return NextResponse.json({ error: "Nie udało się pobrać wpisów." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const form = await request.formData();
  const kind = form.get("kind") === "tender" ? "tender" : "news";
  try {
    const slug = await createManagedPost({ kind, title: String(form.get("title") ?? ""), excerpt: String(form.get("excerpt") ?? ""), content: String(form.get("content") ?? ""), category: String(form.get("category") ?? ""), source: String(form.get("source") ?? ""), image: form.get("image") instanceof File ? form.get("image") as File : null, attachments: form.getAll("attachments").filter((item): item is File => item instanceof File && item.size > 0), createdBy: session.username });
    return NextResponse.json({ ok: true, slug, categories: TENDER_CATEGORIES });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się dodać wpisu." }, { status: 400 }); }
}