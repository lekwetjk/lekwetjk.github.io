import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { listMemberDocuments, memberDocumentScope } from "../../../lib/member-documents";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  const scope = memberDocumentScope(request);
  if (!scope) {
    return NextResponse.json({ error: "Nieprawidłowa sekcja dokumentów." }, { status: 400 });
  }

  if (!session && scope !== "methodology") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const documents = await listMemberDocuments(scope);

    return NextResponse.json({
      isAdmin: session?.role === "admin",
      documents: documents.map((document) => ({
        title: document.title,
        fileName: document.fileName,
        uploadedAt: document.uploadedAt,
      })),
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to list documents", error);
    return NextResponse.json({ error: "Nie udało się pobrać listy materiałów." }, {
      status: 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
