import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  createSessionToken,
  getMemberUsers,
  verifyCredentials,
  verifySessionToken,
} from "../app/lib/auth.ts";

test("member users are available", async () => {
  const users = await getMemberUsers();
  assert.ok(users.length > 0);
  assert.ok(users.every((user) => user.username && user.passwordHash));
});

test("valid credentials are accepted", async () => {
  const user = (await getMemberUsers())[0];
  assert.ok(user);
  assert.equal(await verifyCredentials(user.username, "Test123!"), true);
});

test("default admin credentials are valid", async () => {
  assert.equal(await verifyCredentials("admin", "Test123!"), true);
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
