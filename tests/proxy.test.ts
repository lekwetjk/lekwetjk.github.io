import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, createSessionToken } from "../app/lib/auth.ts";
import { proxy } from "../proxy.ts";

function request(path: string, token?: string) {
  const headers = token ? { cookie: `${AUTH_COOKIE_NAME}=${token}` } : undefined;
  return new NextRequest(`https://example.test${path}`, { headers });
}

function redirectPath(response: ReturnType<typeof proxy>) {
  const location = response.headers.get("location");
  assert.ok(location);
  const url = new URL(location);
  return `${url.pathname}${url.search}`;
}

test("proxy redirects anonymous users from protected pages with their destination", () => {
  for (const path of ["/member/profil", "/admin/raporty", "/tresc/dla-czlonkow"]) {
    const response = proxy(request(path));
    assert.equal(response.status, 307);
    assert.equal(redirectPath(response), `/login/czlonkowie?redirect=${encodeURIComponent(path)}`);
  }
  const response = proxy(request("/tresc/raporty?raport=2026-08"));
  assert.equal(redirectPath(response), "/login/czlonkowie?redirect=%2Ftresc%2Fraporty%3Fraport%3D2026-08");
});

test("proxy permits the public archive and public methodology documents", () => {
  for (const path of ["/tresc/raporty", "/member/dokumenty/example?scope=methodology"]) {
    const response = proxy(request(path));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-middleware-next"), "1");
  }
  assert.equal(proxy(request("/member/dokumenty/example")).status, 307);
});

test("proxy accepts valid sessions and rejects invalid ones", () => {
  const token = createSessionToken({ id: "admin-1", username: "admin", role: "admin", name: "Administrator" });
  assert.equal(proxy(request("/admin/raporty", token)).headers.get("x-middleware-next"), "1");
  assert.equal(proxy(request("/member/profil", "invalid")).status, 307);
  assert.equal(redirectPath(proxy(request("/login/czlonkowie?redirect=%2Fadmin%2Fraporty", token))), "/admin/raporty");
  assert.equal(redirectPath(proxy(request("/login/czlonkowie?redirect=%2F%2Fexample.com", token))), "/member/profil");
  assert.equal(proxy(request("/login/czlonkowie")).headers.get("x-middleware-next"), "1");
});
