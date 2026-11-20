import crypto from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { contentRevisions } from "../../db/schema.ts";
import { cmsFlag, type CmsSafetyEnvironment } from "./cms-safety-flags.ts";
import { readContentRecordFiles, writeContentRecordFile } from "./content-record-files.ts";

export type RevisionKind = "post" | "document" | "bulletin" | "wstawienia";
export type ContentRevision = typeof contentRevisions.$inferSelect;

export function contentHistoryEnabled() {
  return cmsFlag((globalThis as typeof globalThis & { env?: CmsSafetyEnvironment }).env?.CMS_HISTORY_ENABLED);
}

export function contentStateHash(snapshot: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

async function database() {
  let db: ReturnType<typeof getDb>;
  try { db = getDb(); } catch (error) {
    if (error instanceof Error && error.message.includes("binding `DB` is unavailable")) return null;
    throw error;
  }
  await db.run(sql`CREATE TABLE IF NOT EXISTS content_revisions (id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, resource_id TEXT NOT NULL, label TEXT NOT NULL, snapshot_json TEXT NOT NULL, captured_at TEXT NOT NULL, captured_by TEXT NOT NULL)`);
  return db;
}

export async function listContentHistory() {
  const db = await database();
  const records = db
    ? await db.select().from(contentRevisions).orderBy(desc(contentRevisions.capturedAt))
    : (await readContentRecordFiles<ContentRevision>("content-history")).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  return records;
}

export async function getContentRevision(id: string) {
  const db = await database();
  if (db) return (await db.select().from(contentRevisions).where(eq(contentRevisions.id, id)).limit(1))[0] ?? null;
  return (await listContentHistory()).find(record => record.id === id) ?? null;
}

export async function captureContentRevision(kind: RevisionKind, resourceId: string, label: string, snapshot: unknown, capturedBy = "Administrator") {
  if (!contentHistoryEnabled()) return;
  const entry: ContentRevision = {
    id: crypto.randomUUID(), kind, resourceId, label, snapshotJson: JSON.stringify(snapshot),
    capturedAt: new Date().toISOString(), capturedBy,
  };
  const db = await database();
  if (db) await db.insert(contentRevisions).values(entry);
  else await writeContentRecordFile("content-history", entry);
}
