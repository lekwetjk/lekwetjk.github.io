import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { MediaLibraryError, changeMediaTrash, getBulletinSourceDownload, listMediaAssets, mediaLibraryEnabled, uploadMediaAsset } from "../../../lib/media-library";
import { recordAuditEventSafely } from "../../../lib/audit-log";

async function access() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (session?.role !== "admin") throw new MediaLibraryError("Forbidden", 403);
  if (!mediaLibraryEnabled()) throw new MediaLibraryError("Biblioteka mediów jest wyłączona.", 404);
  return session;
}

function failure(error: unknown) {
  if (error instanceof MediaLibraryError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Nieprawidłowy format żądania." }, { status: 400 });
  console.error("CMS media operation failed", error);
  return NextResponse.json({ error: "Nie udało się wykonać operacji biblioteki mediów. Żadne pliki nie zostały usunięte." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    await access();
    const download = new URL(request.url).searchParams.get("download");
    if (download !== null) {
      const file = await getBulletinSourceDownload(download);
      return new NextResponse(file.body, { headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, "%27")}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      } });
    }
    return NextResponse.json({ assets: await listMediaAssets() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const session = await access();
    try {
      const file = (await request.formData()).get("file");
      if (!(file instanceof File)) throw new MediaLibraryError("Wybierz plik.");
      const id = await uploadMediaAsset(file, session.username);
      await recordAuditEventSafely({ actor: session, eventType: "media_upload", result: "success", targetType: "media", targetId: id });
      return NextResponse.json({ ok: true, id });
    } catch (error) {
      await recordAuditEventSafely({ actor: session, eventType: "media_upload", result: "failure", targetType: "media", details: { error: error instanceof Error ? error.message : "unknown_error" } });
      throw error;
    }
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  try {
    const session = await access();
    try {
      const body: unknown = await request.json();
      if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string" || !("action" in body) || (body.action !== "trash" && body.action !== "restore")) {
        throw new MediaLibraryError("Wymagany identyfikator pliku i operacja trash albo restore.");
      }
      await changeMediaTrash(body.id, body.action, session.username);
      await recordAuditEventSafely({ actor: session, eventType: body.action === "trash" ? "media_trash" : "media_restore", result: "success", targetType: "media", targetId: body.id });
      return NextResponse.json({ ok: true });
    } catch (error) {
      await recordAuditEventSafely({ actor: session, eventType: "media_change", result: "failure", targetType: "media", details: { error: error instanceof Error ? error.message : "unknown_error" } });
      throw error;
    }
  } catch (error) { return failure(error); }
}
