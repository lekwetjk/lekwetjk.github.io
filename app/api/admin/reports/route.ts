import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { createBulletinReport, listBulletinReports } from "../../../lib/bulletin-reports";

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
    const form = await request.formData();
    const report = await createBulletinReport({
      month: Number(form.get("month")),
      year: Number(form.get("year")),
      files: form.getAll("sources").filter((item): item is File => item instanceof File && item.size > 0),
      createdBy: session.username,
    });
    return NextResponse.json({ ok: true, report: publicReport(report) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się utworzyć raportu." }, { status: 400 });
  }
}