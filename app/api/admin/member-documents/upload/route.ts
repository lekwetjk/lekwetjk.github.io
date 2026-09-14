import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { saveMemberDocument } from "../../../../lib/member-documents";

const MAX_MEMBER_DOCUMENT_BYTES = 100 * 1024 * 1024;

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

  if (file.size > MAX_MEMBER_DOCUMENT_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Plik jest za duży. Maksymalny rozmiar bezpośredniego przesyłania to 100 MB." },
      { status: 413 },
    );
  }

  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await saveMemberDocument({
      fileName,
      content: buffer,
      contentType: file.type || "application/octet-stream",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Nie udało się zapisać dokumentu. Spróbuj ponownie lub skontaktuj się z administratorem." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, fileName });
}
