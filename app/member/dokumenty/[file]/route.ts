import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { getMemberDocument, isAllowedMemberDocument } from "../../../lib/member-documents";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!verifySessionToken(sessionToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isAllowedMemberDocument(file))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const document = await getMemberDocument(file);

  if (document) {
    const { content, contentType } = document;

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${file}"`,
      },
    });
  }

  return NextResponse.json({ error: "Dokument nie został znaleziony." }, { status: 404 });
}
