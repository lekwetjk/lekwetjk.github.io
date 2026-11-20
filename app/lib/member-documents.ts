import crypto from "node:crypto";
import { mkdir, readFile, readdir, stat, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { desc, eq, sql } from "drizzle-orm";
import { zipSync } from "fflate";

import { getDb, getMemberDocumentsBucket } from "../../db/index.ts";
import { memberDocuments } from "../../db/schema.ts";
import { completeTrashRestore, listContentTrash, trashResource } from "./content-trash.ts";
import { captureContentRevision, contentHistoryEnabled } from "./content-history.ts";

const MEMBER_DOCUMENTS_DIR = path.join(os.tmpdir(), "krd-ig-member-docs");
const MEMBER_DOCUMENTS_PREFIX = "member-documents/";

export type MemberDocumentScope = "documents" | "epi-geo" | "methodology";

export function normalizeMethodologyTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const title = value.trim();
  return title.length > 0 && title.length <= 200 ? title : null;
}

function optionalBucket() {
  try {
    return getMemberDocumentsBucket();
  } catch (error) {
    if (error instanceof Error && error.message.includes("binding `MEMBER_DOCUMENTS` is unavailable")) return null;
    throw error;
  }
}

function optionalDatabase() {
  try {
    return getDb();
  } catch (error) {
    if (error instanceof Error && error.message.includes("binding `DB` is unavailable")) return null;
    throw error;
  }
}

export function memberDocumentScope(request: Request): MemberDocumentScope | null {
  const scope = new URL(request.url).searchParams.get("scope") ?? "documents";
  return scope === "documents" || scope === "epi-geo" || scope === "methodology" ? scope : null;
}

export function validFileName(fileName: string) {
  return /^[a-zA-Z0-9._-]+$/.test(fileName) && fileName !== "." && fileName !== "..";
}

function documentDirectory(scope: MemberDocumentScope) {
  if (scope === "documents") return MEMBER_DOCUMENTS_DIR;
  return `${MEMBER_DOCUMENTS_DIR}-${scope}`;
}

function documentPrefix(scope: MemberDocumentScope) {
  if (scope === "documents") return MEMBER_DOCUMENTS_PREFIX;
  return `${scope}-documents/`;
}

function databaseKey(fileName: string, scope: MemberDocumentScope) {
  return scope === "documents" ? fileName : `${scope}/${fileName}`;
}

function documentTitle(fileName: string) {
  const baseName = path.basename(fileName, path.extname(fileName));
  return baseName.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || fileName;
}

function documentKey(fileName: string, scope: MemberDocumentScope) {
  return `${documentPrefix(scope)}${fileName}`;
}

function titleFilePath(fileName: string, scope: MemberDocumentScope) {
  return path.join(documentDirectory(scope), "titles", `${fileName}.txt`);
}

async function localDocumentTitle(fileName: string, scope: MemberDocumentScope) {
  try {
    return await readFile(titleFilePath(fileName, scope), "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return documentTitle(fileName);
    throw error;
  }
}

async function ensureDocumentTable(db: ReturnType<typeof getDb>) {
  await db.run(sql`CREATE TABLE IF NOT EXISTS member_documents (file_name TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, content_type TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
}

async function getDatabaseDocuments(scope: MemberDocumentScope, db: ReturnType<typeof getDb>) {
  await ensureDocumentTable(db);
  const documents = await db.select({
    fileName: memberDocuments.fileName,
    title: memberDocuments.title,
    createdAt: memberDocuments.createdAt,
  }).from(memberDocuments).orderBy(desc(memberDocuments.createdAt));
  return documents.flatMap((document) => {
    const scopePrefix = scope === "documents" ? "" : `${scope}/`;
    const fileName = scope === "documents"
      ? document.fileName
      : document.fileName.startsWith(scopePrefix) ? document.fileName.slice(scopePrefix.length) : "";
    return validFileName(fileName) ? [{ ...document, fileName }] : [];
  });
}

async function getDatabaseDocument(fileName: string, scope: MemberDocumentScope, db: ReturnType<typeof getDb>) {
  await ensureDocumentTable(db);
  const [document] = await db.select().from(memberDocuments)
    .where(eq(memberDocuments.fileName, databaseKey(fileName, scope))).limit(1);
  return document;
}

export async function saveMemberDocument(input: {
  fileName: string;
  content: Buffer;
  contentType: string;
  title?: string;
  uploadedAt?: string;
  changedBy?: string;
}, scope: MemberDocumentScope = "documents") {
  if (!validFileName(input.fileName)) throw new Error("Invalid document filename");
  const title = input.title === undefined ? documentTitle(input.fileName) : normalizeMethodologyTitle(input.title);
  if (!title) throw new Error("Invalid document title");
  if ((await listContentTrash("document")).some(entry => entry.resourceId === `${scope}/${input.fileName}`)) {
    throw new Error("Plik o tej nazwie jest w koszu. Przywróć go albo wybierz inną nazwę.");
  }
  await captureDocumentRevision(input.fileName, scope, input.changedBy);
  const bucket = optionalBucket();
  if (bucket) {
    await bucket.put(documentKey(input.fileName, scope), input.content, {
      httpMetadata: { contentType: input.contentType },
      customMetadata: { title, ...(input.uploadedAt ? { historyUploadedAt: input.uploadedAt } : {}) },
    });
    return true;
  }

  const db = optionalDatabase();
  if (db) {
    await ensureDocumentTable(db);
    await db.insert(memberDocuments).values({
      fileName: databaseKey(input.fileName, scope),
      title,
      content: input.content.toString("base64"),
      contentType: input.contentType,
      ...(input.uploadedAt ? { createdAt: input.uploadedAt } : {}),
    }).onConflictDoUpdate({
      target: memberDocuments.fileName,
      set: {
        title,
        content: input.content.toString("base64"),
        contentType: input.contentType,
      },
    });
    return true;
  }
  await mkdir(path.dirname(titleFilePath(input.fileName, scope)), { recursive: true });
  await writeFile(path.join(documentDirectory(scope), input.fileName), input.content);
  await writeFile(titleFilePath(input.fileName, scope), title, "utf8");
  if (input.uploadedAt) await utimes(path.join(documentDirectory(scope), input.fileName), new Date(), new Date(input.uploadedAt));
  return false;
}

export async function updateMethodologyDocumentTitle(fileName: string, value: unknown, changedBy?: string) {
  const title = normalizeMethodologyTitle(value);
  if (!validFileName(fileName) || !title) throw new Error("Invalid document filename or title");

  const scope = "methodology";
  if ((await listContentTrash("document")).some(entry => entry.resourceId === `${scope}/${fileName}`)) {
    throw new Error("Materiał jest w koszu. Przywróć go przed edycją.");
  }
  await captureDocumentRevision(fileName, scope, changedBy);
  const bucket = optionalBucket();
  if (bucket) {
    const document = await bucket.get(documentKey(fileName, scope));
    if (document) {
      await bucket.put(documentKey(fileName, scope), document.body, {
        httpMetadata: document.httpMetadata,
        customMetadata: { ...document.customMetadata, title },
      });
      return true;
    }
  }

  const db = optionalDatabase();
  if (db) {
    const documents = await getDatabaseDocuments(scope, db);
    if (documents.some((document) => document.fileName === fileName)) {
      await db.update(memberDocuments).set({ title }).where(eq(memberDocuments.fileName, databaseKey(fileName, scope)));
      return true;
    }
  }

  try {
    await stat(path.join(documentDirectory(scope), fileName));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
  await mkdir(path.dirname(titleFilePath(fileName, scope)), { recursive: true });
  await writeFile(titleFilePath(fileName, scope), title, "utf8");
  return true;
}

export async function listMemberDocuments(scope: MemberDocumentScope = "documents") {
  const trashed = new Set((await listContentTrash("document")).map(entry => entry.resourceId));
  const documents = new Map<string, { fileName: string; title: string; uploadedAt: string }>();

  const bucket = optionalBucket();
  if (bucket) {
    const prefix = documentPrefix(scope);
    let cursor: string | undefined;
    do {
      const result = await bucket.list({ prefix, include: ["customMetadata"], cursor });
      for (const object of result.objects) {
        const fileName = object.key.slice(prefix.length);
        if (!validFileName(fileName)) continue;
        documents.set(fileName, { fileName, title: object.customMetadata?.title || documentTitle(fileName), uploadedAt: object.customMetadata?.historyUploadedAt || object.uploaded.toISOString() });
      }
      if (result.truncated && (!result.cursor || result.cursor === cursor)) {
        throw new Error("R2 returned a truncated document list without a new cursor");
      }
      cursor = result.truncated ? result.cursor : undefined;
    } while (cursor);
  }

  const db = optionalDatabase();
  if (db) {
    const databaseDocuments = await getDatabaseDocuments(scope, db);
    for (const document of databaseDocuments) {
      if (!documents.has(document.fileName)) {
        documents.set(document.fileName, {
          fileName: document.fileName,
          title: document.title,
          uploadedAt: document.createdAt,
        });
      }
    }
  }

  if (documents.size > 0) {
    return [...documents.values()].filter(item => !trashed.has(`${scope}/${item.fileName}`)).sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
  }

  try {
    const entries = await readdir(documentDirectory(scope), { withFileTypes: true });

    const documents = await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name !== ".gitkeep" && validFileName(entry.name))
      .map(async (entry) => {
        const fileName = entry.name;
        const details = await stat(path.join(documentDirectory(scope), fileName));
        return {
          fileName,
          title: await localDocumentTitle(fileName, scope),
          uploadedAt: details.mtime.toISOString(),
        };
      }));

    return documents.filter(item => !trashed.has(`${scope}/${item.fileName}`)).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

export async function deleteMemberDocument(fileName: string, scope: MemberDocumentScope = "documents", changedBy?: string) {
  if (!validFileName(fileName)) return false;
  const document = (await listMemberDocuments(scope)).find(item => item.fileName === fileName);
  if (!document) return false;
  await captureDocumentRevision(fileName, scope, changedBy);
  await trashResource("document", `${scope}/${fileName}`, { ...document, scope });
  return true;
}

export async function restoreMemberDocument(fileName: string, scope: MemberDocumentScope = "documents") {
  if (!validFileName(fileName)) throw new Error("Invalid document filename");
  if (!await getMemberDocument(fileName, scope)) throw new Error("Brak pliku do przywrócenia.");
  await completeTrashRestore("document", `${scope}/${fileName}`);
}

export type DocumentRevision = {
  fileName: string; scope: MemberDocumentScope; title: string; uploadedAt: string;
  contentType: string; asset: { key: string } | { base64: string };
};

async function captureDocumentRevision(fileName: string, scope: MemberDocumentScope, changedBy?: string) {
  if (!contentHistoryEnabled()) return;
  const document = await getMemberDocument(fileName, scope);
  if (!document) return;
  const metadata = (await listMemberDocuments(scope)).find(item => item.fileName === fileName);
  if (!metadata) throw new Error("Brak metadanych dokumentu do zabezpieczenia.");
  const bucket = optionalBucket();
  let asset: DocumentRevision["asset"];
  if (bucket) {
    const key = `content-history/assets/${crypto.randomUUID()}`;
    await bucket.put(key, document.content, { httpMetadata: { contentType: document.contentType } });
    asset = { key };
  } else {
    asset = { base64: Buffer.from(await new Response(document.content).arrayBuffer()).toString("base64") };
  }
  await captureContentRevision("document", `${scope}/${fileName}`, metadata.title, { ...metadata, scope, contentType: document.contentType, asset } satisfies DocumentRevision, changedBy);
}

export async function getDocumentRevisionState(fileName: string, scope: MemberDocumentScope) {
  const metadata = (await listMemberDocuments(scope)).find(item => item.fileName === fileName);
  if (!metadata) return null;
  const document = await getMemberDocument(fileName, scope);
  if (!document) throw new Error("Nie można odczytać bieżącego dokumentu.");
  const bytes = Buffer.from(await new Response(document.content).arrayBuffer());
  return { ...metadata, scope, contentType: document.contentType, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
}

export async function readDocumentRevisionFile(resourceId: string, value: unknown) {
  const version = value as DocumentRevision | null;
  if (!version || `${version.scope}/${version.fileName}` !== resourceId || !["documents", "epi-geo", "methodology"].includes(version.scope) || !validFileName(version.fileName)) throw new Error("Nieprawidłowa wersja dokumentu.");
  if (!version.asset || typeof version.contentType !== "string" || !Number.isFinite(Date.parse(version.uploadedAt))) throw new Error("Nieprawidłowe metadane wersji dokumentu.");
  let content: Buffer | ReadableStream;
  if ("key" in version.asset) {
    if (!version.asset.key.startsWith("content-history/assets/")) throw new Error("Nieprawidłowy klucz kopii dokumentu.");
    const object = await optionalBucket()?.get(version.asset.key);
    if (!object) throw new Error("Brak zabezpieczonej kopii pliku.");
    content = object.body;
  } else {
    if (typeof version.asset.base64 !== "string") throw new Error("Nieprawidłowe dane kopii dokumentu.");
    content = Buffer.from(version.asset.base64, "base64");
    if (content.toString("base64") !== version.asset.base64) throw new Error("Uszkodzona kopia dokumentu.");
  }
  return { version, content };
}

export async function restoreDocumentRevision(resourceId: string, value: unknown, changedBy: string) {
  const { version, content } = await readDocumentRevisionFile(resourceId, value);
  const bytes = content instanceof Uint8Array ? Buffer.from(content) : Buffer.from(await new Response(content).arrayBuffer());
  await saveMemberDocument({ fileName: version.fileName, title: version.title, content: bytes, contentType: version.contentType, uploadedAt: version.uploadedAt, changedBy }, version.scope);
}

export async function getMemberDocument(fileName: string, scope: MemberDocumentScope = "documents") {
  if (!validFileName(fileName)) return null;
  const bucket = optionalBucket();
  if (bucket) {
    const document = await bucket.get(documentKey(fileName, scope));
    if (document) {
      return {
        content: document.body,
        contentType: document.httpMetadata?.contentType || "application/octet-stream",
      };
    }
  }

  const db = optionalDatabase();
  if (db) {
    const document = await getDatabaseDocument(fileName, scope, db);
    if (document) {
      return {
        content: Buffer.from(document.content, "base64"),
        contentType: document.contentType,
      };
    }
  }

  try {
    return {
      content: await readFile(path.join(documentDirectory(scope), fileName)),
      contentType: documentContentType(fileName),
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function createMemberDocumentsArchive() {
  const documents = await listMemberDocuments();
  const entries: Array<[string, Uint8Array]> = [];
  for (const { fileName } of documents) {
    const document = await getMemberDocument(fileName);
    if (!document) throw new Error(`Dokument nie został znaleziony: ${fileName}`);
    entries.push([fileName, new Uint8Array(await new Response(document.content).arrayBuffer())]);
  }
  return { content: new Uint8Array(zipSync(Object.fromEntries(entries))), fileCount: entries.length };
}

export function documentContentType(fileName: string) {
  switch (path.extname(fileName).toLowerCase()) {
    case ".pdf": return "application/pdf";
    case ".docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    default: return "application/octet-stream";
  }
}

export async function isAllowedMemberDocument(fileName: string, scope: MemberDocumentScope = "documents") {
  return Boolean(await getMemberDocument(fileName, scope));
}
