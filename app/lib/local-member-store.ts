import { chmod, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseSync } from "node:sqlite";

type RecordKind = "users" | "logos" | "profiles" | "companies" | "company-links";
const stores = new Map<string, ReturnType<typeof openLocalMemberStore>>();

export async function openLocalMemberStore(directory: string, legacyDirectory = os.tmpdir()) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Local member storage is unavailable in production. Configure D1 and R2.");
  }
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const moduleName = "node:sqlite";
  const sqlite = await import(moduleName) as { DatabaseSync: typeof DatabaseSync };
  const filename = path.join(directory, "members.sqlite");
  const database = new sqlite.DatabaseSync(filename);
  try {
    await chmod(filename, 0o600);
    database.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS member_records (
        kind TEXT NOT NULL,
        id TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (kind, id)
      );
      CREATE TABLE IF NOT EXISTS member_storage_migrations (id TEXT PRIMARY KEY NOT NULL);
    `);
    const migrated = () => database.prepare("SELECT id FROM member_storage_migrations WHERE id = ?").get("legacy-temp-v1");
    if (!migrated()) {
      const entries: Array<{ kind: RecordKind; id: string; value: unknown }> = [];
      for (const kind of ["users", "logos", "profiles"] as const) {
        let contents: string;
        try {
          contents = await readFile(path.join(legacyDirectory, `krd-ig-member-${kind}.json`), "utf8");
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
          throw error;
        }
        const parsed: unknown = JSON.parse(contents.replace(/^\uFEFF/, ""));
        if (kind === "users") {
          if (!Array.isArray(parsed)) throw new Error("Invalid legacy member users store.");
          for (const user of parsed) {
            if (!user || typeof user.id !== "string" || !user.id) throw new Error("Invalid legacy member account.");
            entries.push({ kind, id: user.id, value: user });
          }
        } else {
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`Invalid legacy member ${kind} store.`);
          for (const [id, value] of Object.entries(parsed)) entries.push({ kind, id, value });
        }
      }
      database.exec("BEGIN IMMEDIATE");
      try {
        if (!migrated()) {
          const insert = database.prepare("INSERT OR IGNORE INTO member_records (kind, id, value) VALUES (?, ?, ?)");
          for (const entry of entries) insert.run(entry.kind, entry.id, JSON.stringify(entry.value));
          database.prepare("INSERT INTO member_storage_migrations (id) VALUES (?)").run("legacy-temp-v1");
        }
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    }
  } catch (error) {
    database.close();
    throw error;
  }

  return {
    get<Value>(kind: RecordKind, id: string): Value | null {
      const row = database.prepare("SELECT value FROM member_records WHERE kind = ? AND id = ?").get(kind, id) as { value: string } | undefined;
      return row ? JSON.parse(row.value) as Value : null;
    },
    list<Value>(kind: RecordKind): Record<string, Value> {
      const rows = database.prepare("SELECT id, value FROM member_records WHERE kind = ?").all(kind) as Array<{ id: string; value: string }>;
      return Object.fromEntries(rows.map((row) => [row.id, JSON.parse(row.value) as Value]));
    },
    set(kind: RecordKind, id: string, value: unknown) {
      database.prepare("INSERT INTO member_records (kind, id, value) VALUES (?, ?, ?) ON CONFLICT (kind, id) DO UPDATE SET value = excluded.value")
        .run(kind, id, JSON.stringify(value));
    },
    delete(kind: RecordKind, id: string) {
      database.prepare("DELETE FROM member_records WHERE kind = ? AND id = ?").run(kind, id);
    },
    close() { database.close(); },
  };
}

export async function getLocalMemberStore() {
  const directory = path.resolve(process.env.LOCAL_MEMBER_DATA_DIR || fileURLToPath(new URL("../../private/member-data/", import.meta.url)));
  let store = stores.get(directory);
  if (!store) {
    store = openLocalMemberStore(directory).catch((error) => {
      stores.delete(directory);
      throw error;
    });
    stores.set(directory, store);
  }
  return store;
}