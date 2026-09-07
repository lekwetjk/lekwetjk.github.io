import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, createSessionToken, getMemberUsers, verifyCredentials } from "../../../lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Nazwa użytkownika i hasło są wymagane." },
      { status: 400 },
    );
  }

  const members = await getMemberUsers();
  const user = members.find(
    (candidate) => candidate.username.toLowerCase() === username.toLowerCase(),
  );

  if (!user || !(await verifyCredentials(username, password))) {
    return NextResponse.json({ error: "Nieprawidłowy login lub hasło." }, { status: 401 });
  }

  const sessionToken = createSessionToken(user);
  const response = NextResponse.json({ ok: true, user: { username: user.username, name: user.name, role: user.role } });

  response.cookies.set(AUTH_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
