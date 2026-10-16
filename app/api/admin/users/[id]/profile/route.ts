import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, getMemberProfile, saveMemberProfile, verifySessionToken } from "../../../../../lib/auth";
import { recordAuditEventSafely } from "../../../../../lib/audit-log";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ profile: await getMemberProfile((await params).id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    await saveMemberProfile(id, await request.json());
    await recordAuditEventSafely({ actor: session, eventType: "user_profile_update", result: "success", targetType: "user", targetId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await recordAuditEventSafely({ actor: session, eventType: "user_profile_update", result: "failure", targetType: "user", targetId: id, details: { error: error instanceof Error ? error.message : "unknown_error" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się zapisać profilu." }, { status: 400 });
  }
}