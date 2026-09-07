import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, getMemberProfile, getMemberUsers, verifySessionToken } from "../../../../lib/auth";

export async function GET() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await getMemberUsers();
  const rows = await Promise.all(users.map(async (user) => ({
    login: user.username,
    name: user.name,
    role: user.role === "admin" ? "Administrator" : "Członek",
    profile: await getMemberProfile(user.id),
  })));

  return NextResponse.json({ rows });
}
