import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { WSTAWIENIA_COLUMNS, getWstawieniaRows } from "../../../../lib/wstawienia";
import { recordAuditEventSafely } from "../../../../lib/audit-log";

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await getWstawieniaRows();
  const csv = `\uFEFF${["Rok", ...WSTAWIENIA_COLUMNS].map(csvCell).join(";")}\r\n${rows.map((row) => [row.year, ...row.values].map(csvCell).join(";")).join("\r\n")}\r\n`;
  await recordAuditEventSafely({ actor: session, eventType: "placements_export", result: "success", targetType: "placements", details: { rowCount: rows.length } });
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="wstawienia.csv"' } });
}