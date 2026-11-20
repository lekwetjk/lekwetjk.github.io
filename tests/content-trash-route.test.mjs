import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";

async function loadRoute(relative, plugins = []) {
  const built = await build({
    entryPoints: [fileURLToPath(new URL(relative, import.meta.url))],
    platform: "node", format: "cjs", bundle: true, packages: "external", write: false, plugins,
  });
  const compiled = { exports: {} };
  new Function("require", "module", "exports", built.outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports);
  return compiled.exports;
}

test("public media cannot read retained trash records but still serves existing images", async () => {
  const route = await loadRoute("../app/api/media/[...key]/route.ts");
  const previous = globalThis.env;
  let reads = 0;
  globalThis.env = { MEMBER_DOCUMENTS: {
    async get() { reads++; return { body: new Response("existing image").body, httpMetadata: { contentType: "image/png" } }; },
  } };
  try {
    for (const key of [["content-trash", "records", "fixture.json"], ["content-trash/records/fixture.json"], ["content-history", "records", "fixture.json"], ["content-history", "assets", "fixture.pdf"], ["content-history/assets/fixture.pdf"]]) {
      const response = await route.GET(new Request("https://fixture.test/api/media/private"), { params: Promise.resolve({ key }) });
      assert.equal(response.status, 404);
    }
    assert.equal(reads, 0);
    const response = await route.GET(new Request("https://fixture.test/api/media/image"), { params: Promise.resolve({ key: ["managed-posts", "fixture", "photo.png"] }) });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "existing image");
  } finally { globalThis.env = previous; }
});

test("content and media administration APIs reject unauthenticated callers before reading data", async () => {
  for (const name of ["content-trash", "content-history", "media"]) {
  const route = await loadRoute(`../app/api/admin/${name}/route.ts`, [{
    name: "no-session",
    setup(builder) {
      builder.onResolve({ filter: /^next\/headers$/ }, () => ({ path: "cookies", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export async function cookies() { return { get() { return undefined; } }; }" }));
    },
  }]);
  assert.equal((await route.GET(new Request("https://fixture.test/api/admin/private"))).status, 403);
  assert.equal((await route.PATCH(new Request("https://fixture.test/api/admin/content-trash", { method: "PATCH", body: "{}" }))).status, 403);
  if (name === "media") assert.equal((await route.POST(new Request("https://fixture.test/api/admin/media", { method: "POST" }))).status, 403);
  }
});

test("trash API respects role and feature gates and restores retained documents", async () => {
  const previousEnvironment = globalThis.env;
  const previousSecret = process.env.AUTH_SECRET;
  const database = new DatabaseSync(":memory:");
  process.env.AUTH_SECRET = "cms-safety-fixture-only";
  const roleToken = role => {
    const payload = Buffer.from(JSON.stringify({ sub: "fixture", username: "fixture", name: "Fixture", role, exp: Math.floor(Date.now() / 1000) + 60 })).toString("base64url");
    return `${payload}.${crypto.createHmac("sha256", process.env.AUTH_SECRET).update(payload).digest("base64url")}`;
  };
  const sessionPlugins = [{
    name: "fixture-session",
    setup(builder) {
      builder.onResolve({ filter: /^next\/headers$/ }, () => ({ path: "cookies", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export async function cookies() { return { get() { return { value: globalThis.__cmsSafetyRouteToken }; } }; }" }));
    },
  }];
  const route = await loadRoute("../app/api/admin/content-trash/route.ts", sessionPlugins);
  const history = await loadRoute("../app/api/admin/content-history/route.ts", sessionPlugins);
  const media = await loadRoute("../app/api/admin/media/route.ts", sessionPlugins);
  globalThis.env = {
    CMS_TRASH_ENABLED: "false",
    CMS_HISTORY_ENABLED: "false",
    DB: {
      prepare(sql) {
        const statement = database.prepare(sql);
        return { bind(...values) { return {
          async run() { return statement.run(...values); },
          async all() { return { results: statement.all(...values) }; },
          async raw() { return statement.all(...values).map(row => Object.values(row)); },
        }; } };
      },
    },
    MEMBER_DOCUMENTS: {
      async get(key) { return key === "member-documents/fixture.pdf" ? { body: new Response("retained").body } : null; },
    },
  };
  try {
    globalThis.__cmsSafetyRouteToken = roleToken("member");
    assert.equal((await route.GET()).status, 403);
    assert.equal((await history.GET(new Request("https://fixture.test/api/admin/content-history"))).status, 403);
    assert.equal((await media.GET()).status, 403);
    assert.equal((await media.POST(new Request("https://fixture.test/api/admin/media", { method: "POST" }))).status, 403);
    assert.equal((await media.PATCH(new Request("https://fixture.test/api/admin/media", { method: "PATCH", body: "{}" }))).status, 403);
    globalThis.__cmsSafetyRouteToken = roleToken("admin");
    assert.equal((await route.GET()).status, 404);
    assert.equal((await history.GET(new Request("https://fixture.test/api/admin/content-history"))).status, 404);
    assert.equal((await media.GET()).status, 404);
    assert.equal((await media.POST(new Request("https://fixture.test/api/admin/media", { method: "POST" }))).status, 404);
    assert.equal((await media.PATCH(new Request("https://fixture.test/api/admin/media", { method: "PATCH", body: "{}" }))).status, 404);
    globalThis.env.CMS_HISTORY_ENABLED = "true";
    assert.equal((await history.GET(new Request("https://fixture.test/api/admin/content-history"))).status, 200);
    const snapshot = { scope: "documents", fileName: "fixture.pdf", title: "Previous document", uploadedAt: "2020-01-01", contentType: "application/pdf", asset: { base64: Buffer.from("original file bytes").toString("base64") } };
    database.prepare("INSERT INTO content_revisions VALUES (?,?,?,?,?,?,?)").run("version", "document", "documents/fixture.pdf", "Previous document", JSON.stringify(snapshot), "2020-01-01", "fixture");
    const historyList = await history.GET(new Request("https://fixture.test/api/admin/content-history"));
    assert.equal(historyList.headers.get("Cache-Control"), "no-store");
    const historyText = await historyList.text();
    assert.equal(historyText.includes("snapshotJson"), false);
    assert.equal(historyText.includes("base64"), false);
    const download = await history.GET(new Request("https://fixture.test/api/admin/content-history?id=version&download=true"));
    assert.equal(download.status, 200);
    assert.equal(await download.text(), "original file bytes");
    globalThis.env.CMS_TRASH_ENABLED = "true";
    assert.equal((await route.GET()).status, 200);
    database.prepare("INSERT INTO content_trash VALUES (?,?,?,?,?,NULL)").run("entry", "document", "documents/fixture.pdf", "{}", "2020-01-01");
    const listed = await route.GET();
    assert.equal(listed.headers.get("Cache-Control"), "no-store");
    assert.equal((await listed.json()).entries.length, 1);
    const restored = await route.PATCH(new Request("https://fixture.test/api/admin/content-trash", { method: "PATCH", body: JSON.stringify({ id: "entry" }) }));
    assert.equal(restored.status, 200);
    assert.ok(database.prepare("SELECT restored_at FROM content_trash WHERE id='entry'").get().restored_at);
    assert.equal((await (await route.GET()).json()).entries.length, 0);
    const missing = await route.PATCH(new Request("https://fixture.test/api/admin/content-trash", { method: "PATCH", body: JSON.stringify({ id: "missing" }) }));
    assert.equal(missing.status, 404);
  } finally {
    globalThis.env = previousEnvironment;
    delete globalThis.__cmsSafetyRouteToken;
    if (previousSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previousSecret;
    database.close();
  }
});
