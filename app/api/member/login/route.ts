import { NextResponse } from "next/server";

import { recordAuditEventSafely } from "../../../lib/audit-log";
import { AUTH_COOKIE_NAME, createSessionToken, getMemberUsers, isMemberPasswordResetRequired, verifyCredentials, verifySessionToken } from "../../../lib/auth";

export async function POST(request: Request) {
  let body: unknown;

  try {
    const rawBody = await request.text();
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json(
      { error: "Nieprawidłowy format danych logowania." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Nieprawidłowy format danych logowania." }, { status: 400 });
  }
  const username = "username" in body && typeof body.username === "string" ? body.username.trim() : "";
  const password = "password" in body && typeof body.password === "string" ? body.password : "";
  const members = username ? await getMemberUsers() : [];
  const user = members.find(
    (candidate) => candidate.username.toLowerCase() === username.toLowerCase(),
  );

  if (!username || !password) {
    await recordAuditEventSafely({
      actor: { sub: user?.id, username: username || "(nie podano)", role: user?.role ?? "unknown" },
      eventType: "login",
      result: "failure",
      details: { reason: "missing_credentials" },
    });
    return NextResponse.json(
      { error: "Nazwa użytkownika i hasło są wymagane." },
      { status: 400 },
    );
  }

  if (!user || !(await verifyCredentials(username, password))) {
    await recordAuditEventSafely({
      actor: { sub: user?.id, username: user?.username ?? username, role: user?.role ?? "unknown" },
      eventType: "login",
      result: "failure",
      details: { reason: !user ? "unknown_user" : !user.isActive ? "inactive_account" : "invalid_credentials" },
    });
    return NextResponse.json({ error: "Nieprawidłowy login lub hasło." }, { status: 401 });
  }

  const sessionToken = createSessionToken(user);
  const session = verifySessionToken(sessionToken);
  await recordAuditEventSafely({
    actor: { sub: user.id, username: user.username, role: user.role, sessionId: session?.sessionId },
    eventType: "login",
    result: "success",
    trackActivity: true,
  });
  const mustChangePassword = await isMemberPasswordResetRequired(user.id);
  const response = NextResponse.json({ ok: true, mustChangePassword, user: { username: user.username, name: user.name, role: user.role } });

  response.cookies.set(AUTH_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
