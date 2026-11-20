import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { cmsFlag, type CmsSafetyEnvironment } from "../../../lib/cms-safety-flags";
import { listContentTrash } from "../../../lib/content-trash";
import { restoreManagedPost } from "../../../lib/managed-posts";
import { restoreMemberDocument } from "../../../lib/member-documents";
import { restoreBulletinReport } from "../../../lib/bulletin-reports";
import { recordAuditEventSafely } from "../../../lib/audit-log";

async function access() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (session?.role !== "admin") return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const environment = (globalThis as typeof globalThis & { env?: CmsSafetyEnvironment }).env;
  try {
    if (!cmsFlag(environment?.CMS_TRASH_ENABLED)) return { response: NextResponse.json({ error: "Kosz jest wyłączony." }, { status: 404 }) };
  } catch (error) {
    console.error("CMS trash configuration failed", error);
    return { response: NextResponse.json({ error: "Nieprawidłowa konfiguracja kosza." }, { status: 503 }) };
  }
  return { session };
}

export async function GET() {
  try {
    const allowed = await access();
    if (allowed.response) return allowed.response;
    return NextResponse.json({ entries: await listContentTrash() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("CMS trash listing failed", error);
    return NextResponse.json({ error: "Nie udało się odczytać kosza." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const allowed = await access();
  if (allowed.response) return allowed.response;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string") {
      return NextResponse.json({ error: "Wymagany identyfikator wpisu kosza." }, { status: 400 });
    }
    const entry = (await listContentTrash()).find(item => item.id === body.id);
    if (!entry) return NextResponse.json({ error: "Nie znaleziono wpisu kosza." }, { status: 404 });
    if (entry.kind === "post") await restoreManagedPost(entry.resourceId);
    else if (entry.kind === "bulletin") await restoreBulletinReport(entry.resourceId);
    else if (entry.kind === "document") {
      const parts = entry.resourceId.split("/");
      const [scope, fileName] = parts;
      if (parts.length !== 2 || !fileName || (scope !== "documents" && scope !== "epi-geo" && scope !== "methodology")) throw new Error("Nieprawidłowa sekcja dokumentu.");
      await restoreMemberDocument(fileName, scope);
    } else throw new Error("Nieobsługiwany rodzaj wpisu kosza.");
    await recordAuditEventSafely({ actor: allowed.session, eventType: "content_restore", result: "success", targetType: entry.kind, targetId: entry.resourceId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await recordAuditEventSafely({ actor: allowed.session, eventType: "content_restore", result: "failure", details: { error: error instanceof Error ? error.message : "unknown_error" } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się przywrócić treści." }, { status: 400 });
  }
}
