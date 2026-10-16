import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, getMemberUsers, setMemberAccountActive, verifySessionToken } from "../../../../../lib/auth";
import { recordAuditEventSafely } from "../../../../../lib/audit-log";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as { isActive?: boolean };
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

  try {
    const user = (await getMemberUsers()).find((candidate) => candidate.id === id);
    if (!user) {
      await recordAuditEventSafely({ actor: session, eventType: "user_status", result: "failure", targetType: "user", targetId: id, details: { reason: "not_found" } });
      return NextResponse.json({ error: "Nie znaleziono użytkownika." }, { status: 404 });
    }
    await setMemberAccountActive(id, isActive);
    await recordAuditEventSafely({ actor: session, eventType: "user_status", result: "success", targetType: "user", targetId: id, details: { isActive } });
    return NextResponse.json({ ok: true, isActive });
  } catch (error) {
    await recordAuditEventSafely({ actor: session, eventType: "user_status", result: "failure", targetType: "user", targetId: id, details: { isActive, error: error instanceof Error ? error.message : "unknown_error" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
