import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { WSTAWIENIA_COLUMNS, getWstawieniaRows, saveWstawieniaRows } from "../../../lib/wstawienia";
import { recordAuditEventSafely } from "../../../lib/audit-log";

function isAdmin() {
  return cookies().then((cookieStore) => verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value)?.role === "admin");
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ columns: WSTAWIENIA_COLUMNS, rows: await getWstawieniaRows() });
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json() as { rows?: Array<{ year?: string; values?: string[] }> };
    await saveWstawieniaRows(
      (body.rows ?? []).map((row) => ({ year: row.year ?? "", values: row.values ?? [] })),
      session.username,
    );
    await recordAuditEventSafely({ actor: session, eventType: "placements_update", result: "success", targetType: "placements", details: { rowCount: body.rows?.length ?? 0 } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await recordAuditEventSafely({ actor: session, eventType: "placements_update", result: "failure", targetType: "placements", details: { error: error instanceof Error ? error.message : "unknown_error" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się zapisać tabeli." }, { status: 400 });
  }
}