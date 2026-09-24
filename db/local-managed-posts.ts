import { mkdir } from "node:fs/promises";
import path from "node:path";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.ts";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";

let localDatabase: Promise<ReturnType<typeof drizzle<typeof schema>>> | undefined;

export async function getLocalManagedPostsDb() {
  if (process.env.NODE_ENV !== "development") throw new Error("Local publications are available only in development.");
  localDatabase ??= openDatabase();
  return localDatabase;
}

async function openDatabase() {
  const moduleName = "node:sqlite";
  const sqlite = await import(moduleName) as { DatabaseSync: typeof DatabaseSync };
  const directory = path.join(process.cwd(), ".wrangler", "state");
  await mkdir(directory, { recursive: true });
  const database = new sqlite.DatabaseSync(path.join(directory, "local-managed-posts.sqlite"));
  const binding = {
    prepare(query: string) {
      const statement = database.prepare(query);
      return {
        bind(...params: SQLInputValue[]) {
          return {
            async run() { return statement.run(...params); },
            async all() { return { results: statement.all(...params) }; },
            async raw() { return statement.all(...params).map((row) => Object.values(row)); },
          };
        },
      };
    },
  };
  return drizzle(binding as unknown as Parameters<typeof drizzle>[0], { schema });
}