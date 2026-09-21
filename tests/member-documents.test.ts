import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { deleteMemberDocument, getMemberDocument, listMemberDocuments, memberDocumentScope, saveMemberDocument } from "../app/lib/member-documents.ts";
import type { getMemberDocumentsBucket } from "../db/index.ts";

test("document scope defaults to legacy documents and rejects unknown sections", () => {
  assert.equal(memberDocumentScope(new Request("http://localhost/api/member/documents")), "documents");
  assert.equal(memberDocumentScope(new Request("http://localhost/api/member/documents?scope=epi-geo")), "epi-geo");
  assert.equal(memberDocumentScope(new Request("http://localhost/api/member/documents?scope=other")), null);
});

test("local documents with identical names remain isolated across sections", async () => {
  const fileName = `scope-test-${randomUUID()}.txt`;
  try {
    await saveMemberDocument({ fileName, content: Buffer.from("general"), contentType: "text/plain" });
    assert.equal(await getMemberDocument(fileName, "epi-geo"), null);
    assert.equal((await listMemberDocuments("epi-geo")).some((document) => document.fileName === fileName), false);
    await saveMemberDocument({ fileName, content: Buffer.from("epidemiology"), contentType: "text/plain" }, "epi-geo");
    assert.equal((await getMemberDocument(fileName))?.content.toString(), "general");
    assert.equal((await getMemberDocument(fileName, "epi-geo"))?.content.toString(), "epidemiology");
    assert.equal((await listMemberDocuments()).some((document) => document.fileName === fileName), true);
    assert.equal((await listMemberDocuments("epi-geo")).some((document) => document.fileName === fileName), true);
    assert.equal(await deleteMemberDocument(fileName, "epi-geo"), true);
    assert.equal(await getMemberDocument(fileName, "epi-geo"), null);
    assert.equal((await getMemberDocument(fileName))?.content.toString(), "general");
  } finally {
    await deleteMemberDocument(fileName);
    await deleteMemberDocument(fileName, "epi-geo");
  }
});

test("filenames cannot address another section or directory", async () => {
  for (const fileName of ["epi-geo/test.txt", "../test.txt", "..\\test.txt", ".", ".."]) {
    assert.equal(await getMemberDocument(fileName), null);
    assert.equal(await deleteMemberDocument(fileName), false);
    await assert.rejects(saveMemberDocument({ fileName, content: Buffer.from("test"), contentType: "text/plain" }));
  }
});

for (const storage of ["R2", "D1"] as const) {
  test(`${storage} isolates listing, replacement, download and deletion by section`, async () => {
    const runtime = globalThis as typeof globalThis & {
      env?: { DB?: unknown; MEMBER_DOCUMENTS?: ReturnType<typeof getMemberDocumentsBucket> };
    };
    const previousEnv = runtime.env;
    const database = new DatabaseSync(":memory:");
    const objects = new Map<string, { content: Buffer; contentType: string; uploaded: Date }>();
    const fileName = `scope-test-${randomUUID()}.txt`;

    runtime.env = storage === "R2" ? {
      MEMBER_DOCUMENTS: {
        async put(key, value, options) {
          assert.ok(value instanceof Uint8Array);
          objects.set(key, { content: Buffer.from(value), contentType: options?.httpMetadata?.contentType ?? "text/plain", uploaded: new Date() });
        },
        async get(key) {
          const object = objects.get(key);
          return object ? { body: new Response(new Uint8Array(object.content)).body!, httpMetadata: { contentType: object.contentType }, uploaded: object.uploaded } : null;
        },
        async delete(key) { objects.delete(key); },
        async list(options) {
          return { objects: [...objects].filter(([key]) => key.startsWith(options?.prefix ?? "")).map(([key, object]) => ({ key, uploaded: object.uploaded })) };
        },
      },
    } : {
      DB: {
        prepare(query: string) {
          const statement = database.prepare(query);
          return {
            bind(...params: SQLInputValue[]) {
              return {
                async run() { return statement.run(...params); },
                async raw() { return statement.all(...params).map((row) => Object.values(row)); },
              };
            },
          };
        },
      },
    };

    try {
      assert.equal(await saveMemberDocument({ fileName, content: Buffer.from("general"), contentType: "text/plain" }), true);
      assert.equal((await listMemberDocuments("epi-geo")).some((document) => document.fileName === fileName), false);
      assert.equal(await getMemberDocument(fileName, "epi-geo"), null);
      assert.equal(await saveMemberDocument({ fileName, content: Buffer.from("epi"), contentType: "text/plain" }, "epi-geo"), true);
      assert.equal(await saveMemberDocument({ fileName, content: Buffer.from("epi updated"), contentType: "text/plain" }, "epi-geo"), true);
      assert.deepEqual((await listMemberDocuments()).map((document) => document.fileName), [fileName]);
      assert.deepEqual((await listMemberDocuments("epi-geo")).map((document) => document.fileName), [fileName]);
      assert.equal(await new Response((await getMemberDocument(fileName))!.content).text(), "general");
      assert.equal(await new Response((await getMemberDocument(fileName, "epi-geo"))!.content).text(), "epi updated");
      if (storage === "R2") {
        assert.deepEqual([...objects.keys()].sort(), [`epi-geo-documents/${fileName}`, `member-documents/${fileName}`]);
      } else {
        assert.deepEqual(database.prepare("SELECT file_name FROM member_documents ORDER BY file_name").all().map((row) => row.file_name), [`epi-geo/${fileName}`, fileName].sort());
      }
      assert.equal(await deleteMemberDocument(fileName, "epi-geo"), true);
      assert.equal(await getMemberDocument(fileName, "epi-geo"), null);
      assert.equal((await listMemberDocuments("epi-geo")).some((document) => document.fileName === fileName), false);
      assert.equal(await new Response((await getMemberDocument(fileName))!.content).text(), "general");
    } finally {
      await deleteMemberDocument(fileName);
      await deleteMemberDocument(fileName, "epi-geo");
      runtime.env = previousEnv;
      database.close();
    }
  });
}