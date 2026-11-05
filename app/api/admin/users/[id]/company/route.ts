import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, assignMemberCompany, getCurrentMemberSession } from "../../../../../lib/auth";
import { recordAuditEventSafely } from "../../../../../lib/audit-log";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentMemberSession((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("companyId" in body) || typeof body.companyId !== "string") {
      return NextResponse.json({ error: "Wybierz firmę." }, { status: 400 });
    }
    const { id } = await params;
    await assignMemberCompany(id, body.companyId);
    await recordAuditEventSafely({ actor: session, eventType: "user_company_update", result: "success", targetType: "user", targetId: id, details: { companyId: body.companyId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nie udało się przypisać użytkownika do wybranej firmy." }, { status: 400 });
  }
}