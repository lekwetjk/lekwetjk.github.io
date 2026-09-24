import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { createManagedPost, getManagedPostBySlug, listManagedPosts, listManagedPostsForAdmin, updateManagedPost } from "../app/lib/managed-posts.ts";

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
      assert.equal(cleared?.seoDescription, "");
      assert.equal(cleared?.title, input.title);
      assert.equal(cleared?.excerpt, input.excerpt);
      await assert.rejects(createManagedPost({ ...input, seoTitle: "x".repeat(101) }), /100/);
      await assert.rejects(createManagedPost({ ...input, seoDescription: "x".repeat(241) }), /240/);
      const coverSlug = await createManagedPost({ ...input, imageFit: "cover" });
      assert.equal((await getManagedPostBySlug(coverSlug))?.imageFit, "cover");
    }
    assert.equal((await listManagedPostsForAdmin()).length, 5);
  } finally {
    runtime.env = previousEnv;
    database.close();
  }
});