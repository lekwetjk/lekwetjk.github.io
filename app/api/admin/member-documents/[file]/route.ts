import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { deleteMemberDocument } from "../../../../lib/member-documents";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { file } = await params;
  const deleted = await deleteMemberDocument(file);

  return deleted
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Dokument nie został znaleziony." }, { status: 404 });
}