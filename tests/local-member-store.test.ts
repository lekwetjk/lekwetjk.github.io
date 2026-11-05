import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { openLocalMemberStore } from "../app/lib/local-member-store.ts";

test("member records and logo scaling survive reopening the durable store", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "member-storage-test-"));
  const directory = path.join(root, "data");
  try {
    const store = await openLocalMemberStore(directory, root);
    const account = { id: "member-1", username: "example" };
    const logo = { content: "aGVsbG8=", contentType: "image/png", scale: 0.75 };
    const profile = { companyName: "Example", website: "https://example.com" };
    store.set("users", account.id, account);
    store.set("logos", account.id, logo);
    store.set("profiles", account.id, profile);
    store.close();
    const reopened = await openLocalMemberStore(directory, root);
    try {
      assert.deepEqual(reopened.get("users", account.id), account);
      assert.deepEqual(reopened.get("logos", account.id), logo);
      assert.deepEqual(reopened.get("profiles", account.id), profile);
    } finally { reopened.close(); }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("legacy temp data migrates once without resurrecting deleted logos", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "member-storage-migration-"));
  const legacy = path.join(root, "legacy");
  const directory = path.join(root, "data");
  try {
    await mkdir(legacy);
    await writeFile(path.join(legacy, "krd-ig-member-users.json"), JSON.stringify([{ id: "member-1", username: "legacy" }]));
    await writeFile(path.join(legacy, "krd-ig-member-logos.json"), JSON.stringify({ "member-1": { content: "bG9nbw==", contentType: "image/png", scale: 0.6 } }));
    await writeFile(path.join(legacy, "krd-ig-member-profiles.json"), JSON.stringify({ "member-1": { companyName: "Legacy" } }));
    const store = await openLocalMemberStore(directory, legacy);
    assert.deepEqual(store.get("profiles", "member-1"), { companyName: "Legacy" });
    assert.deepEqual(store.get("logos", "member-1"), { content: "bG9nbw==", contentType: "image/png", scale: 0.6 });
    assert.equal(Object.keys(store.list("users")).length, 1);
    store.set("profiles", "member-1", { companyName: "Updated" });
    store.delete("logos", "member-1");
    store.close();
    const reopened = await openLocalMemberStore(directory, legacy);
    try {
      assert.equal(reopened.get("logos", "member-1"), null);
      assert.deepEqual(reopened.get("profiles", "member-1"), { companyName: "Updated" });
    } finally { reopened.close(); }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("separate connections preserve independently imported member records", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "member-storage-concurrent-"));
  try {
    const first = await openLocalMemberStore(path.join(root, "data"), root);
    const second = await openLocalMemberStore(path.join(root, "data"), root);
    try {
      for (let index = 0; index < 30; index++) {
        first.set("profiles", `first-${index}`, { companyName: `First ${index}` });
        second.set("profiles", `second-${index}`, { companyName: `Second ${index}` });
      }
      assert.equal(Object.keys(first.list("profiles")).length, 60);
      assert.equal(Object.keys(second.list("profiles")).length, 60);
    } finally { first.close(); second.close(); }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("corrupt legacy data fails visibly and can be migrated after repair", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "member-storage-corrupt-"));
  try {
    const filename = path.join(root, "krd-ig-member-profiles.json");
    await writeFile(filename, "broken JSON");
    await assert.rejects(openLocalMemberStore(path.join(root, "data"), root), SyntaxError);
    await writeFile(filename, JSON.stringify({ "member-1": { companyName: "Recovered" } }));
    const store = await openLocalMemberStore(path.join(root, "data"), root);
    try { assert.deepEqual(store.get("profiles", "member-1"), { companyName: "Recovered" }); }
    finally { store.close(); }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("member APIs retain accounts, profiles, logos and scales across server processes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "member-storage-api-"));
  try {
    const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "development", LOCAL_MEMBER_DATA_DIR: path.join(root, "data"), TEMP: root, TMP: root, TMPDIR: root };
    const imports = `
      import assert from 'node:assert/strict';
      const auth = await import(${JSON.stringify(new URL("../app/lib/auth.ts", import.meta.url).href)});
    `;
    execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", `${imports}
      const users = await Promise.all(['first', 'second', 'third'].map(username => auth.createMemberAccount({username, name: username, role: 'member', password: 'LocalTest123!'})));
      await Promise.all(users.map(async user => {
        await auth.saveMemberProfile(user.id, {companyName: user.username});
        await auth.saveMemberLogo(user.id, Buffer.from(user.username), 'image/png');
        await auth.saveMemberLogoScale(user.id, 0.75);
        await auth.saveMemberLogo(user.id, Buffer.from(user.username + '-updated'), 'image/png');
      }));
    `], { env, cwd: root, stdio: "pipe" });
    execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", `${imports}
      for (const username of ['first', 'second', 'third']) {
        const user = await auth.findMemberUserByUsername(username);
        assert.ok(user);
        assert.equal(await auth.verifyCredentials(username, 'LocalTest123!'), true);
        assert.deepEqual(await auth.getMemberProfile(user.id), {companyName: username});
        const logo = await auth.getMemberLogo(user.id, {strict: true});
        assert.equal(Buffer.from(logo.content, 'base64').toString(), username + '-updated');
        assert.equal((await auth.getMemberLogoScales([user.id]))[user.id], 0.75);
        assert.equal((await auth.getMemberLogoUserIds([user.id])).has(user.id), true);
      }
      const items = await auth.getPublicMemberBannerItems();
      assert.equal(items.length, 3);
      const first = await auth.findMemberUserByUsername('first');
      await auth.deleteMemberAccount(first.id);
      assert.equal(await auth.getMemberProfile(first.id), null);
      assert.equal(await auth.getMemberLogo(first.id), null);
      assert.equal(await auth.findMemberUserByUsername('first'), null);
    `], { env, cwd: root, stdio: "pipe" });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("production refuses the local member fallback", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "member-storage-production-"));
  try {
    const script = `
      import assert from 'node:assert/strict';
      const { getLocalMemberStore } = await import(${JSON.stringify(new URL("../app/lib/local-member-store.ts", import.meta.url).href)});
      await assert.rejects(getLocalMemberStore(), /unavailable in production/);
    `;
    execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], {
      env: { ...process.env, NODE_ENV: "production", LOCAL_MEMBER_DATA_DIR: root }, cwd: root, stdio: "pipe",
    });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("company users share profile and logo but keep independent credentials and sessions", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "member-company-test-"));
  try {
    const script = `
      import assert from 'node:assert/strict';
      const auth = await import(${JSON.stringify(new URL("../app/lib/auth.ts", import.meta.url).href)});
      const first = await auth.createMemberAccount({username:'company-first',name:'Shared company',role:'member',password:'FirstTest123!'});
      const second = await auth.createMemberAccount({username:'company-second',name:'Second person',role:'member',password:'SecondTest123!'});
      const other = await auth.createMemberAccount({username:'other-company',name:'Other company',role:'member',password:'OtherTest123!'});
      await auth.saveMemberProfile(first.id, {companyName:'Shared company',city:'Warsaw'});
      await auth.saveMemberLogo(first.id, Buffer.from('shared-logo'), 'image/png');
      await auth.assignMemberCompany(second.id, first.id);
      assert.deepEqual(await auth.getMemberProfile(second.id), await auth.getMemberProfile(first.id));
      assert.equal(Buffer.from((await auth.getMemberLogo(second.id)).content,'base64').toString(), 'shared-logo');
      await auth.saveMemberProfile(second.id, {companyName:'Shared company',city:'Krakow'});
      assert.equal((await auth.getMemberProfile(first.id)).city, 'Krakow');
      assert.equal(await auth.getMemberProfile(other.id), null);
      assert.equal(await auth.verifyCredentials(second.username,'SecondTest123!'), true);
      assert.equal(await auth.verifyCredentials(second.username,'FirstTest123!'), false);
      assert.equal(auth.verifySessionToken(auth.createSessionToken(second)).sub, second.id);
      const secondToken = auth.createSessionToken(second);
      await auth.setMemberAccountActive(second.id, false);
      assert.equal(await auth.getCurrentMemberSession(secondToken), null);
      assert.equal(await auth.verifyCredentials(first.username,'FirstTest123!'), true);
      await auth.setMemberAccountActive(second.id, true);
      assert.equal((await auth.getCurrentMemberSession(secondToken)).sub, second.id);
      await auth.saveMemberLogoScale(second.id, 0.65);
      assert.equal((await auth.getMemberLogoScales([first.id]))[first.id], 0.65);
      const companies = await auth.getMemberCompanies();
      assert.equal(companies.find(company => company.id === first.id).userCount, 2);
      const banner = await auth.getPublicMemberBannerItems();
      assert.equal(banner.filter(item => item.name === 'Shared company').length, 1);
      const added = await auth.createMemberAccount({username:'company-added',name:'Added person',role:'member',password:'AddedTest123!',companyId:first.id});
      assert.equal((await auth.getMemberProfile(added.id)).city, 'Krakow');
      await auth.deleteMemberAccount(first.id);
      assert.equal((await auth.getMemberProfile(second.id)).city, 'Krakow');
      assert.ok(await auth.getMemberLogo(second.id));
      assert.equal(await auth.verifyCredentials(second.username,'SecondTest123!'), true);
      await assert.rejects(auth.assignMemberCompany(other.id,'missing-company'));
      await auth.assignMemberCompany(second.id, second.id);
      assert.equal(await auth.getMemberProfile(second.id), null);
      await assert.rejects(auth.assignMemberCompany('member-admin', second.id));
    `;
    execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], {
      env: { ...process.env, NODE_ENV: "development", LOCAL_MEMBER_DATA_DIR: path.join(root, "data"), TEMP: root, TMP: root, TMPDIR: root },
      cwd: root, stdio: "pipe",
    });
    execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", `
      import assert from 'node:assert/strict';
      const auth = await import(${JSON.stringify(new URL("../app/lib/auth.ts", import.meta.url).href)});
      const added = await auth.findMemberUserByUsername('company-added');
      assert.equal((await auth.getMemberProfile(added.id)).city, 'Krakow');
      assert.ok(await auth.getMemberLogo(added.id));
      const second = await auth.findMemberUserByUsername('company-second');
      assert.equal(await auth.getMemberProfile(second.id), null);
    `], {
      env: { ...process.env, NODE_ENV: "development", LOCAL_MEMBER_DATA_DIR: path.join(root, "data"), TEMP: root, TMP: root, TMPDIR: root },
      cwd: root, stdio: "pipe",
    });
  } finally { await rm(root, { recursive: true, force: true }); }
});