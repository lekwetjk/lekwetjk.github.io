import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { desc, eq, sql } from "drizzle-orm";

import { getDb } from "../../db/index.ts";
import { memberDocuments } from "../../db/schema.ts";

const MEMBER_DOCUMENTS_DIR = path.join(os.tmpdir(), "krd-ig-member-docs");

function documentTitle(fileName: string) {
  const baseName = path.basename(fileName, path.extname(fileName));
  return baseName.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || fileName;
}

async function getDatabaseDocuments() {
  const db = getDb();
  await db.run(sql`CREATE TABLE IF NOT EXISTS member_documents (file_name TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, content_type TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  return db.select().from(memberDocuments).orderBy(desc(memberDocuments.createdAt));
}

export async function saveMemberDocument(input: {
  fileName: string;
  content: Buffer;
  contentType: string;
}) {
  try {
    const db = getDb();
    await db.run(sql`CREATE TABLE IF NOT EXISTS member_documents (file_name TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, content_type TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.insert(memberDocuments).values({
      fileName: input.fileName,
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
    await mkdir(MEMBER_DOCUMENTS_DIR, { recursive: true });
    await writeFile(path.join(MEMBER_DOCUMENTS_DIR, input.fileName), input.content);
    return false;
  }
}

export async function listMemberDocuments() {
  try {
    const documents = await getDatabaseDocuments();
    if (documents.length > 0) {
      return documents.map((document) => ({
        fileName: document.fileName,
        title: document.title,
        uploadedAt: document.createdAt,
      }));
    }
  } catch {
    // Fall back to filesystem storage when no database binding is configured.
  }

  try {
    await mkdir(MEMBER_DOCUMENTS_DIR, { recursive: true });
  } catch {
    // Ignore filesystem permission issues in runtime sandboxes and continue with an empty list.
  }

  try {
    const entries = await readdir(MEMBER_DOCUMENTS_DIR, { withFileTypes: true });

    const documents = await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name !== ".gitkeep")
      .map(async (entry) => {
        const fileName = entry.name;
        const details = await stat(path.join(MEMBER_DOCUMENTS_DIR, fileName));
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

export async function deleteMemberDocument(fileName: string) {
  try {
    const db = getDb();
    await db.delete(memberDocuments).where(eq(memberDocuments.fileName, fileName));
    return true;
  } catch {
    try {
      await unlink(path.join(MEMBER_DOCUMENTS_DIR, fileName));
      return true;
    } catch {
      return false;
    }
  }
}

export async function getMemberDocument(fileName: string) {
  try {
    const documents = await getDatabaseDocuments();
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
      content: await readFile(path.join(MEMBER_DOCUMENTS_DIR, fileName)),
      contentType: fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
    };
  } catch {
    return null;
  }
}

export async function isAllowedMemberDocument(fileName: string) {
  const documents = await listMemberDocuments();
  return documents.some((document) => document.fileName === fileName);
}
