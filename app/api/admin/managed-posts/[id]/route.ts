import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { deleteManagedPost, updateManagedPost } from "../../../../lib/managed-posts";

async function requireAdmin() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  return session?.role === "admin";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  try {
    await updateManagedPost(id, { title: String(form.get("title") ?? ""), excerpt: String(form.get("excerpt") ?? ""), content: String(form.get("content") ?? ""), category: String(form.get("category") ?? ""), source: String(form.get("source") ?? ""), image: form.get("image") instanceof File ? form.get("image") as File : null, attachments: form.getAll("attachments").filter((item): item is File => item instanceof File && item.size > 0) });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się zapisać wpisu." }, { status: 400 }); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  return (await deleteManagedPost(id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Nie znaleziono wpisu." }, { status: 404 });
}