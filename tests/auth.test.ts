import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

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
  assert.equal(payload.username, "czlonek");
  assert.equal(payload.role, "member");
});
