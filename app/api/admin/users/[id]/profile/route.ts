import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, getMemberProfile, saveMemberProfile, verifySessionToken } from "../../../../../lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ profile: await getMemberProfile((await params).id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await saveMemberProfile((await params).id, await request.json());
  return NextResponse.json({ ok: true });
}