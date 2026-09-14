import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { TENDER_CATEGORIES, createManagedPost } from "../../../lib/managed-posts";

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