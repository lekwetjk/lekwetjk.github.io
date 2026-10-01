import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { completeStagedBulletinSource, finalizeStagedBulletinReport, listBulletinReports, stageBulletinReportSheet, stageBulletinReportSource } from "../../../lib/bulletin-reports";

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
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      const input = await request.json() as Record<string, unknown>;
      if (input.mode === "sheet") {
        await stageBulletinReportSheet({
          uploadId: String(input.uploadId ?? ""), sourceIndex: Number(input.sourceIndex),
          sheet: input.sheet as Parameters<typeof stageBulletinReportSheet>[0]["sheet"], createdBy: session.username,
        });
        return NextResponse.json({ ok: true });
      }
      if (input.mode === "complete") {
        await completeStagedBulletinSource({
          uploadId: String(input.uploadId ?? ""), sourceIndex: Number(input.sourceIndex), sheetCount: Number(input.sheetCount),
          rowCount: Number(input.rowCount), cellCount: Number(input.cellCount), createdBy: session.username,
        });
        return NextResponse.json({ ok: true });
      }
      const report = await finalizeStagedBulletinReport({
        uploadId: String(input.uploadId ?? ""),
        month: Number(input.month),
        year: Number(input.year),
        createdBy: session.username,
      });
      return NextResponse.json({ ok: true, report: publicReport(report) });
    }
    const form = await request.formData();
    if (form.get("mode") === "stage") {
      const file = form.get("source");
      if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Brak pliku." }, { status: 400 });
      const staged = await stageBulletinReportSource({
        uploadId: String(form.get("uploadId") ?? "") || undefined,
        file,
        createdBy: session.username,
      });
      return NextResponse.json({ ok: true, ...staged });
    }
    return NextResponse.json({ error: "Nieobsługiwany tryb przesyłania." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się utworzyć raportu." }, { status: 400 });
  }
}