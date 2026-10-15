import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { deleteMemberDocument, documentContentType, getMemberDocument, listMemberDocuments, memberDocumentScope, normalizeMethodologyTitle, saveMemberDocument, updateMethodologyDocumentTitle } from "../app/lib/member-documents.ts";
import type { getMemberDocumentsBucket } from "../db/index.ts";

test("document scope supports private and public sections and rejects unknown sections", () => {
  assert.equal(memberDocumentScope(new Request("http://localhost/api/member/documents")), "documents");
  assert.equal(memberDocumentScope(new Request("http://localhost/api/member/documents?scope=epi-geo")), "epi-geo");
  assert.equal(memberDocumentScope(new Request("http://localhost/api/member/documents?scope=methodology")), "methodology");
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

test("publication titles are trimmed, required and limited to 200 characters", () => {
  assert.equal(normalizeMethodologyTitle("  Metodyka i biuletyny  "), "Metodyka i biuletyny");
  assert.equal(normalizeMethodologyTitle("a".repeat(200)), "a".repeat(200));
  for (const value of [undefined, null, 42, {}, "", "   ", "a".repeat(201)]) {
    assert.equal(normalizeMethodologyTitle(value), null);
  }
});

test("public document content types match all supported file extensions", () => {
  for (const [extension, contentType] of [
    [".pdf", "application/pdf"],
    [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".png", "image/png"],
  ]) {
    assert.equal(documentContentType(`material${extension.toUpperCase()}`), contentType);
  }
  assert.equal(documentContentType("material.unknown"), "application/octet-stream");
});

test("R2 listing follows metadata pagination and rejects an invalid cursor", async () => {
  const runtime = globalThis as typeof globalThis & {
    env?: { MEMBER_DOCUMENTS?: ReturnType<typeof getMemberDocumentsBucket> };
  };
  const previousEnv = runtime.env;
  const cursors: Array<string | undefined> = [];
  const object = (name: string) => ({ key: `methodology-documents/${name}.pdf`, uploaded: new Date(), customMetadata: { title: name } });
  const bucket: ReturnType<typeof getMemberDocumentsBucket> = {
    async put() {},
    async get() { return null; },
    async delete() {},
    async list(options) {
      cursors.push(options?.cursor);
      assert.deepEqual(options?.include, ["customMetadata"]);
      return options?.cursor
        ? { objects: [object("second")], truncated: false }
        : { objects: [object("first")], truncated: true, cursor: "next-page" };
    },
  };
  runtime.env = { MEMBER_DOCUMENTS: bucket };
  try {
    assert.deepEqual((await listMemberDocuments("methodology")).map((document) => document.title).sort(), ["first", "second"]);
    assert.deepEqual(cursors, [undefined, "next-page"]);
    bucket.list = async () => ({ objects: [], truncated: true });
    await assert.rejects(listMemberDocuments("methodology"), /without a new cursor/);
  } finally {
    runtime.env = previousEnv;
  }
});

test("R2 failures surface instead of returning empty lists or false success", async () => {
  const runtime = globalThis as typeof globalThis & {
    env?: { MEMBER_DOCUMENTS?: ReturnType<typeof getMemberDocumentsBucket> };
  };
  const previousEnv = runtime.env;
  const bucket: ReturnType<typeof getMemberDocumentsBucket> = {
    async put() { throw new Error("R2 write failed"); },
    async get() { throw new Error("R2 read failed"); },
    async delete() { throw new Error("R2 delete failed"); },
    async list() { throw new Error("R2 list failed"); },
  };
  runtime.env = { MEMBER_DOCUMENTS: bucket };
  try {
    await assert.rejects(saveMemberDocument({ fileName: "failure.pdf", content: Buffer.from("data"), contentType: "application/pdf", title: "Failure" }, "methodology"), /R2 write failed/);
    await assert.rejects(listMemberDocuments("methodology"), /R2 list failed/);
    await assert.rejects(getMemberDocument("failure.pdf", "methodology"), /R2 read failed/);
    await assert.rejects(updateMethodologyDocumentTitle("failure.pdf", "Failure"), /R2 read failed/);
    bucket.get = async () => ({ body: new Response("data").body!, uploaded: new Date() });
    await assert.rejects(deleteMemberDocument("failure.pdf", "methodology"), /R2 delete failed/);
  } finally {
    runtime.env = previousEnv;
  }
});

test("local methodology titles persist independently of file names and contents", async () => {
  const fileName = `methodology-title-${randomUUID()}.pdf`;
  try {
    await saveMemberDocument({ fileName, title: "Metodyka 2026", content: Buffer.from("original"), contentType: "application/pdf" }, "methodology");
    assert.equal((await listMemberDocuments("methodology")).find((document) => document.fileName === fileName)?.title, "Metodyka 2026");
    assert.equal(await updateMethodologyDocumentTitle(fileName, "  Nowy tytuł publikacji  "), true);
    assert.equal((await listMemberDocuments("methodology")).find((document) => document.fileName === fileName)?.title, "Nowy tytuł publikacji");
    assert.equal(await new Response((await getMemberDocument(fileName, "methodology"))!.content).text(), "original");
    assert.equal(await getMemberDocument(fileName), null);
    assert.equal(await updateMethodologyDocumentTitle(`missing-${randomUUID()}.pdf`, "Missing"), false);
    await assert.rejects(updateMethodologyDocumentTitle("../file.pdf", "Invalid"));
    await assert.rejects(updateMethodologyDocumentTitle(fileName, ""));
  } finally {
    await deleteMemberDocument(fileName, "methodology");
  }
});

for (const storage of ["R2", "D1"] as const) {
  test(`${storage} isolates listing, replacement, download and deletion by section`, async () => {
    const runtime = globalThis as typeof globalThis & {
      env?: { DB?: unknown; MEMBER_DOCUMENTS?: ReturnType<typeof getMemberDocumentsBucket> };
    };
    const previousEnv = runtime.env;
    const database = new DatabaseSync(":memory:");
    const objects = new Map<string, { content: Buffer; contentType: string; uploaded: Date; customMetadata?: Record<string, string> }>();
    const fileName = `scope-test-${randomUUID()}.txt`;

    runtime.env = storage === "R2" ? {
      MEMBER_DOCUMENTS: {
        async put(key, value, options) {
          const content = value instanceof ReadableStream
            ? Buffer.from(await new Response(value).arrayBuffer())
            : Buffer.from(value instanceof ArrayBuffer ? new Uint8Array(value) : value);
          objects.set(key, { content, contentType: options?.httpMetadata?.contentType ?? "text/plain", uploaded: new Date(), customMetadata: options?.customMetadata });
        },
        async get(key) {
          const object = objects.get(key);
          return object ? { body: new Response(new Uint8Array(object.content)).body!, httpMetadata: { contentType: object.contentType }, uploaded: object.uploaded, customMetadata: object.customMetadata } : null;
        },
        async delete(key) { objects.delete(key); },
        async list(options) {
          return { objects: [...objects].filter(([key]) => key.startsWith(options?.prefix ?? "")).map(([key, object]) => ({ key, uploaded: object.uploaded, customMetadata: object.customMetadata })) };
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
      await saveMemberDocument({ fileName, title: "Publiczna metodyka", content: Buffer.from("methodology content"), contentType: "application/pdf" }, "methodology");
      assert.equal((await listMemberDocuments("methodology")).find((document) => document.fileName === fileName)?.title, "Publiczna metodyka");
      assert.equal(await updateMethodologyDocumentTitle(fileName, "Zmieniony tytuł"), true);
      assert.equal((await listMemberDocuments("methodology")).find((document) => document.fileName === fileName)?.title, "Zmieniony tytuł");
      assert.equal(await new Response((await getMemberDocument(fileName, "methodology"))!.content).text(), "methodology content");
      assert.equal((await getMemberDocument(fileName, "methodology"))?.contentType, "application/pdf");
      assert.equal(await updateMethodologyDocumentTitle(`missing-${randomUUID()}.pdf`, "Missing"), false);
      assert.equal(await deleteMemberDocument(`missing-${randomUUID()}.pdf`, "methodology"), false);
      if (storage === "D1") {
        const deletedKeys: string[] = [];
        runtime.env = {
          ...runtime.env,
          MEMBER_DOCUMENTS: {
            async put() {},
            async get(key) {
              return key === `methodology-documents/${fileName}` ? { body: new Response("R2 replacement").body!, uploaded: new Date() } : null;
            },
            async list() { return { objects: [] }; },
            async delete(key) { deletedKeys.push(key); },
          },
        };
        assert.equal(await deleteMemberDocument(fileName, "methodology"), true);
        assert.deepEqual(deletedKeys, [`methodology-documents/${fileName}`]);
        assert.equal(database.prepare("SELECT file_name FROM member_documents WHERE file_name = ?").get(`methodology/${fileName}`), undefined);
        delete runtime.env.MEMBER_DOCUMENTS;
        assert.equal(await getMemberDocument(fileName, "methodology"), null);
      }
      assert.deepEqual((await listMemberDocuments()).map((document) => document.fileName), [fileName]);
      assert.equal(await new Response((await getMemberDocument(fileName))!.content).text(), "general");
    } finally {
      await deleteMemberDocument(fileName);
      await deleteMemberDocument(fileName, "epi-geo");
      await deleteMemberDocument(fileName, "methodology");
      runtime.env = previousEnv;
      database.close();
    }
  });
}