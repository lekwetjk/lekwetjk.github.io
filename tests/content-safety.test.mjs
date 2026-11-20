import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { getPlatformProxy } from "wrangler";
import { zipSync } from "fflate";
import { contained, databaseInventory, objectInventory, outside, restoreDatabase, sha256 } from "../scripts/content-safety.mjs";
import { additiveStatements, compareBackups, simulateMigration, verifyStaticContent } from "../scripts/verify-content-migration.mjs";

test("restore rejects paths outside its new destination", () => {
  const root = path.resolve("restore-fixture");
  for (const name of ["../private", "/absolute", "a\\..\\private", "C:/private", "a/../../private"]) {
    assert.throws(() => contained(root, name));
  }
  assert.equal(contained(root, "assets/example.pdf"), path.join(root, "assets", "example.pdf"));
  assert.throws(() => outside(root, root));
  assert.throws(() => outside(root, path.join(root, "child")));
  outside(root, `${root}-sibling`);
});

test("database fingerprints preserve content, dates, status and application tables", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE ccf_content (id TEXT, body TEXT, date TEXT, status TEXT); INSERT INTO ccf_content VALUES ('a','Original','2020-01-01','published'),('b','Second','2020-02-01','published')");
    const query = sql => db.prepare(sql).all();
    const before = await databaseInventory(query);
    assert.equal(before.tables[0].rows, 2);
    db.exec("DELETE FROM ccf_content; INSERT INTO ccf_content VALUES ('b','Second','2020-02-01','published'),('a','Original','2020-01-01','published')");
    assert.deepEqual(await databaseInventory(query), before);
    for (const [column, value] of [["body", "Changed"], ["date", "2026-01-01"], ["status", "draft"]]) {
      db.exec("SAVEPOINT change");
      db.prepare(`UPDATE ccf_content SET ${column} = ? WHERE id = 'a'`).run(value);
      assert.notDeepEqual(await databaseInventory(query), before);
      db.exec("ROLLBACK TO change; RELEASE change");
    }
  } finally { db.close(); }
});

test("R2 inventory follows every page and retains metadata", async () => {
  const object = key => ({ key, size: 12, uploaded: new Date("2020-01-01"), etag: "etag", version: "version", httpMetadata: { contentType: "image/png" }, customMetadata: { title: "Fixture" } });
  const cursors = [];
  const inventory = await objectInventory({
    async list(options) {
      cursors.push(options.cursor);
      return options.cursor ? { objects: [object("a")], truncated: false } : { objects: [object("z")], truncated: true, cursor: "next" };
    },
  });
  assert.deepEqual(cursors, [undefined, "next"]);
  assert.deepEqual(inventory.map(item => item.key), ["a", "z"]);
  assert.equal(inventory[0].httpMetadata.contentType, "image/png");
  assert.equal(inventory[0].customMetadata.title, "Fixture");
});

test("R2 inventory rejects duplicate objects and cursor cycles", async () => {
  const object = { key: "duplicate", uploaded: new Date() };
  await assert.rejects(objectInventory({ async list() { return { objects: [object, object] }; } }), /duplicate/);
  let page = 0;
  await assert.rejects(objectInventory({ async list() {
    return { objects: [], truncated: true, cursor: ["a", "b", "a"][page++] };
  } }), /pagination/);
});

test("additive migration retains published records and existing column values", () => {
  const result = simulateMigration(
    "CREATE TABLE posts (slug TEXT PRIMARY KEY, published INTEGER, date TEXT); INSERT INTO posts VALUES ('unchanged-url',1,'2020-01-01')",
    "ALTER TABLE posts ADD COLUMN revision TEXT; CREATE TABLE IF NOT EXISTS trash (id TEXT PRIMARY KEY, snapshot TEXT); CREATE INDEX IF NOT EXISTS trash_id ON trash(id)",
  );
  assert.equal(result.recordsChecked, 1);
  assert.equal(result.tablesChecked, 1);
});

test("migration rejects destructive SQL, including additional statements and triggers", () => {
  for (const sql of [
    "DROP TABLE posts", "DELETE FROM posts", "UPDATE posts SET published=0",
    "ALTER TABLE posts RENAME TO gone", "ALTER TABLE posts DROP COLUMN published",
    "CREATE TABLE IF NOT EXISTS safe(id); /* hidden */ DELETE FROM posts",
    "CREATE TRIGGER change AFTER INSERT ON posts BEGIN DELETE FROM posts; END",
    "PRAGMA writable_schema=ON", "VACUUM", "REPLACE INTO posts VALUES ('draft')",
  ]) assert.throws(() => additiveStatements(sql));
  assert.equal(additiveStatements("/* safe */ CREATE TABLE IF NOT EXISTS new_table (content TEXT DEFAULT 'a;b -- not a comment'); -- end").length, 1);
});

test("pre/post checks reject disappearing or changed content and files", () => {
  const before = {
    database: { inventory: { tables: [{ name: "posts", rows: 1, sha256: "original" }] } },
    source: { files: [{ path: "public/photo.png", sha256: "photo" }] },
    objects: [{ key: "shared.pdf", size: 12, sha256: "document", httpMetadata: {}, customMetadata: {} }],
  };
  assert.equal(compareBackups(before, structuredClone(before)).status, "EXISTING CONTENT AND FILES UNCHANGED");
  for (const mutate of [
    copy => { copy.database.inventory.tables[0].sha256 = "draft"; },
    copy => { copy.source.files = []; },
    copy => { copy.objects = []; },
    copy => { copy.objects[0].sha256 = "replacement"; },
  ]) {
    const after = structuredClone(before);
    mutate(after);
    assert.throws(() => compareBackups(before, after));
  }
});

test("local D1 restore supports oversized exported INSERTs and foreign key ordering", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "krd-safety-fixture-"));
  const configPath = path.join(directory, "wrangler.json");
  await fs.writeFile(configPath, JSON.stringify({
    name: "safety-test", compatibility_date: "2026-07-31",
    d1_databases: [{ binding: "DB", database_name: "fixture", database_id: "00000000-0000-0000-0000-000000000001" }],
  }));
  let platform;
  try {
    platform = await getPlatformProxy({ configPath, envFiles: [], persist: false, remoteBindings: false });
    const body = "x".repeat(150_000);
    await restoreDatabase(platform.env.DB, `CREATE TABLE z_parent(id TEXT PRIMARY KEY); CREATE TABLE a_child(parent_id TEXT REFERENCES z_parent(id), body TEXT); INSERT INTO z_parent VALUES ('fixture'); INSERT INTO a_child VALUES ('fixture','${body}')`);
    const result = await platform.env.DB.prepare("SELECT length(body) AS size FROM a_child").all();
    assert.equal(result.results[0].size, body.length);
  } finally {
    if (platform) await platform.dispose();
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("pre/post verification accepts added columns without changing published data", () => {
  const beforeSql = "CREATE TABLE posts(slug TEXT PRIMARY KEY, published INTEGER); INSERT INTO posts VALUES ('fixed-url',1)";
  const afterSql = `${beforeSql}; ALTER TABLE posts ADD COLUMN revision TEXT`;
  const before = { database: { sha256: sha256(beforeSql), inventory: { tables: [{ name: "posts" }] } }, source: { files: [] }, objects: [] };
  const after = { ...before, database: { ...before.database, sha256: sha256(afterSql) } };
  assert.equal(compareBackups(before, after, beforeSql, afterSql).tables, 1);
  const changedSql = `${afterSql}; UPDATE posts SET published=0`;
  assert.throws(() => compareBackups(before, { ...after, database: { ...after.database, sha256: sha256(changedSql) } }, beforeSql, changedSql), /changed/);
});

test("new publication fields cannot turn already published content into drafts", () => {
  const source = "CREATE TABLE managed_posts(slug TEXT, deleted_at TEXT); INSERT INTO managed_posts VALUES ('published-url',NULL),('already-deleted','2020-01-01')";
  for (const addition of ["status TEXT DEFAULT 'draft'", "publication_status TEXT", "is_published INTEGER DEFAULT 0", "is_deleted INTEGER DEFAULT 1", "is_draft INTEGER DEFAULT 1", "visibility TEXT DEFAULT 'private'"]) {
    assert.throws(() => simulateMigration(source, `ALTER TABLE managed_posts ADD COLUMN ${addition}`));
  }
  assert.equal(simulateMigration(source, "ALTER TABLE managed_posts ADD COLUMN status TEXT NOT NULL DEFAULT 'published'").recordsChecked, 2);
});

test("source checks distinguish Git JSON line endings from content and binary changes", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "krd-source-fixture-"));
  try {
    await fs.mkdir(path.join(directory, "app", "data"), { recursive: true });
    await fs.mkdir(path.join(directory, "public"));
    const original = Buffer.from('[\r\n"fixed-url"\r\n]');
    const image = Buffer.from([1, 13, 10, 2]);
    const svg = Buffer.from("<svg>\r\n<path/>\r\n</svg>");
    const archive = zipSync({ "app/data/posts.json": original, "public/logo.svg": svg });
    await fs.writeFile(path.join(directory, "source.zip"), archive);
    await fs.writeFile(path.join(directory, "app", "data", "posts.json"), '[\n"fixed-url"\n]');
    await fs.writeFile(path.join(directory, "public", "photo.png"), image);
    await fs.writeFile(path.join(directory, "public", "logo.svg"), "<svg>\n<path/>\n</svg>");
    const manifest = { source: { sha256: sha256(archive), files: [
      { path: "app/data/posts.json", sha256: sha256(original) },
      { path: "public/photo.png", sha256: sha256(image) },
      { path: "public/logo.svg", sha256: sha256(svg) },
    ] } };
    assert.deepEqual((await verifyStaticContent(manifest, directory, directory)).jsonLineEndingOnly, ["app/data/posts.json"]);
    assert.deepEqual((await verifyStaticContent(manifest, directory, directory)).svgLineEndingOnly, ["public/logo.svg"]);
    await fs.writeFile(path.join(directory, "public", "logo.svg"), "<svg>\n<rect/>\n</svg>");
    await assert.rejects(verifyStaticContent(manifest, directory, directory), /Archived content changed/);
    await fs.writeFile(path.join(directory, "public", "logo.svg"), svg);
    await fs.writeFile(path.join(directory, "app", "data", "posts.json"), '[\n"changed-url"\n]');
    await assert.rejects(verifyStaticContent(manifest, directory, directory), /Archived content changed/);
    await fs.writeFile(path.join(directory, "app", "data", "posts.json"), original);
    await fs.writeFile(path.join(directory, "public", "photo.png"), Buffer.from([1, 10, 2]));
    await assert.rejects(verifyStaticContent(manifest, directory, directory), /public file changed/);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
