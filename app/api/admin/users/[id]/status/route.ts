import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, setMemberAccountActive, verifySessionToken } from "../../../../../lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as { isActive?: boolean };
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

  try {
    await setMemberAccountActive(id, isActive);
    return NextResponse.json({ ok: true, isActive });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
