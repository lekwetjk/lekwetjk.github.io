import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { cancelStagedBulletinReport, completeStagedBulletinSource, createPreparedBulletinReport, finalizeStagedBulletinReport, listBulletinReports, stageBulletinDocumentText, stageBulletinReportSheet, stageBulletinReportSource } from "../../../lib/bulletin-reports";
import { recordAuditEventSafely } from "../../../lib/audit-log";

function publicReport(report: Awaited<ReturnType<typeof listBulletinReports>>[number]) {
  return {
    id: report.id,
    slug: report.slug,
    title: report.title,
    month: report.month,
    year: report.year,
    sheetCount: report.sheetCount,
    rowCount: report.rowCount,
    sourceCount: report.sources.length,
    createdAt: report.createdAt,
  };
}

async function getAdmin() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  return session?.role === "admin" ? session : null;
}

export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ reports: (await listBulletinReports()).map(publicReport) });
}

export async function POST(request: Request) {
  const session = await getAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let eventType = "report_create";
  let uploadId: string | undefined;
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      const input = await request.json() as Record<string, unknown>;
      uploadId = String(input.uploadId ?? "") || undefined;
      if (["sheet", "complete", "document"].includes(String(input.mode))) eventType = "report_stage";
      if (input.mode === "cancel") eventType = "report_cancel";
      if (input.mode === "sheet") {
        await stageBulletinReportSheet({
          uploadId: String(input.uploadId ?? ""), sourceIndex: Number(input.sourceIndex),
          sheet: input.sheet as Parameters<typeof stageBulletinReportSheet>[0]["sheet"], createdBy: session.username,
        });
        await recordAuditEventSafely({ actor: session, eventType, result: "success", targetType: "report_upload", targetId: uploadId, details: { mode: "sheet", sourceIndex: Number(input.sourceIndex) } });
        return NextResponse.json({ ok: true });
      }
      if (input.mode === "complete") {
        await completeStagedBulletinSource({
          uploadId: String(input.uploadId ?? ""), sourceIndex: Number(input.sourceIndex), sheetCount: Number(input.sheetCount),
          rowCount: Number(input.rowCount), cellCount: Number(input.cellCount), createdBy: session.username,
        });
        await recordAuditEventSafely({ actor: session, eventType, result: "success", targetType: "report_upload", targetId: uploadId, details: { mode: "complete", sourceIndex: Number(input.sourceIndex) } });
        return NextResponse.json({ ok: true });
      }
      if (input.mode === "document") {
        await stageBulletinDocumentText({
          uploadId: String(input.uploadId ?? ""), sourceIndex: Number(input.sourceIndex), sha256: String(input.sha256 ?? ""),
          text: String(input.text ?? ""), createdBy: session.username,
        });
        await recordAuditEventSafely({ actor: session, eventType, result: "success", targetType: "report_upload", targetId: uploadId, details: { mode: "document", sourceIndex: Number(input.sourceIndex) } });
        return NextResponse.json({ ok: true });
      }
      if (input.mode === "cancel") {
        await cancelStagedBulletinReport({ uploadId: String(input.uploadId ?? ""), createdBy: session.username });
        await recordAuditEventSafely({ actor: session, eventType: "report_cancel", result: "success", targetType: "report_upload", targetId: String(input.uploadId ?? "") });
        return NextResponse.json({ ok: true });
      }
      const report = await finalizeStagedBulletinReport({
        uploadId: String(input.uploadId ?? ""),
        month: Number(input.month),
        year: Number(input.year),
        createdBy: session.username,
      });
      await recordAuditEventSafely({ actor: session, eventType: "report_create", result: "success", targetType: "report", targetId: report.id });
      return NextResponse.json({ ok: true, report: publicReport(report) });
    }
    const form = await request.formData();
    if (form.get("mode") === "prepared") {
      const modelFile = form.get("model");
      const pdfValue = form.get("pdf");
      if (!(modelFile instanceof File) || !modelFile.size) return NextResponse.json({ error: "Brak pliku JSON modelu." }, { status: 400 });
      const report = await createPreparedBulletinReport({
        modelFile,
        pdfFile: pdfValue instanceof File && pdfValue.size ? pdfValue : undefined,
        createdBy: session.username,
      });
      await recordAuditEventSafely({ actor: session, eventType: "report_create", result: "success", targetType: "report", targetId: report.id, details: { mode: "prepared" } });
      return NextResponse.json({ ok: true, report: publicReport(report) });
    }
    if (form.get("mode") === "stage") {
      eventType = "report_stage";
      uploadId = String(form.get("uploadId") ?? "") || undefined;
      const file = form.get("source");
      if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Brak pliku." }, { status: 400 });
      const staged = await stageBulletinReportSource({
        uploadId: String(form.get("uploadId") ?? "") || undefined,
        file,
        createdBy: session.username,
      });
      await recordAuditEventSafely({ actor: session, eventType, result: "success", targetType: "report_upload", targetId: staged.uploadId, details: { mode: "stage", fileName: file.name } });
      return NextResponse.json({ ok: true, ...staged });
    }
    return NextResponse.json({ error: "Nieobsługiwany tryb przesyłania." }, { status: 400 });
  } catch (error) {
    await recordAuditEventSafely({ actor: session, eventType, result: "failure", targetType: uploadId ? "report_upload" : "report", targetId: uploadId, details: { reason: "operation_failed" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się utworzyć raportu." }, { status: 400 });
  }
}