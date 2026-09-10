import { NextResponse } from "next/server";

import { findMemberUserByUsername, generateTemporaryPassword, getMemberProfile, setMemberPassword } from "../../../lib/auth";
import { isPasswordResetEmailConfigured, sendPasswordResetEmail } from "../../../lib/password-reset-email";

const LOGIN_URL = "https://krd-ig-website-concept.lek-wet-jk.workers.dev/login/czlonkowie";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: { username?: string };

  try {
    const rawBody = await request.text();
    body = rawBody ? (JSON.parse(rawBody) as { username?: string }) : {};
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy format danych." }, { status: 400 });
  }

  const username = body.username?.trim() ?? "";

  if (!username) {
    return NextResponse.json({ error: "Podaj login konta." }, { status: 400 });
  }

  if (!isPasswordResetEmailConfigured()) {
    return NextResponse.json({ error: "Reset hasła nie jest jeszcze skonfigurowany do wysyłki e-mail." }, { status: 503 });
  }

  const genericResponse = NextResponse.json({ ok: true, message: "Jeżeli konto istnieje i ma przypisany e-mail, wyślemy nowe hasło." });
  const user = await findMemberUserByUsername(username);

  if (!user || !user.isActive) {
    return genericResponse;
  }

  const profile = await getMemberProfile(user.id);
  const email = profile?.email?.trim() || (isEmail(user.username) ? user.username : "");

  if (!email) {
    return genericResponse;
  }

  const temporaryPassword = generateTemporaryPassword();
  await sendPasswordResetEmail({
    to: email,
    name: profile?.contactPerson || user.name,
    username: user.username,
    temporaryPassword,
    loginUrl: LOGIN_URL,
  });
  await setMemberPassword(user.id, temporaryPassword, true);

  return genericResponse;
}