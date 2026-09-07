import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { saveMemberDocument } from "../../../../lib/member-documents";


export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Brak pliku." }, { status: 400 });
  }

  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const buffer = Buffer.from(await file.arrayBuffer());
  await saveMemberDocument({
    fileName,
    content: buffer,
    contentType: file.type || "application/octet-stream",
  });

  return NextResponse.json({ ok: true, fileName });
}
