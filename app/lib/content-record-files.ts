import crypto from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getMemberDocumentsBucket } from "../../db/index.ts";

type Namespace = "content-trash" | "content-history";

export function optionalContentBucket() {
  try { return getMemberDocumentsBucket(); } catch (error) {
    if (error instanceof Error && error.message.includes("binding `MEMBER_DOCUMENTS` is unavailable")) return null;
    throw error;
  }
}

export async function readContentRecordFiles<T>(namespace: Namespace): Promise<T[]> {
  const bucket = optionalContentBucket();
  if (bucket) {
    const records: T[] = [];
    const cursors = new Set<string>();
    let cursor: string | undefined;
    do {
      const page = await bucket.list({ prefix: `${namespace}/records/`, cursor });
      for (const object of page.objects) {
        const record = await bucket.get(object.key);
        if (!record) throw new Error("Nie można odczytać zabezpieczonego wpisu.");
        records.push(JSON.parse(await new Response(record.body).text()) as T);
      }
      if (page.truncated && (!page.cursor || cursors.has(page.cursor))) throw new Error("Niekompletna lista zabezpieczonych wpisów R2.");
      cursor = page.truncated ? page.cursor : undefined;
      if (cursor) cursors.add(cursor);
    } while (cursor);
    return records;
  }
  if (process.env.NODE_ENV === "production") throw new Error("Brak trwałego magazynu zabezpieczonych wpisów.");
  const directory = path.join(os.tmpdir(), `krd-ig-${namespace}`);
  let names: string[];
  try { names = await readdir(directory); } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(names.filter(name => /^[a-f0-9-]+\.json$/.test(name)).map(async name => JSON.parse(await readFile(path.join(directory, name), "utf8")) as T));
}

export async function writeContentRecordFile<T extends { id: string }>(namespace: Namespace, entry: T, existing = false) {
  if (!/^[a-f0-9-]{36}$/i.test(entry.id)) throw new Error("Nieprawidłowy identyfikator zabezpieczonego wpisu.");
  const bucket = optionalContentBucket();
  if (bucket) {
    await bucket.put(`${namespace}/records/${entry.id}.json`, Buffer.from(JSON.stringify(entry)), { httpMetadata: { contentType: "application/json" } });
    return;
  }
  if (process.env.NODE_ENV === "production") throw new Error("Brak trwałego magazynu zabezpieczonych wpisów.");
  const directory = path.join(os.tmpdir(), `krd-ig-${namespace}`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, `${entry.id}.json`);
  if (!existing) await writeFile(file, JSON.stringify(entry), { flag: "wx", mode: 0o600 });
  else {
    const temporary = path.join(directory, `${entry.id}.${crypto.randomUUID()}.tmp`);
    await writeFile(temporary, JSON.stringify(entry), { flag: "wx", mode: 0o600 });
    await rename(temporary, file);
  }
}
