import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, createMemberAccount, saveMemberLogo, verifySessionToken } from "../../../../lib/auth";
import { recordAuditEventSafely } from "../../../../lib/audit-log";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const logo = formData.get("logo");

  if (logo instanceof File && logo.size > 0) {
    if (!["image/jpeg", "image/bmp", "image/png"].includes(logo.type)) {
      return NextResponse.json({ error: "Logo musi być w formacie JPG, BMP lub PNG." }, { status: 400 });
    }
    if (logo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Logo może mieć maksymalnie 5 MB." }, { status: 400 });
    }
  }

  try {
    const user = await createMemberAccount({
      username: String(formData.get("username") ?? ""),
      name: String(formData.get("name") ?? ""),
      role: formData.get("role") === "admin" ? "admin" : "member",
      password: String(formData.get("password") ?? ""),
    });

    if (logo instanceof File && logo.size > 0) {
      await saveMemberLogo(user.id, Buffer.from(await logo.arrayBuffer()), logo.type);
    }

    await recordAuditEventSafely({
      actor: session,
      eventType: "user_create",
      result: "success",
      targetType: "user",
      targetId: user.id,
      details: { username: user.username, role: user.role, logoAdded: logo instanceof File && logo.size > 0 },
    });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    await recordAuditEventSafely({
      actor: session,
      eventType: "user_create",
      result: "failure",
      targetType: "user",
      details: { username: String(formData.get("username") ?? ""), error: error instanceof Error ? error.message : "unknown_error" },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
