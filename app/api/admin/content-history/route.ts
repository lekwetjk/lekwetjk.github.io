import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { contentHistoryEnabled, contentStateHash, getContentRevision, listContentHistory } from "../../../lib/content-history";
import { ContentRevisionConflict, currentRevisionState, restoreContentRevision, revisionPreview } from "../../../lib/content-history-actions";
import { recordAuditEventSafely } from "../../../lib/audit-log";
import { readDocumentRevisionFile } from "../../../lib/member-documents";

async function access() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (session?.role !== "admin") return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  if (!contentHistoryEnabled()) return { response: NextResponse.json({ error: "Historia jest wyłączona." }, { status: 404 }) };
  return { session };
}

export async function GET(request: Request) {
  try {
    const allowed = await access();
    if (allowed.response) return allowed.response;
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      const entries = (await listContentHistory()).map(({ id, kind, resourceId, label, capturedAt, capturedBy }) => ({ id, kind, resourceId, label, capturedAt, capturedBy }));
      return NextResponse.json({ entries }, { headers: { "Cache-Control": "no-store" } });
    }
    const entry = await getContentRevision(id);
    if (!entry) return NextResponse.json({ error: "Nie znaleziono wersji." }, { status: 404 });
    if (new URL(request.url).searchParams.get("download") === "true") {
      if (entry.kind !== "document") return NextResponse.json({ error: "Ta wersja nie jest dokumentem." }, { status: 400 });
      const { version, content } = await readDocumentRevisionFile(entry.resourceId, JSON.parse(entry.snapshotJson));
      return new NextResponse(content instanceof Uint8Array ? Uint8Array.from(content) : content, { headers: {
        "Content-Type": version.contentType, "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(version.fileName)}`,
      } });
    }
    const current = await currentRevisionState(entry);
    return NextResponse.json({
      id: entry.id, label: entry.label, kind: entry.kind,
      previous: revisionPreview(entry.kind, JSON.parse(entry.snapshotJson)),
      current: revisionPreview(entry.kind, current), expectedStateHash: contentStateHash(current),
      canRestore: current !== null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Content history listing failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się odczytać historii." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let actor: ReturnType<typeof verifySessionToken> = null;
  let revisionId: string | undefined;
  try {
    const allowed = await access();
    if (allowed.response) return allowed.response;
    actor = allowed.session;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string" || !("expectedStateHash" in body) || typeof body.expectedStateHash !== "string" || !/^[a-f0-9]{64}$/.test(body.expectedStateHash)) {
      return NextResponse.json({ error: "Otwórz podgląd wersji przed przywróceniem." }, { status: 400 });
    }
    revisionId = body.id;
    const entry = await restoreContentRevision(body.id, body.expectedStateHash, allowed.session.username);
    await recordAuditEventSafely({ actor: allowed.session, eventType: "content_version_restore", result: "success", targetType: entry.kind, targetId: entry.resourceId, details: { revisionId: entry.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Content revision restore failed", error);
    if (actor) await recordAuditEventSafely({ actor, eventType: "content_version_restore", result: "failure", targetType: "content_revision", targetId: revisionId, details: { error: error instanceof Error ? error.message : "unknown_error" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się przywrócić wersji." }, { status: error instanceof ContentRevisionConflict ? 409 : 400 });
  }
}
