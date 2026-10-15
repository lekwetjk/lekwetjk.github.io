import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { getMemberDocument, memberDocumentScope, validFileName } from "../../../lib/member-documents";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  const scope = memberDocumentScope(request);
  if (!scope) {
    return NextResponse.json({ error: "Nieprawidłowa sekcja dokumentów." }, { status: 400 });
  }

  if (!verifySessionToken(sessionToken) && scope !== "methodology") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!validFileName(file)) {
    return NextResponse.json({ error: "Nieprawidłowa nazwa pliku." }, { status: 400 });
  }
  try {
    const document = await getMemberDocument(file, scope);

    if (document) {
      const { content, contentType } = document;

      return new NextResponse(content, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${file}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return NextResponse.json({ error: "Dokument nie został znaleziony." }, { status: 404 });
  } catch (error) {
    console.error("Failed to read document", error);
    return NextResponse.json({ error: "Nie udało się pobrać dokumentu." }, { status: 500 });
  }
}
