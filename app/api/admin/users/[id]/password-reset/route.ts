import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, generateTemporaryPassword, getMemberUsers, setMemberPassword, verifySessionToken } from "../../../../../lib/auth";
import { recordAuditEventSafely } from "../../../../../lib/audit-log";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const temporaryPassword = generateTemporaryPassword();

  try {
    const user = (await getMemberUsers()).find((candidate) => candidate.id === id);
    if (!user) {
      await recordAuditEventSafely({ actor: session, eventType: "password_reset", result: "failure", targetType: "user", targetId: id, details: { reason: "not_found" } });
      return NextResponse.json({ error: "Nie znaleziono użytkownika." }, { status: 404 });
    }
    await setMemberPassword(id, temporaryPassword, true);
    await recordAuditEventSafely({
      actor: session,
      eventType: "password_reset",
      result: "success",
      targetType: "user",
      targetId: id,
      details: { username: user.username },
    });
    return NextResponse.json({ ok: true, temporaryPassword });
  } catch (error) {
    await recordAuditEventSafely({
      actor: session,
      eventType: "password_reset",
      result: "failure",
      targetType: "user",
      targetId: id,
      details: { error: error instanceof Error ? error.message : "unknown_error" },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zresetować hasła." },
      { status: 400 },
    );
  }
}