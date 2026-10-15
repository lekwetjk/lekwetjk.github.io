import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { documentContentType, listMemberDocuments, memberDocumentScope, normalizeMethodologyTitle, saveMemberDocument, validFileName } from "../../../../lib/member-documents";

const MAX_MEMBER_DOCUMENT_BYTES = 100 * 1024 * 1024;
const METHODOLOGY_EXTENSIONS = new Set([".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png"]);

function fileExtension(fileName: string) {
  const extensionIndex = fileName.lastIndexOf(".");
  return extensionIndex >= 0 ? fileName.slice(extensionIndex).toLowerCase() : "";
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const scope = memberDocumentScope(request);
  if (!scope) {
    return NextResponse.json({ ok: false, error: "Nieprawidłowa sekcja dokumentów." }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Brak pliku." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: "Wybrany plik jest pusty." }, { status: 400 });
  }

  if (file.size > MAX_MEMBER_DOCUMENT_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Plik jest za duży. Maksymalny rozmiar bezpośredniego przesyłania to 100 MB." },
      { status: 413 },
    );
  }

  const uploadedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const replaceFileName = String(formData?.get("replaceFileName") ?? "");
  const fileName = scope === "methodology"
    ? replaceFileName || `${randomUUID()}-${uploadedFileName.slice(-180)}`
    : uploadedFileName;
  const title = scope === "methodology" ? normalizeMethodologyTitle(formData?.get("title")) : undefined;

  if (!validFileName(fileName)) {
    return NextResponse.json({ ok: false, error: "Nieprawidłowa nazwa pliku." }, { status: 400 });
  }

  if (scope === "methodology" && !title) {
    return NextResponse.json(
      { ok: false, error: "Tytuł publikacji jest wymagany i może mieć maksymalnie 200 znaków." },
      { status: 400 },
    );
  }

  if (
    scope === "methodology"
    && (
      !METHODOLOGY_EXTENSIONS.has(fileExtension(uploadedFileName))
      || !METHODOLOGY_EXTENSIONS.has(fileExtension(fileName))
    )
  ) {
    return NextResponse.json(
      { ok: false, error: "Dozwolone formaty to PDF, DOCX, XLSX, JPEG i PNG." },
      { status: 415 },
    );
  }

  if (
    scope === "methodology"
    && replaceFileName
    && fileExtension(uploadedFileName) !== fileExtension(replaceFileName)
  ) {
    return NextResponse.json(
      { ok: false, error: "Plik zastępczy musi mieć ten sam format co dotychczasowy materiał." },
      { status: 400 },
    );
  }

  try {
    if (scope === "methodology" && replaceFileName) {
      const documents = await listMemberDocuments(scope);
      if (!documents.some((document) => document.fileName === replaceFileName)) {
        return NextResponse.json({ ok: false, error: "Materiał do zastąpienia nie został znaleziony." }, { status: 404 });
      }
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    await saveMemberDocument({
      fileName,
      content: buffer,
      contentType: scope === "methodology" ? documentContentType(fileName) : file.type || "application/octet-stream",
      title: title ?? undefined,
    }, scope);
  } catch (error) {
    console.error("Failed to save document", error);
    return NextResponse.json(
      { ok: false, error: "Nie udało się zapisać dokumentu. Spróbuj ponownie lub skontaktuj się z administratorem." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, fileName });
}
