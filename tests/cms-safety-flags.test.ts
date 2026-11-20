import assert from "node:assert/strict";
import test from "node:test";
import { cmsFlag, cmsWriteBlocked } from "../app/lib/cms-safety-flags.ts";

test("new features are opt-in and invalid flags cannot silently enable writes", () => {
  assert.equal(cmsFlag(undefined), false);
  assert.equal(cmsFlag("false"), false);
  assert.equal(cmsFlag("true"), true);
  assert.throws(() => cmsFlag("yes"));
  const write = new Request("https://example.test/api/admin/managed-posts", { method: "DELETE" });
  assert.equal(cmsWriteBlocked(write, {}), false);
  assert.equal(cmsWriteBlocked(write, { CMS_READ_ONLY: "true" }), true);
  assert.throws(() => cmsWriteBlocked(write, { CMS_READ_ONLY: "typo" }));
});

test("emergency read-only retains public reads, login and unrelated existing routes", () => {
  for (const [pathname, method] of [["/api/admin/managed-posts", "GET"], ["/api/admin/managed-posts", "OPTIONS"], ["/login", "POST"], ["/zapytania-ofertowe", "GET"], ["/api/administrator", "POST"]]) {
    assert.equal(cmsWriteBlocked(new Request(`https://example.test${pathname}`, { method }), { CMS_READ_ONLY: "true" }), false);
  }
  for (const pathname of ["/admin", "/api/admin", "/api/admin/content-trash", "/api/wstawienia"]) {
    assert.equal(cmsWriteBlocked(new Request(`https://example.test${pathname}`, { method: "PATCH" }), { CMS_READ_ONLY: "true" }), true);
  }
});
