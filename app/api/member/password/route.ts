import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, setMemberPassword, verifyCredentials, verifySessionToken } from "../../../lib/auth";

export async function POST(request: Request) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };

  try {
    const rawBody = await request.text();
    body = rawBody ? (JSON.parse(rawBody) as { currentPassword?: string; newPassword?: string }) : {};
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy format danych." }, { status: 400 });
  }

  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Podaj obecne i nowe hasło." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Nowe hasło musi mieć co najmniej 8 znaków." }, { status: 400 });
  }

  if (!(await verifyCredentials(session.username, currentPassword))) {
    return NextResponse.json({ error: "Obecne hasło jest nieprawidłowe." }, { status: 401 });
  }

  await setMemberPassword(session.sub, newPassword, false);

  return NextResponse.json({ ok: true });
}