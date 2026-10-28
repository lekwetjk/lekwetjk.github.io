import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { deleteBulletinReport, updatePreparedBulletinReport } from "../../../../lib/bulletin-reports";
import { recordAuditEventSafely } from "../../../../lib/audit-log";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    const form = await request.formData();
    const modelFile = form.get("model");
    const pdfFile = form.get("pdf");
    const revision = form.get("revision");
    if (!(modelFile instanceof File) || !modelFile.size || typeof revision !== "string" || !revision) {
      return NextResponse.json({ error: "Brak modelu lub wersji aktualizowanego wydania." }, { status: 400 });
    }
    await updatePreparedBulletinReport({
      id, expectedRevision: revision, modelFile,
      pdfFile: pdfFile instanceof File && pdfFile.size ? pdfFile : undefined,
      createdBy: session.username,
    });
    await recordAuditEventSafely({ actor: session, eventType: "report_update", result: "success", targetType: "report", targetId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await recordAuditEventSafely({ actor: session, eventType: "report_update", result: "failure", targetType: "report", targetId: id, details: { reason: "operation_failed" } });
    const message = error instanceof Error ? error.message : "Nie udało się zaktualizować raportu.";
    return NextResponse.json({ error: message }, { status: message.includes("zostało zmienione") ? 409 : 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    await deleteBulletinReport(id);
    await recordAuditEventSafely({ actor: session, eventType: "report_delete", result: "success", targetType: "report", targetId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await recordAuditEventSafely({ actor: session, eventType: "report_delete", result: "failure", targetType: "report", targetId: id, details: { error: error instanceof Error ? error.message : "unknown_error" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się usunąć raportu." }, { status: 400 });
  }
}