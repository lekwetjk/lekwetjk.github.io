import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";
import { changeMediaTrash, getBulletinSourceDownload, listMediaAssets, MAX_MEDIA_BYTES, resolveMediaSelection, uploadMediaAsset } from "../app/lib/media-library.ts";
import { collectMediaReferences } from "../app/lib/media-references.ts";
import { createManagedPost, deleteManagedPost, getManagedPostBySlug, listManagedPostsForAdmin, updateManagedPost } from "../app/lib/managed-posts.ts";
import { restoreContentRevision, currentRevisionState } from "../app/lib/content-history-actions.ts";
import { contentStateHash, listContentHistory } from "../app/lib/content-history.ts";
import staticCatalog from "../app/data/media-catalog.json" with { type: "json" };

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=", "base64");
const input = { kind: "news" as const, title: "Testowa publikacja", excerpt: "Opis testowy", content: "Treść testowa", category: "Aktualności", source: "", createdBy: "fixture" };

async function fixture() {
  const runtime = globalThis as typeof globalThis & { env?: unknown };
  const previous = runtime.env;
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE member_documents (file_name TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, content_type TEXT NOT NULL, created_at TEXT NOT NULL)");
  db.exec("CREATE TABLE bulletin_reports (id TEXT PRIMARY KEY, slug TEXT, title TEXT, month TEXT, year TEXT, data_key TEXT, sources_json TEXT, sheet_count TEXT, row_count TEXT, created_at TEXT, created_by TEXT)");
  const objects = new Map<string, { bytes: Uint8Array; uploaded: Date; httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }>();
  const control = { listing: "normal", puts: 0 };
  const environment = {
    CMS_MEDIA_ENABLED: "true", CMS_HISTORY_ENABLED: "true",
    DB: {
      prepare(query: string) {
        const statement = db.prepare(query);
        return { bind(...values: SQLInputValue[]) { return {
          async run() { return statement.run(...values); },
          async all() { return { results: statement.all(...values) }; },
          async raw() { return statement.all(...values).map(row => Object.values(row)); },
        }; } };
      },
    },
    MEMBER_DOCUMENTS: {
      async put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }) {
        control.puts++;
        objects.set(key, { bytes: new Uint8Array(value), uploaded: new Date("2026-01-01"), ...options });
      },
      async get(key: string) {
        const object = objects.get(key);
        return object ? { ...object, body: new Response(Uint8Array.from(object.bytes)).body! } : null;
      },
      async list(options?: { cursor?: string }) {
        if (control.listing === "failure") throw new Error("storage unavailable");
        if (control.listing === "cycle") return { objects: [], truncated: true, cursor: "same" };
        const all = [...objects].sort(([a], [b]) => a.localeCompare(b));
        const start = Number(options?.cursor ?? 0);
        return {
          objects: all.slice(start, start + 2).map(([key, object]) => ({ key, ...object, size: object.bytes.length })),
          truncated: start + 2 < all.length,
          cursor: String(start + 2),
        };
      },
      async delete() { throw new Error("Media must never be physically deleted."); },
    },
  };
  runtime.env = environment;
  await createManagedPost(input);
  return { db, environment, objects, control, close() { runtime.env = previous; db.close(); } };
}

test("usage detection normalizes owned URLs and encoded keys without treating external URLs as local files", () => {
  const references = collectMediaReferences({
    content: "[PDF](https://krd-ig.com.pl/api/media/media-library%2Fshared%2Ffile.pdf?download=1#page=2)",
    image: "managed-posts/post/photo.png",
    external: "https://external.example/media/foreign.png",
    privateCopy: { base64: "media-library/do-not-parse/base64.pdf" },
  });
  assert.ok(references.has("r2:media-library/shared/file.pdf"));
  assert.ok(references.has("r2:managed-posts/post/photo.png"));
  assert.equal(references.has("static:/media/foreign.png"), false);
  assert.equal(references.has("r2:media-library/do-not-parse/base64.pdf"), false);
});

test("existing public images and attachments can be reused without copying bytes, including history restore and feature rollback", async () => {
  const f = await fixture();
  try {
    const imageId = await uploadMediaAsset(new File([png], "wspólna.png", { type: "image/png" }), "fixture");
    const pdfId = await uploadMediaAsset(new File(["%PDF-1.7\nfixture"], "wspólny.pdf"), "fixture");
    const originalObjects = structuredClone(f.objects);
    const puts = f.control.puts;
    const first = await createManagedPost({ ...input, title: "Pierwsza publikacja", libraryImage: imageId, libraryAttachments: [pdfId, pdfId] });
    const second = await createManagedPost({ ...input, title: "Druga publikacja", libraryImage: imageId, libraryAttachments: [pdfId] });
    assert.equal(f.control.puts, puts);
    assert.deepEqual(f.objects, originalObjects);
    assert.equal((await getManagedPostBySlug(first))?.image, (await getManagedPostBySlug(second))?.image);
    assert.equal((await getManagedPostBySlug(first))?.links.length, 1);
    const assets = await listMediaAssets();
    assert.deepEqual(assets.find(asset => asset.id === imageId)?.usages.map(usage => usage.label).sort(), ["Druga publikacja", "Pierwsza publikacja"]);
    await assert.rejects(changeMediaTrash(imageId, "trash", "fixture"), /używany/);
    const post = (await listManagedPostsForAdmin()).find(post => post.slug === first)!;
    const staticImage = staticCatalog.find(asset => asset.contentType === "image/png")!;
    const ebook = staticCatalog.find(asset => asset.key.endsWith("/Dezinformacja-zywnosciow-ebook.pdf"))!;
    assert.ok(ebook.usages.some(usage => usage.href === "/tresc/e-book-o-dezinformacji-zywnosciowej"));
    await updateManagedPost(post.id, { ...input, libraryImage: staticImage.id, libraryAttachments: [ebook.id] });
    const changed = await getManagedPostBySlug(first);
    assert.equal(changed?.image, staticImage.key);
    assert.ok(changed?.links.some(link => link.href === ebook.key && link.managedAttachment));
    const version = (await listContentHistory()).find(version => version.resourceId === post.id)!;
    await restoreContentRevision(version.id, contentStateHash(await currentRevisionState(version)), "fixture");
    assert.equal((await getManagedPostBySlug(first))?.image, (await getManagedPostBySlug(second))?.image);
    await updateManagedPost(post.id, { ...input, libraryImage: staticImage.id, libraryAttachments: [ebook.id] });
    f.environment.CMS_MEDIA_ENABLED = "false";
    assert.equal((await getManagedPostBySlug(first))?.image, staticImage.key);
    assert.ok((await getManagedPostBySlug(first))?.links.some(link => link.href === ebook.key));
    await assert.rejects(resolveMediaSelection(imageId), /wyłączona/);
    await updateManagedPost(post.id, { ...input, title: "Edycja bez biblioteki" });
    assert.equal((await getManagedPostBySlug(first))?.image, staticImage.key);
    assert.deepEqual(f.objects, originalObjects);
  } finally { f.close(); }
});

test("trash preserves bytes and URLs, blocks shared, historical, trashed-content, inline and private references, and supports restore", async () => {
  const f = await fixture();
  try {
    const freeId = await uploadMediaAsset(new File(["%PDF-1.7\nunused"], "tak-sama-nazwa.pdf"), "fixture");
    const otherId = await uploadMediaAsset(new File(["%PDF-1.7\nother"], "tak-sama-nazwa.pdf"), "fixture");
    assert.notEqual(freeId, otherId);
    const before = structuredClone(f.objects);
    await changeMediaTrash(freeId, "trash", "fixture");
    assert.ok((await listMediaAssets()).find(asset => asset.id === freeId)?.trashedAt);
    assert.ok(await f.environment.MEMBER_DOCUMENTS.get(freeId.slice(3)));
    await assert.rejects(resolveMediaSelection(undefined, [freeId]), /koszu/);
    await changeMediaTrash(freeId, "restore", "fixture");
    assert.equal((await listMediaAssets()).find(asset => asset.id === freeId)?.trashedAt, null);
    assert.equal((await resolveMediaSelection(undefined, [freeId])).attachments.length, 1);
    const encodedHref = `https://krd-ig.com.pl/api/media/${encodeURIComponent(freeId.slice(3))}`;
    const slug = await createManagedPost({ ...input, content: `Odnośnik [pobierz](${encodedHref}?download=1#page=2).` });
    const post = (await listManagedPostsForAdmin()).find(post => post.slug === slug)!;
    await assert.rejects(changeMediaTrash(freeId, "trash", "fixture"), /używany/);
    await updateManagedPost(post.id, input);
    assert.ok((await listMediaAssets()).find(asset => asset.id === freeId)?.usages.some(usage => usage.kind === "history"));
    await assert.rejects(changeMediaTrash(freeId, "trash", "fixture"), /używany/);
    const second = await createManagedPost({ ...input, libraryAttachments: [otherId] });
    await deleteManagedPost((await listManagedPostsForAdmin()).find(post => post.slug === second)!.id);
    assert.ok((await listMediaAssets()).find(asset => asset.id === otherId)?.usages.some(usage => usage.kind === "trash"));
    await assert.rejects(changeMediaTrash(otherId, "trash", "fixture"), /używany/);
    await f.environment.MEMBER_DOCUMENTS.put("member-documents/private.pdf", Buffer.from("%PDF-private"));
    const privateAsset = (await listMediaAssets()).find(asset => asset.key === "member-documents/private.pdf")!;
    assert.equal(privateAsset.private, true);
    assert.equal(privateAsset.href, "/member/dokumenty/private.pdf?scope=documents");
    await assert.rejects(resolveMediaSelection(undefined, [privateAsset.id]), /prywatny/);
    await assert.rejects(changeMediaTrash(privateAsset.id, "trash", "fixture"), /chronione/);
    await f.environment.MEMBER_DOCUMENTS.put("methodology-documents/public.pdf", Buffer.from("%PDF-public"), { httpMetadata: { contentType: "application/pdf" } });
    const publicDocument = (await listMediaAssets()).find(asset => asset.key === "methodology-documents/public.pdf")!;
    assert.equal(publicDocument.private, false);
    const publicDocumentPost = await createManagedPost({ ...input, libraryAttachments: [publicDocument.id] });
    assert.equal((await getManagedPostBySlug(publicDocumentPost))?.links[0].href, "/member/dokumenty/public.pdf?scope=methodology");
    assert.ok((await listMediaAssets()).find(asset => asset.id === publicDocument.id)?.usages.some(usage => usage.kind === "post"));
    await assert.rejects(changeMediaTrash(staticCatalog[0].id, "trash", "fixture"), /chronione/);
    for (const [key, object] of before) assert.deepEqual(f.objects.get(key), object);
  } finally { f.close(); }
});

test("active bulletin sources show their usage and download the selected file without exposing them publicly", async () => {
  const f = await fixture();
  try {
    const sources = [
      { key: "bulletin-report-uploads/report/sources/biuletyn.pdf", name: "biuletyn.pdf" },
      { key: "bulletin-report-uploads/report/sources/material.pdf", name: "materiał.pdf" },
    ];
    f.db.prepare("INSERT INTO bulletin_reports(id,slug,title,sources_json) VALUES(?,?,?,?)")
      .run("report", "biuletyn-testowy", "Biuletyn testowy", JSON.stringify(sources));
    for (const source of sources) await f.environment.MEMBER_DOCUMENTS.put(source.key, Buffer.from(`%PDF-${source.name}`));
    const assets = await listMediaAssets();
    for (const source of sources) {
      const id = `r2:${source.key}`;
      const asset = assets.find(asset => asset.id === id)!;
      assert.equal(asset.private, true);
      assert.equal(asset.href, `/api/admin/media?download=${encodeURIComponent(id)}`);
      assert.ok(asset.usages.some(usage => usage.kind === "bulletin" && usage.label === "Biuletyn testowy"));
      assert.equal(await new Response((await getBulletinSourceDownload(id)).body).text(), `%PDF-${source.name}`);
      await assert.rejects(resolveMediaSelection(undefined, [id]), /prywatny/);
      await assert.rejects(changeMediaTrash(id, "trash", "fixture"), /chronione/);
    }
    await assert.rejects(getBulletinSourceDownload(staticCatalog[0].id), /Nie znaleziono/);
    f.objects.delete(sources[1].key);
    await assert.rejects(getBulletinSourceDownload(`r2:${sources[1].key}`), /Nie znaleziono/);
    f.environment.CMS_MEDIA_ENABLED = "false";
    await assert.rejects(getBulletinSourceDownload(`r2:${sources[0].key}`), /wyłączona/);
  } finally { f.close(); }
});

test("invalid uploads and incomplete indexes fail explicitly instead of approving deletion", async () => {
  const f = await fixture();
  try {
    const before = f.control.puts;
    for (const file of [new File([], "empty.pdf"), new File(["<script>"], "fake.png"), new File(["<svg/>"], "new.svg"), new File([new Uint8Array(MAX_MEDIA_BYTES + 1)], "large.pdf")]) {
      await assert.rejects(uploadMediaAsset(file, "fixture"));
    }
    assert.equal(f.control.puts, before);
    const id = await uploadMediaAsset(new File(["%PDF-1.7\nsafe"], "safe.pdf"), "fixture");
    f.control.listing = "cycle";
    await assert.rejects(changeMediaTrash(id, "trash", "fixture"), /kursor/);
    f.control.listing = "failure";
    await assert.rejects(changeMediaTrash(id, "trash", "fixture"), /storage unavailable/);
    f.control.listing = "normal";
    f.db.prepare("UPDATE managed_posts SET attachments_json = 'broken'").run();
    await assert.rejects(changeMediaTrash(id, "trash", "fixture"));
    assert.equal(f.db.prepare("SELECT trashed_at FROM media_assets WHERE id = ?").get(id)?.trashed_at, null);
  } finally { f.close(); }
});
