import crypto from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { contentTrash } from "../../db/schema.ts";
import { readContentRecordFiles, writeContentRecordFile } from "./content-record-files.ts";

export type TrashKind = "post" | "document" | "bulletin";
export type TrashEntry = typeof contentTrash.$inferSelect;

function optionalDatabase() {
  try { return getDb(); } catch (error) {
    if (error instanceof Error && error.message.includes("binding `DB` is unavailable")) return null;
    throw error;
  }
}

async function database() {
  const db = optionalDatabase();
  if (db) {
    await db.run(sql`CREATE TABLE IF NOT EXISTS content_trash (id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, resource_id TEXT NOT NULL, snapshot_json TEXT NOT NULL, deleted_at TEXT NOT NULL, restored_at TEXT)`);
  }
  return db;
}

async function saveEntry(entry: TrashEntry, existing = false) {
  const db = await database();
  if (db) {
    if (existing) await db.update(contentTrash).set({ restoredAt: entry.restoredAt }).where(eq(contentTrash.id, entry.id));
    else await db.insert(contentTrash).values(entry);
    return;
  }
  await writeContentRecordFile("content-trash", entry, existing);
}

export async function listContentTrash(kind?: TrashKind) {
  const db = await database();
  if (db) return db.select().from(contentTrash).where(and(isNull(contentTrash.restoredAt), kind ? eq(contentTrash.kind, kind) : undefined));
  return (await readContentRecordFiles<TrashEntry>("content-trash")).filter(entry => !entry.restoredAt && (!kind || entry.kind === kind));
}

export async function trashResource(kind: TrashKind, resourceId: string, snapshot: unknown) {
  if ((await listContentTrash(kind)).some(entry => entry.resourceId === resourceId)) return;
  await saveEntry({
    id: crypto.randomUUID(), kind, resourceId, snapshotJson: JSON.stringify(snapshot),
    deletedAt: new Date().toISOString(), restoredAt: null,
  });
}

export async function completeTrashRestore(kind: TrashKind, resourceId: string) {
  for (const entry of (await listContentTrash(kind)).filter(entry => entry.resourceId === resourceId)) {
    await saveEntry({ ...entry, restoredAt: new Date().toISOString() }, true);
  }
}
