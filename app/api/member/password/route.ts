import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, setMemberPassword, verifyCredentials, verifySessionToken } from "../../../lib/auth";
import { recordAuditEventSafely } from "../../../lib/audit-log";

export async function POST(request: Request) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fail = async (reason: string, message: string, status: number) => {
    await recordAuditEventSafely({ actor: session, eventType: "password_change", result: "failure", targetType: "user", targetId: session.sub, details: { reason } });
    return NextResponse.json({ error: message }, { status });
  };
  let body: unknown;

  try {
    const rawBody = await request.text();
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return fail("invalid_format", "Nieprawidłowy format danych.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail("invalid_format", "Nieprawidłowy format danych.", 400);
  }
  const currentPassword = "currentPassword" in body && typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = "newPassword" in body && typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return fail("missing_credentials", "Podaj obecne i nowe hasło.", 400);
  }

  if (newPassword.length < 8) {
    return fail("password_too_short", "Nowe hasło musi mieć co najmniej 8 znaków.", 400);
  }

  if (!(await verifyCredentials(session.username, currentPassword))) {
    return fail("invalid_current_password", "Obecne hasło jest nieprawidłowe.", 401);
  }

  try {
    await setMemberPassword(session.sub, newPassword, false);
  } catch (error) {
    console.error("Nie udało się zmienić hasła.", error);
    return fail("operation_failed", "Nie udało się zmienić hasła. Spróbuj ponownie później.", 503);
  }
  await recordAuditEventSafely({
    actor: session,
    eventType: "password_change",
    result: "success",
    targetType: "user",
    targetId: session.sub,
  });

  return NextResponse.json({ ok: true });
}