import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { deleteMemberDocument, memberDocumentScope, normalizeMethodologyTitle, updateMethodologyDocumentTitle, validFileName } from "../../../../lib/member-documents";
import { recordAuditEventSafely } from "../../../../lib/audit-log";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (memberDocumentScope(request) !== "methodology") {
    return NextResponse.json({ error: "Nieprawidłowa sekcja dokumentów." }, { status: 400 });
  }
  const data: unknown = await request.json().catch(() => null);
  const title = normalizeMethodologyTitle(data && typeof data === "object" && "title" in data ? data.title : null);
  if (!title) {
    return NextResponse.json({ error: "Tytuł publikacji jest wymagany i może mieć maksymalnie 200 znaków." }, { status: 400 });
  }
  const { file } = await params;
  if (!validFileName(file)) {
    return NextResponse.json({ error: "Nieprawidłowa nazwa pliku." }, { status: 400 });
  }
  try {
    const updated = await updateMethodologyDocumentTitle(file, title);
    await recordAuditEventSafely({ actor: session, eventType: "document_update", result: updated ? "success" : "failure", targetType: "document", targetId: file, details: { title, reason: updated ? undefined : "not_found" } });
    return updated
      ? NextResponse.json({ ok: true, title })
      : NextResponse.json({ error: "Dokument nie został znaleziony." }, { status: 404 });
  } catch (error) {
    console.error("Failed to update methodology document title", error);
    await recordAuditEventSafely({ actor: session, eventType: "document_update", result: "failure", targetType: "document", targetId: file, details: { error: error instanceof Error ? error.message : "unknown_error" } });
    return NextResponse.json({ error: "Nie udało się zapisać tytułu publikacji." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const scope = memberDocumentScope(request);
  if (!scope) {
    return NextResponse.json({ error: "Nieprawidłowa sekcja dokumentów." }, { status: 400 });
  }

  const { file } = await params;
  if (!validFileName(file)) {
    return NextResponse.json({ error: "Nieprawidłowa nazwa pliku." }, { status: 400 });
  }
  try {
    const deleted = await deleteMemberDocument(file, scope);
    await recordAuditEventSafely({ actor: session, eventType: "document_delete", result: deleted ? "success" : "failure", targetType: "document", targetId: file, details: { scope, reason: deleted ? undefined : "not_found" } });

    return deleted
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Dokument nie został znaleziony." }, { status: 404 });
  } catch (error) {
    console.error("Failed to delete document", error);
    await recordAuditEventSafely({ actor: session, eventType: "document_delete", result: "failure", targetType: "document", targetId: file, details: { scope, error: error instanceof Error ? error.message : "unknown_error" } });
    return NextResponse.json({ error: "Nie udało się usunąć dokumentu." }, { status: 500 });
  }
}