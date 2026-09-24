import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { applyManagedPostOverrides, createManagedPost, deleteManagedPost, getManagedPostBySlug, importExistingPost, listDeletedPostSlugs, listImportablePosts, listManagedPosts, listManagedPostsForAdmin, resolvePublishedPost, updateManagedPost } from "../app/lib/managed-posts.ts";
import generatedPosts from "../app/data/generated-posts.json" with { type: "json" };
import type { NewsPost } from "../app/lib/content.ts";

test("publication SEO and image fit migrate legacy data and persist independently for news and tenders", async () => {
  const runtime = globalThis as typeof globalThis & { env?: { DB?: unknown; MEMBER_DOCUMENTS?: unknown } };
  const previousEnv = runtime.env;
  const database = new DatabaseSync(":memory:");
  database.exec("CREATE TABLE managed_posts (id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, excerpt TEXT NOT NULL, content TEXT NOT NULL, category TEXT NOT NULL, image_key TEXT, image_content_type TEXT, source TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by TEXT NOT NULL)");
  database.exec("INSERT INTO managed_posts (id, kind, slug, title, excerpt, content, category, created_by) VALUES ('legacy', 'news', 'legacy', 'Original title', 'Original excerpt', 'Original content', 'Aktualności', 'test')");
  runtime.env = {
    DB: {
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
    },
    MEMBER_DOCUMENTS: {},
  };

  try {
    const legacy = await getManagedPostBySlug("legacy");
    assert.ok(legacy);
    assert.equal(legacy.title, "Original title");
    assert.equal(legacy.seoTitle, "");
    assert.equal(legacy.seoDescription, "");
    assert.equal(legacy.imageFit, "contain");
    assert.deepEqual(legacy.paragraphs, ["Original content"]);

    for (const kind of ["news", "tender"] as const) {
      const input = { kind, title: `Visible ${kind}`, excerpt: "Visible excerpt", content: "Visible content", category: kind === "tender" ? "Zapytania ofertowe" : "Aktualności", source: "", createdBy: "test", seoTitle: `  SEO ${kind}  `, seoDescription: `  Description ${kind}  ` };
      const slug = await createManagedPost(input);
      const adminPost = (await listManagedPostsForAdmin()).find((post) => post.slug === slug)!;
      assert.equal(adminPost.seoTitle, `SEO ${kind}`);
      assert.equal(adminPost.seoDescription, `Description ${kind}`);
      assert.equal(adminPost.imageFit, "contain");
      const publicPost = (await listManagedPosts(kind)).find((post) => post.slug === slug)!;
      assert.equal(publicPost.seoTitle, `SEO ${kind}`);
      assert.equal(publicPost.title, input.title);
      assert.equal(publicPost.imageFit, "contain");
      await updateManagedPost(adminPost.id, { ...input, imageFit: "cover" });
      assert.equal((await getManagedPostBySlug(slug))?.imageFit, "cover");
      assert.equal((await listManagedPostsForAdmin()).find((post) => post.slug === slug)?.imageFit, "cover");
      await assert.rejects(updateManagedPost(adminPost.id, { ...input, imageFit: "stretch" }), /dopasowanie/);
      await assert.rejects(createManagedPost({ ...input, imageFit: "stretch" }), /dopasowanie/);

      await updateManagedPost(adminPost.id, { ...input, seoTitle: "Edited SEO", seoDescription: "Edited description" });
      assert.equal((await getManagedPostBySlug(slug))?.seoTitle, "Edited SEO");
      assert.equal((await getManagedPostBySlug(slug))?.seoDescription, "Edited description");
      assert.equal((await getManagedPostBySlug(slug))?.imageFit, "cover");
      await updateManagedPost(adminPost.id, { ...input, seoTitle: undefined, seoDescription: undefined });
      assert.equal((await getManagedPostBySlug(slug))?.seoTitle, "Edited SEO");
      await assert.rejects(updateManagedPost(adminPost.id, { ...input, seoTitle: "x".repeat(101) }), /100/);
      await assert.rejects(updateManagedPost(adminPost.id, { ...input, seoDescription: "x".repeat(241) }), /240/);
      assert.equal((await getManagedPostBySlug(slug))?.seoTitle, "Edited SEO");

      await updateManagedPost(adminPost.id, { ...input, seoTitle: "  ", seoDescription: "" });
      const cleared = await getManagedPostBySlug(slug);
      assert.equal(cleared?.seoTitle, "");
      await updateManagedPost(adminPost.id, { ...input, content: "<b>Bold</b>\n\n<i>Italic</i>\n\n<h2>Heading</h2>" });
      assert.deepEqual((await getManagedPostBySlug(slug))?.paragraphs, ["**Bold**", "*Italic*", "## Heading"]);
      assert.equal((await listManagedPostsForAdmin()).find((post) => post.id === adminPost.id)?.content, "**Bold**\n\n*Italic*\n\n## Heading");
      assert.equal(cleared?.seoDescription, "");
      assert.equal(cleared?.title, input.title);
      assert.equal(cleared?.excerpt, input.excerpt);
      await assert.rejects(createManagedPost({ ...input, seoTitle: "x".repeat(101) }), /100/);
      await assert.rejects(createManagedPost({ ...input, seoDescription: "x".repeat(241) }), /240/);
      const coverSlug = await createManagedPost({ ...input, imageFit: "cover" });
      assert.equal((await getManagedPostBySlug(coverSlug))?.imageFit, "cover");
    }
    assert.equal((await listManagedPostsForAdmin()).length, 5);
    const original = (generatedPosts as NewsPost[]).find((post) => post.slug === "wybierz-twoje-wartosci")!;
    assert.equal((await resolvePublishedPost(original.slug, original))?.title, original.title);
    assert.equal((await listImportablePosts()).length, 1);
    await assert.rejects(importExistingPost("not-allowed", "editor"), /importu/);
    await importExistingPost(original.slug, "editor");
    const imported = (await listManagedPostsForAdmin()).find((post) => post.slug === original.slug)!;
    assert.equal(imported.imported, true);
    assert.equal(imported.image, original.image);
    assert.equal(imported.createdAt, original.date);
    assert.deepEqual((await getManagedPostBySlug(original.slug))?.paragraphs, original.paragraphs);
    assert.equal((await getManagedPostBySlug(original.slug))?.justify, true);
    assert.deepEqual((await getManagedPostBySlug(original.slug))?.categories, original.categories);
    assert.equal(database.prepare("SELECT created_by FROM managed_posts WHERE slug = ?").get(original.slug)?.created_by, "editor");
    await updateManagedPost(imported.id, { title: "Edited campaign", excerpt: imported.excerpt, category: imported.category, source: imported.source, content: "Edited content", seoTitle: "Edited campaign SEO" });
    await importExistingPost(original.slug, "another-editor");
    assert.equal((await listImportablePosts()).length, 0);
    assert.equal((await listManagedPostsForAdmin()).filter((post) => post.slug === original.slug).length, 1);
    assert.equal((await resolvePublishedPost(original.slug, original))?.title, "Edited campaign");
    assert.equal((await resolvePublishedPost(original.slug, original))?.seoTitle, "Edited campaign SEO");
    assert.equal((await applyManagedPostOverrides([original]))[0].title, "Edited campaign");
    assert.deepEqual((await getManagedPostBySlug(original.slug))?.paragraphs, ["Edited content"]);
    assert.equal((await getManagedPostBySlug(original.slug))?.date, original.date);
    assert.equal(await deleteManagedPost(imported.id), true);
    assert.equal(await deleteManagedPost(imported.id), false);
    assert.equal(await getManagedPostBySlug(original.slug), null);
    assert.equal(await resolvePublishedPost(original.slug, original), undefined);
    assert.deepEqual(await applyManagedPostOverrides([original]), []);
    assert.ok((await listDeletedPostSlugs()).includes(original.slug));
    assert.equal((await listManagedPostsForAdmin()).some((post) => post.slug === original.slug), false);
    assert.equal((await listManagedPosts()).some((post) => post.slug === original.slug), false);
    assert.equal((await listImportablePosts()).length, 0);
    await importExistingPost(original.slug, "editor");
    assert.equal(await resolvePublishedPost(original.slug, original), undefined);
    await assert.rejects(updateManagedPost(imported.id, { title: "Restore", excerpt: "Restore", content: "Restore", category: "Aktualności", source: "" }), /Nie znaleziono/);
    for (const kind of ["news", "tender"] as const) {
      const normalPost = (await listManagedPostsForAdmin()).find((post) => post.kind === kind)!;
      assert.equal(await deleteManagedPost(normalPost.id), true);
      assert.equal(await getManagedPostBySlug(normalPost.slug), null);
      assert.equal((await listManagedPosts(kind)).some((post) => post.slug === normalPost.slug), false);
    }
  } finally {
    runtime.env = previousEnv;
    database.close();
  }
});