import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { deleteManagedPost, updateManagedPost } from "../../../../lib/managed-posts";
import { recordAuditEventSafely } from "../../../../lib/audit-log";

async function requireAdmin() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  return session?.role === "admin" ? session : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const form = await request.formData();
  try {
    await updateManagedPost(id, { title: String(form.get("title") ?? ""), excerpt: String(form.get("excerpt") ?? ""), seoTitle: form.has("seoTitle") ? String(form.get("seoTitle")) : undefined, seoDescription: form.has("seoDescription") ? String(form.get("seoDescription")) : undefined, imageFit: form.has("imageFit") ? String(form.get("imageFit")) : undefined, content: String(form.get("content") ?? ""), category: String(form.get("category") ?? ""), source: String(form.get("source") ?? ""), image: form.get("image") instanceof File ? form.get("image") as File : null, attachments: form.getAll("attachments").filter((item): item is File => item instanceof File && item.size > 0) });
    await recordAuditEventSafely({ actor: session, eventType: "post_update", result: "success", targetType: "post", targetId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await recordAuditEventSafely({ actor: session, eventType: "post_update", result: "failure", targetType: "post", targetId: id, details: { error: error instanceof Error ? error.message : "unknown_error" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się zapisać wpisu." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    const deleted = await deleteManagedPost(id);
    await recordAuditEventSafely({ actor: session, eventType: "post_delete", result: deleted ? "success" : "failure", targetType: "post", targetId: id, details: deleted ? {} : { reason: "not_found" } });
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Nie znaleziono wpisu." }, { status: 404 });
  } catch (error) {
    await recordAuditEventSafely({ actor: session, eventType: "post_delete", result: "failure", targetType: "post", targetId: id, details: { error: error instanceof Error ? error.message : "unknown_error" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się usunąć wpisu." }, { status: 400 });
  }
}