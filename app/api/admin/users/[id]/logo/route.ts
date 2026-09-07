import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, deleteMemberLogo, verifySessionToken } from "../../../../../lib/auth";

async function removeLogo(request: Request, params: Promise<{ id: string }>) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await deleteMemberLogo((await params).id);
  return NextResponse.redirect(new URL("/admin/uzytkownicy", request.url), 303);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return removeLogo(request, params);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return removeLogo(request, params);
}