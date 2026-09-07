import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { asc, sql } from "drizzle-orm";

import { getDb } from "../../db/index.ts";
import { memberExportPermitOptions } from "../../db/schema.ts";
import { defaultExportPermits } from "./member-profile-options";

const localFile = path.join(os.tmpdir(), "krd-ig-export-permits.json");

export async function getExportPermits() {
  try {
    const db = getDb();
    await db.run(sql`CREATE TABLE IF NOT EXISTS member_export_permit_options (name TEXT PRIMARY KEY NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    const rows = await db.select().from(memberExportPermitOptions).orderBy(asc(memberExportPermitOptions.name));
    if (rows.length > 0) return rows.map((row) => row.name);
  } catch {
    try {
      const local = JSON.parse(await readFile(localFile, "utf8")) as string[];
      if (local.length > 0) return [...new Set(local)].sort((a, b) => a.localeCompare(b, "pl"));
    } catch { /* use defaults */ }
  }
  return [...defaultExportPermits].sort((a, b) => a.localeCompare(b, "pl"));
}

export async function addExportPermit(name: string) {
  const normalized = name.trim();
  if (!normalized) throw new Error("Podaj nazwę kraju.");
  const permits = await getExportPermits();
  if (permits.some((permit) => permit.toLocaleLowerCase("pl") === normalized.toLocaleLowerCase("pl"))) return permits;

  try {
    const db = getDb();
    await db.run(sql`CREATE TABLE IF NOT EXISTS member_export_permit_options (name TEXT PRIMARY KEY NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.insert(memberExportPermitOptions).values({ name: normalized });
  } catch {
    await mkdir(path.dirname(localFile), { recursive: true });
    await writeFile(localFile, JSON.stringify([...permits, normalized]), "utf8");
  }
  return getExportPermits();
}