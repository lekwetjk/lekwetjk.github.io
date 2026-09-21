import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { desc, eq, sql } from "drizzle-orm";

import { getDb, getMemberDocumentsBucket } from "../../db/index.ts";
import { memberDocuments } from "../../db/schema.ts";

const MEMBER_DOCUMENTS_DIR = path.join(os.tmpdir(), "krd-ig-member-docs");
const MEMBER_DOCUMENTS_PREFIX = "member-documents/";

export type MemberDocumentScope = "documents" | "epi-geo";

export function memberDocumentScope(request: Request): MemberDocumentScope | null {
  const scope = new URL(request.url).searchParams.get("scope") ?? "documents";
  return scope === "documents" || scope === "epi-geo" ? scope : null;
}

function validFileName(fileName: string) {
  return /^[a-zA-Z0-9._-]+$/.test(fileName) && fileName !== "." && fileName !== "..";
}

function documentDirectory(scope: MemberDocumentScope) {
  return scope === "documents" ? MEMBER_DOCUMENTS_DIR : `${MEMBER_DOCUMENTS_DIR}-epi-geo`;
}

function documentPrefix(scope: MemberDocumentScope) {
  return scope === "documents" ? MEMBER_DOCUMENTS_PREFIX : "epi-geo-documents/";
}

function databaseKey(fileName: string, scope: MemberDocumentScope) {
  return scope === "documents" ? fileName : `epi-geo/${fileName}`;
}

function documentTitle(fileName: string) {
  const baseName = path.basename(fileName, path.extname(fileName));
  return baseName.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || fileName;
}

function documentKey(fileName: string, scope: MemberDocumentScope) {
  return `${documentPrefix(scope)}${fileName}`;
}

async function getDatabaseDocuments(scope: MemberDocumentScope) {
  const db = getDb();
  await db.run(sql`CREATE TABLE IF NOT EXISTS member_documents (file_name TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, content_type TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  const documents = await db.select().from(memberDocuments).orderBy(desc(memberDocuments.createdAt));
  return documents.flatMap((document) => {
    const fileName = scope === "documents"
      ? document.fileName
      : document.fileName.startsWith("epi-geo/") ? document.fileName.slice("epi-geo/".length) : "";
    return validFileName(fileName) ? [{ ...document, fileName }] : [];
  });
}

export async function saveMemberDocument(input: {
  fileName: string;
  content: Buffer;
  contentType: string;
}, scope: MemberDocumentScope = "documents") {
  if (!validFileName(input.fileName)) throw new Error("Invalid document filename");
  try {
    const bucket = getMemberDocumentsBucket();
    await bucket.put(documentKey(input.fileName, scope), input.content, {
      httpMetadata: { contentType: input.contentType },
    });
    return true;
  } catch {
    // Use D1 only for existing small-file installations without an R2 binding.
  }

  try {
    const db = getDb();
    await db.run(sql`CREATE TABLE IF NOT EXISTS member_documents (file_name TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, content_type TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.insert(memberDocuments).values({
      fileName: databaseKey(input.fileName, scope),
      title: documentTitle(input.fileName),
      content: input.content.toString("base64"),
      contentType: input.contentType,
    }).onConflictDoUpdate({
      target: memberDocuments.fileName,
      set: {
        title: documentTitle(input.fileName),
        content: input.content.toString("base64"),
        contentType: input.contentType,
      },
    });
    return true;
  } catch {
    await mkdir(documentDirectory(scope), { recursive: true });
    await writeFile(path.join(documentDirectory(scope), input.fileName), input.content);
    return false;
  }
}

export async function listMemberDocuments(scope: MemberDocumentScope = "documents") {
  const documents = new Map<string, { fileName: string; title: string; uploadedAt: string }>();

  try {
    const bucket = getMemberDocumentsBucket();
    const prefix = documentPrefix(scope);
    const result = await bucket.list({ prefix });
    for (const object of result.objects) {
      const fileName = object.key.slice(prefix.length);
      if (!validFileName(fileName)) continue;
      documents.set(fileName, { fileName, title: documentTitle(fileName), uploadedAt: object.uploaded.toISOString() });
    }
  } catch {
    // Fall back to D1 for documents uploaded before R2 was enabled.
  }

  try {
    const databaseDocuments = await getDatabaseDocuments(scope);
    for (const document of databaseDocuments) {
      if (!documents.has(document.fileName)) {
        documents.set(document.fileName, {
        fileName: document.fileName,
        title: document.title,
        uploadedAt: document.createdAt,
        });
      }
    }
  } catch {
    // Fall back to filesystem storage when no database binding is configured.
  }

  if (documents.size > 0) {
    return [...documents.values()].sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
  }

  try {
    await mkdir(documentDirectory(scope), { recursive: true });
  } catch {
    // Ignore filesystem permission issues in runtime sandboxes and continue with an empty list.
  }

  try {
    const entries = await readdir(documentDirectory(scope), { withFileTypes: true });

    const documents = await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name !== ".gitkeep")
      .map(async (entry) => {
        const fileName = entry.name;
        const details = await stat(path.join(documentDirectory(scope), fileName));
        return {
          fileName,
          title: documentTitle(fileName),
          uploadedAt: details.mtime.toISOString(),
        };
      }));

    return documents.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  } catch {
    return [];
  }
}

export async function deleteMemberDocument(fileName: string, scope: MemberDocumentScope = "documents") {
  if (!validFileName(fileName)) return false;
  try {
    const bucket = getMemberDocumentsBucket();
    const existingDocument = await bucket.get(documentKey(fileName, scope));
    if (existingDocument) {
      await bucket.delete(documentKey(fileName, scope));
      return true;
    }
  } catch {
    // Fall back to D1/local storage when R2 is unavailable.
  }

  try {
    const db = getDb();
    await db.delete(memberDocuments).where(eq(memberDocuments.fileName, databaseKey(fileName, scope)));
    return true;
  } catch {
    try {
      await unlink(path.join(documentDirectory(scope), fileName));
      return true;
    } catch {
      return false;
    }
  }
}

export async function getMemberDocument(fileName: string, scope: MemberDocumentScope = "documents") {
  if (!validFileName(fileName)) return null;
  try {
    const bucket = getMemberDocumentsBucket();
    const document = await bucket.get(documentKey(fileName, scope));
    if (document) {
      return {
        content: document.body,
        contentType: document.httpMetadata?.contentType || "application/octet-stream",
      };
    }
  } catch {
    // Fall back to D1/local storage when R2 is unavailable.
  }

  try {
    const documents = await getDatabaseDocuments(scope);
    const document = documents.find((candidate) => candidate.fileName === fileName);
    if (document) {
      return {
        content: Buffer.from(document.content, "base64"),
        contentType: document.contentType,
      };
    }
  } catch {
    // Fall back to filesystem storage when no database binding is configured.
  }

  try {
    return {
      content: await readFile(path.join(documentDirectory(scope), fileName)),
      contentType: fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
    };
  } catch {
    return null;
  }
}

export async function isAllowedMemberDocument(fileName: string, scope: MemberDocumentScope = "documents") {
  return Boolean(await getMemberDocument(fileName, scope));
}
