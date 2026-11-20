import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";
import { contentStateHash, listContentHistory } from "../app/lib/content-history.ts";
import { currentRevisionState, restoreContentRevision } from "../app/lib/content-history-actions.ts";
import { createManagedPost, deleteManagedPost, getManagedPostBySlug, listManagedPostsForAdmin, restoreManagedPost, updateManagedPost } from "../app/lib/managed-posts.ts";
import { deleteMemberDocument, getMemberDocument, listMemberDocuments, readDocumentRevisionFile, restoreMemberDocument, saveMemberDocument, updateMethodologyDocumentTitle } from "../app/lib/member-documents.ts";
import { getWstawieniaRows, saveWstawieniaRows } from "../app/lib/wstawienia.ts";

test("history restores post text and images, document bytes and placements without deleting retained files", async () => {
  const runtime = globalThis as typeof globalThis & { env?: unknown };
  const previous = runtime.env;
  const db = new DatabaseSync(":memory:");
  const objects = new Map<string, { bytes: Uint8Array; customMetadata?: Record<string, string>; contentType?: string; uploaded: Date }>();
  let failHistory = false;
  const environment = {
    CMS_HISTORY_ENABLED: "true",
    DB: {
      async batch(queries: { all(): Promise<{ results: unknown[] }> }[]) {
        db.exec("BEGIN");
        try {
          const results = [];
          for (const query of queries) results.push(await query.all());
          db.exec("COMMIT");
          return results;
        } catch (error) { db.exec("ROLLBACK"); throw error; }
      },
      prepare(query: string) {
      if (failHistory && query.startsWith('insert into "content_revisions"')) throw new Error("history storage unavailable");
      const statement = db.prepare(query);
      return { bind(...values: SQLInputValue[]) { return {
        async run() { return statement.run(...values); },
        async all() { return { results: statement.all(...values) }; },
        async raw() { return statement.all(...values).map(row => Object.values(row)); },
      }; } };
    } },
    MEMBER_DOCUMENTS: {
      async put(key: string, value: ArrayBuffer | Uint8Array | ReadableStream, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }) {
        const bytes = value instanceof ReadableStream ? new Uint8Array(await new Response(value).arrayBuffer()) : new Uint8Array(value);
        objects.set(key, { bytes, contentType: options?.httpMetadata?.contentType, customMetadata: options?.customMetadata, uploaded: new Date() });
      },
      async get(key: string) {
        const object = objects.get(key);
        return object ? { body: new Response(Uint8Array.from(object.bytes)).body!, httpMetadata: { contentType: object.contentType }, customMetadata: object.customMetadata, uploaded: object.uploaded } : null;
      },
      async list(options?: { prefix?: string }) { return { objects: [...objects].filter(([key]) => key.startsWith(options?.prefix ?? "")).map(([key, object]) => ({ key, uploaded: object.uploaded, customMetadata: object.customMetadata })) }; },
      async delete() { throw new Error("A retained file must not be deleted."); },
    },
  };
  runtime.env = environment;
  try {
    const input = { kind: "news" as const, title: "Original publication", excerpt: "Original excerpt", content: "Original content", category: "Aktualności", source: "", createdBy: "fixture" };
    const slug = await createManagedPost({ ...input, image: new File(["old image"], "image.png", { type: "image/png" }) });
    const post = (await listManagedPostsForAdmin()).find(row => row.slug === slug)!;
    await updateManagedPost(post.id, { ...input, title: "Changed publication", image: new File(["new image"], "image.png", { type: "image/png" }), changedBy: "fixture-editor" });
    const version = (await listContentHistory()).find(row => row.kind === "post")!;
    const before = contentStateHash(await currentRevisionState(version));
    await restoreContentRevision(version.id, before, "fixture-editor");
    const restored = await getManagedPostBySlug(slug);
    assert.equal(restored?.title, input.title);
    assert.equal(restored?.image, post.image);
    assert.equal(restored?.date, post.createdAt);
    await assert.rejects(restoreContentRevision(version.id, before, "fixture"), /zmieniła/);
    failHistory = true;
    await assert.rejects(updateManagedPost(post.id, { ...input, title: "Must not save" }), /history storage unavailable/);
    assert.equal((await getManagedPostBySlug(slug))?.title, input.title);
    await assert.rejects(deleteManagedPost(post.id), /history storage unavailable/);
    failHistory = false;
    await deleteManagedPost(post.id);
    await assert.rejects(restoreContentRevision(version.id, contentStateHash(null), "fixture"), /koszu/);
    await restoreManagedPost(post.id);

    await saveMemberDocument({ fileName: "history.pdf", title: "Original document", content: Buffer.from("original bytes"), contentType: "application/pdf" }, "methodology");
    const originalMetadata = (await listMemberDocuments("methodology"))[0];
    await saveMemberDocument({ fileName: "history.pdf", title: "Updated document", content: Buffer.from("updated bytes"), contentType: "application/pdf" }, "methodology");
    const documentVersion = (await listContentHistory()).find(row => row.kind === "document")!;
    const download = await readDocumentRevisionFile(documentVersion.resourceId, JSON.parse(documentVersion.snapshotJson));
    assert.equal(await new Response(download.content instanceof Uint8Array ? Uint8Array.from(download.content) : download.content).text(), "original bytes");
    await restoreContentRevision(documentVersion.id, contentStateHash(await currentRevisionState(documentVersion)), "fixture");
    assert.equal(await new Response((await getMemberDocument("history.pdf", "methodology"))!.content).text(), "original bytes");
    assert.deepEqual((await listMemberDocuments("methodology"))[0], originalMetadata);
    await updateMethodologyDocumentTitle("history.pdf", "Title changed", "fixture");
    const titleVersion = (await listContentHistory()).find(row => row.kind === "document" && JSON.parse(row.snapshotJson).title === "Original document")!;
    await restoreContentRevision(titleVersion.id, contentStateHash(await currentRevisionState(titleVersion)), "fixture");
    assert.equal((await listMemberDocuments("methodology"))[0].title, "Original document");
    const retained = new Map(objects);
    await deleteMemberDocument("history.pdf", "methodology");
    assert.deepEqual(objects.size >= retained.size, true);
    await restoreMemberDocument("history.pdf", "methodology");
    for (const [key, object] of retained) assert.deepEqual(objects.get(key)?.bytes, object.bytes);

    const originalRows = await getWstawieniaRows();
    await saveWstawieniaRows([{ year: "2099", values: Array(26).fill("50") }], "fixture");
    const tableVersion = (await listContentHistory()).find(row => row.kind === "wstawienia")!;
    await restoreContentRevision(tableVersion.id, contentStateHash(await currentRevisionState(tableVersion)), "fixture");
    assert.deepEqual((await getWstawieniaRows()).map(row => [row.year, row.values]), originalRows.map(row => [row.year, row.values]));
    assert.ok((await listContentHistory()).length > 5);
    const retainedHistoryCount = (await listContentHistory()).length;
    environment.CMS_HISTORY_ENABLED = "false";
    await updateManagedPost(post.id, { ...input, title: "History disabled" });
    assert.equal((await listContentHistory()).length, retainedHistoryCount);
    await deleteManagedPost(post.id);
    assert.equal(await getManagedPostBySlug(slug), null);
    for (const [key, object] of retained) assert.deepEqual(objects.get(key)?.bytes, object.bytes);
  } finally { runtime.env = previous; db.close(); }
});
