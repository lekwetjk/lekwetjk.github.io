import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import {
  createSessionToken,
  getMemberUsers,
  hashPassword,
  verifyCredentials,
  verifySessionToken,
} from "../app/lib/auth.ts";

test("member users are available", async () => {
  const users = await getMemberUsers();
  assert.ok(users.length > 0);
  assert.ok(users.every((user) => user.username && user.passwordHash));
});

test("public member banner respects the D1 parameter limit for more than 100 members", () => {
  const script = `
    import assert from 'node:assert/strict';
    const ids = Array.from({ length: 205 }, (_, index) => 'member-' + index);
    const batches = { logos: [], profiles: [] };
    globalThis.env = {
      DB: {
        prepare(query) {
          return {
            bind(...values) {
              assert.ok(values.length <= 100, 'too many SQL variables: ' + values.length);
              return {
                async raw() {
                  if (query.includes('from "member_users"')) {
                    return ids.map(id => [id, id, id, 'member', 'unused', 'true', '', '']);
                  }
                  if (query.includes('from "member_user_logos"')) {
                    batches.logos.push(values.length);
                    return values.map(id => [id]);
                  }
                  if (query.includes('from "member_profiles"')) {
                    batches.profiles.push(values.length);
                    return values.map(id => [id, JSON.stringify({ companyName: 'Company ' + id })]);
                  }
                  throw new Error('Unexpected query: ' + query);
                },
              };
            },
          };
        },
      },
      MEMBER_DOCUMENTS: {
        async list() { return { objects: [] }; },
        async get() { return null; },
      },
    };
    const { getPublicMemberBannerItems } = await import(${JSON.stringify(new URL("../app/lib/auth.ts", import.meta.url).href)});
    const items = await getPublicMemberBannerItems();
    assert.equal(items.length, ids.length);
    assert.deepEqual(new Set(items.map(item => item.id)), new Set(ids));
    assert.ok(items.every(item => item.name === 'Company ' + item.id && item.scale === 1));
    assert.deepEqual(batches.logos, [100, 100, 5]);
    assert.deepEqual(batches.profiles, [100, 100, 5]);
  `;
  execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], {
    env: { ...process.env, NODE_ENV: "production" }, stdio: "pipe",
  });
});

test("default admin credentials are valid", async () => {
  assert.equal(await verifyCredentials("admin", "Test123!"), true);
});

test("new password hashes use the Worker-safe versioned format", () => {
  assert.match(hashPassword("Test123!"), /^pbkdf2-sha256\$10000\$[a-f\d]{32}\$[a-f\d]{64}$/);
});

test("admin user page does not serialize logo contents", () => {
  const page = fs.readFileSync(path.join(process.cwd(), "app/admin/uzytkownicy/page.tsx"), "utf8");
  const list = fs.readFileSync(path.join(process.cwd(), "app/admin/uzytkownicy/AdminUsersList.tsx"), "utf8");
  assert.match(page, /getMemberLogoUserIds\(users\.map/);
  assert.doesNotMatch(page, /getMemberLogo\(|Promise\.all\(users\.map/);
  assert.match(list, /\/api\/admin\/users\/\$\{encodeURIComponent\(user\.id\)\}\/logo/);
  assert.doesNotMatch(list, /data:\$\{logo\.contentType\}/);
});

test("protected member files exist for export", () => {
  const requiredFiles = [
    "regulamin.pdf",
    "umowa-czlonkowska.pdf",
    "materialy-lipiec-2026.pdf",
  ];

  for (const fileName of requiredFiles) {
    const filePath = path.join(process.cwd(), "private", "member-docs", fileName);
    assert.equal(fs.existsSync(filePath), true, `Missing protected member file: ${fileName}`);
  }
});

test("session token is verifiable", () => {
  const token = createSessionToken({
    id: "member-1",
    username: "czlonek",
    role: "member",
    name: "Członek",
  });

  const payload = verifySessionToken(token);
  assert.ok(payload);
  assert.match(payload.sessionId ?? "", /^[0-9a-f-]{36}$/);
  assert.equal(payload.username, "czlonek");
  assert.equal(payload.role, "member");
});

test("each login has its own audit session identifier", () => {
  const user = { id: "member-1", username: "member", role: "member" as const, name: "Member" };
  const first = verifySessionToken(createSessionToken(user));
  const second = verifySessionToken(createSessionToken(user));
  assert.ok(first?.sessionId);
  assert.ok(second?.sessionId);
  assert.notEqual(first.sessionId, second.sessionId);
});
