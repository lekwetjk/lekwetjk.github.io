import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, deleteMemberAccount, getMemberUsers, verifySessionToken } from "../../../../lib/auth";
import { recordAuditEventSafely } from "../../../../lib/audit-log";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const userId = String(formData.get("userId") ?? "");

  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  try {
    const user = (await getMemberUsers()).find((candidate) => candidate.id === userId);
    if (!user) {
      await recordAuditEventSafely({ actor: session, eventType: "user_delete", result: "failure", targetType: "user", targetId: userId, details: { reason: "not_found" } });
      return NextResponse.json({ error: "Nie znaleziono użytkownika." }, { status: 404 });
    }
    await deleteMemberAccount(userId);
    await recordAuditEventSafely({ actor: session, eventType: "user_delete", result: "success", targetType: "user", targetId: userId, details: { username: user.username } });
    return NextResponse.redirect(new URL("/admin/uzytkownicy", request.url));
  } catch (error) {
    await recordAuditEventSafely({ actor: session, eventType: "user_delete", result: "failure", targetType: "user", targetId: userId, details: { error: error instanceof Error ? error.message : "unknown_error" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
