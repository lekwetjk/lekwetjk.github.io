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
                  if (query.includes('from "member_company_users"')) return [];
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

test("production D1 companies preserve shared data and independent accounts", () => {
  const script = `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import { DatabaseSync } from 'node:sqlite';
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec("PRAGMA foreign_keys = ON; CREATE TABLE member_users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, password_hash TEXT NOT NULL, is_active TEXT NOT NULL DEFAULT 'true', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP); CREATE TABLE member_profiles (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP); CREATE TABLE member_user_logos (user_id TEXT PRIMARY KEY, content TEXT NOT NULL, content_type TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);");
    const migration = fs.readFileSync(new URL(${JSON.stringify(new URL("../drizzle/0001_member_companies.sql", import.meta.url).href)}), 'utf8');
    sqlite.exec(migration);
    sqlite.exec(migration);
    function prepare(query, values = []) {
      return {
        bind(...parameters) { assert.ok(parameters.length <= 100); return prepare(query, parameters); },
        async raw() { return sqlite.prepare(query).all(...values).map(row => Object.values(row)); },
        async all() { return { results: sqlite.prepare(query).all(...values), success: true }; },
        async run() { return { meta: sqlite.prepare(query).run(...values), success: true }; },
        async first() { return sqlite.prepare(query).get(...values) ?? null; },
      };
    }
    const objects = new Map();
    globalThis.env = {
      DB: {
        prepare,
        async batch(statements) {
          sqlite.exec('BEGIN');
          try {
            const results = [];
            for (const statement of statements) results.push(await statement.all());
            sqlite.exec('COMMIT');
            return results;
          } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
        },
      },
      MEMBER_DOCUMENTS: {
        async put(key, value) { objects.set(key, Buffer.from(value)); },
        async get(key) { return objects.has(key) ? { body: new Response(objects.get(key)).body, uploaded: new Date(), httpMetadata: { contentType: 'image/png' } } : null; },
        async list({ prefix }) { return { objects: [...objects.keys()].filter(key => key.startsWith(prefix)).map(key => ({ key })) }; },
        async delete(key) { objects.delete(key); },
      },
    };
    const auth = await import(${JSON.stringify(new URL("../app/lib/auth.ts", import.meta.url).href)});
    await auth.ensureMemberUsersSeeded();
    const first = await auth.createMemberAccount({ username: 'prod-first', name: 'First', role: 'member', password: 'FirstPassword!' });
    const second = await auth.createMemberAccount({ username: 'prod-second', name: 'Second', role: 'member', password: 'SecondPassword!' });
    await auth.saveMemberProfile(first.id, { companyName: 'Shared company', city: 'Warsaw' });
    await auth.saveMemberProfile(second.id, { companyName: 'Separate company', city: 'Gdansk' });
    await auth.saveMemberLogo(first.id, Buffer.from('logo'), 'image/png');
    await auth.saveMemberLogoScale(first.id, 0.6);
    await auth.assignMemberCompany(second.id, first.id);
    assert.equal((await auth.getMemberProfile(second.id)).city, 'Warsaw');
    await auth.saveMemberProfile(second.id, { companyName: 'Shared company', city: 'Krakow' });
    assert.equal((await auth.getMemberProfile(first.id)).city, 'Krakow');
    assert.equal((await auth.getMemberLogo(second.id)).content, Buffer.from('logo').toString('base64'));
    assert.deepEqual(await auth.getMemberLogoUserIds([first.id, second.id]), new Set([first.id, second.id]));
    assert.equal((await auth.getPublicMemberBannerItems()).length, 1);
    assert.equal((await auth.getMemberCompanies()).find(company => company.id === first.id).userCount, 2);
    assert.equal(await auth.verifyCredentials(second.username, 'SecondPassword!'), true);
    assert.equal(await auth.verifyCredentials(second.username, 'FirstPassword!'), false);
    const token = auth.createSessionToken(second);
    await auth.setMemberAccountActive(second.id, false);
    assert.equal(await auth.getCurrentMemberSession(token), null);
    assert.equal(await auth.verifyCredentials(first.username, 'FirstPassword!'), true);
    await auth.setMemberAccountActive(second.id, true);
    await auth.deleteMemberAccount(first.id);
    assert.equal((await auth.getMemberProfile(second.id)).city, 'Krakow');
    assert.ok(await auth.getMemberLogo(second.id));
    const added = await auth.createMemberAccount({ username: 'prod-added', name: 'Added', role: 'member', password: 'AddedPassword!', companyId: first.id });
    assert.equal((await auth.getMemberProfile(added.id)).city, 'Krakow');
    await auth.saveMemberLogoScale(added.id, 0.7);
    assert.equal((await auth.getMemberLogoScales([second.id]))[second.id], 0.7);
    assert.equal((await auth.getPublicMemberBannerItems()).length, 1);
    await auth.assignMemberCompany(second.id, second.id);
    assert.equal((await auth.getMemberProfile(second.id)).city, 'Gdansk');
    await auth.deleteMemberAccount(second.id);
    assert.equal((await auth.getMemberProfile(added.id)).city, 'Krakow');
    assert.ok(await auth.getMemberLogo(added.id));
    await assert.rejects(auth.assignMemberCompany('member-admin', first.id));
    await assert.rejects(auth.assignMemberCompany(added.id, 'missing'));
    assert.equal(sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
    sqlite.close();
  `;
  execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], {
    env: { ...process.env, NODE_ENV: "production" }, stdio: "pipe",
  });
});

test("new password hashes use the Worker-safe versioned format", () => {
  assert.match(hashPassword("Test123!"), /^pbkdf2-sha256\$10000\$[a-f\d]{32}\$[a-f\d]{64}$/);
});

test("admin user page does not serialize logo contents", () => {
  const page = fs.readFileSync(path.join(process.cwd(), "app/admin/uzytkownicy/page.tsx"), "utf8");
  const list = fs.readFileSync(path.join(process.cwd(), "app/admin/uzytkownicy/AdminUsersList.tsx"), "utf8");
  assert.match(page, /getMemberLogoUserIds\(users\.map/);
  assert.doesNotMatch(page, /getMemberLogo\(/);
  assert.doesNotMatch(page, /passwordHash/);
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
