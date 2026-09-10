import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, generateTemporaryPassword, setMemberPassword, verifySessionToken } from "../../../../../lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const temporaryPassword = generateTemporaryPassword();

  try {
    await setMemberPassword(id, temporaryPassword, true);
    return NextResponse.json({ ok: true, temporaryPassword });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zresetować hasła." },
      { status: 400 },
    );
  }
}