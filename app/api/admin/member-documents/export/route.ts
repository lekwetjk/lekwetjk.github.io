import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { recordAuditEventSafely } from "../../../../lib/audit-log";
import { createMemberDocumentsArchive } from "../../../../lib/member-documents";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const archive = await createMemberDocumentsArchive();
    await recordAuditEventSafely({ actor: session, eventType: "document_export", result: "success", targetType: "document", details: { fileCount: archive.fileCount } });
    return new NextResponse(archive.content, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="dokumenty-czlonkowskie.zip"',
      },
    });
  } catch (error) {
    console.error("Failed to export member documents", error);
    await recordAuditEventSafely({ actor: session, eventType: "document_export", result: "failure", targetType: "document", details: { error: error instanceof Error ? error.message : "unknown_error" } });
    return NextResponse.json({ error: "Nie udało się wyeksportować dokumentów. Spróbuj ponownie lub skontaktuj się z administratorem." }, { status: 500 });
  }
}
