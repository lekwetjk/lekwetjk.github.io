import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, getMemberProfile, saveMemberProfile, verifySessionToken } from "../../../lib/auth";
import { recordAuditEventSafely } from "../../../lib/audit-log";

export async function GET() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ profile: await getMemberProfile(session.sub) });
}

export async function POST(request: Request) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await saveMemberProfile(session.sub, await request.json());
    if (session.role === "admin") {
      await recordAuditEventSafely({ actor: session, eventType: "user_profile_update", result: "success", targetType: "user", targetId: session.sub });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (session.role === "admin") {
      await recordAuditEventSafely({ actor: session, eventType: "user_profile_update", result: "failure", targetType: "user", targetId: session.sub, details: { reason: "operation_failed" } });
    }
    console.error("Nie udało się zapisać profilu.", error);
    return NextResponse.json({ error: "Nie udało się zapisać profilu." }, { status: 500 });
  }
}