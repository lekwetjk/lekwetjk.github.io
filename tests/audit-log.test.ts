import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";

import { AuditLogFilterError, listAuditLogs, recordAuditEvent, updateSessionActivity } from "../app/lib/audit-log.ts";

const auditModuleUrl = new URL("../app/lib/audit-log.ts", import.meta.url).href;

test("local audit events persist and support filters and session activity", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "krd-audit-test-"));
  const execute = (code: string, environment: "development" | "production" = "development") => execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-e", `
      import assert from "node:assert/strict";
      import { listAuditLogs, recordAuditEvent, updateSessionActivity } from ${JSON.stringify(auditModuleUrl)};
      ${code}
    `],
    { cwd: directory, env: { ...process.env, NODE_ENV: environment }, encoding: "utf8" },
  );

  try {
    execute(`
      await recordAuditEvent({
        actor: { sub: "audit-test-admin", username: "audit-admin", role: "admin", sessionId: "test-session" },
        eventType: "login",
        result: "success",
        trackActivity: true,
      });
      await recordAuditEvent({
        actor: { sub: "audit-test-member", username: "audit-member", role: "member" },
        eventType: "login",
        result: "failure",
        details: { reason: "invalid_credentials" },
      });

      const all = await listAuditLogs({});
      assert.equal(all.total, 2);
      const admin = await listAuditLogs({ role: "admin", username: "audit-admin", result: "success" });
      assert.equal(admin.total, 1);
      assert.equal(admin.entries[0].sessionId, "test-session");
      assert.ok(admin.entries[0].lastActivityAt);

      await updateSessionActivity("test-session", true);
      const updated = await listAuditLogs({ role: "admin" });
      assert.ok(updated.entries[0].endedAt);
      assert.ok(updated.entries[0].lastActivityAt >= admin.entries[0].lastActivityAt);
      const failed = await listAuditLogs({ role: "member", result: "failure", eventType: "login" });
      assert.equal(failed.total, 1);
      assert.equal(failed.entries[0].actorUsername, "audit-member");
    `);
    execute(`
      const data = await listAuditLogs({});
      assert.equal(data.total, 2);
      assert.ok(data.entries.some((entry) => entry.endedAt !== null));
    `);
    execute(`
      await assert.rejects(listAuditLogs({}), /Cloudflare D1 binding \`DB\` is unavailable/);
    `, "production");
  } finally {
    await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
});

async function withDatabase(run: (database: DatabaseSync) => Promise<void>) {
  const runtime = globalThis as typeof globalThis & { env?: { DB?: unknown } };
  const previousEnv = runtime.env;
  const database = new DatabaseSync(":memory:");
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
  };
  try {
    await run(database);
  } finally {
    runtime.env = previousEnv;
    database.close();
  }
}

test("activity excludes long gaps, preserves details and cannot resume after logout", async () => {
  await withDatabase(async (database) => {
    await recordAuditEvent({
      actor: { sub: "member-1", username: "member", role: "member", sessionId: "activity-session" },
      eventType: "login", result: "success", trackActivity: true, details: { test: true },
    });
    const setLastActivity = (secondsAgo: number) => database.prepare("UPDATE audit_logs SET last_activity_at = ?")
      .run(new Date(Date.now() - secondsAgo * 1000).toISOString());
    setLastActivity(120);
    await updateSessionActivity("activity-session");
    let entry = (await listAuditLogs({})).entries[0];
    assert.ok(entry.activeSeconds >= 119 && entry.activeSeconds <= 121);
    const activeSeconds = entry.activeSeconds;
    setLastActivity(3600);
    await updateSessionActivity("activity-session");
    entry = (await listAuditLogs({})).entries[0];
    assert.equal(entry.activeSeconds, activeSeconds);
    setLastActivity(10);
    await updateSessionActivity("activity-session", true);
    entry = (await listAuditLogs({})).entries[0];
    assert.ok(entry.endedAt);
    assert.ok(entry.activeSeconds >= activeSeconds + 9 && entry.activeSeconds <= activeSeconds + 11);
    assert.deepEqual(entry.details, { test: true });
    await updateSessionActivity("activity-session");
    assert.deepEqual((await listAuditLogs({})).entries[0], entry);
  });
});

test("existing audit tables migrate without losing historical entries", async () => {
  await withDatabase(async (database) => {
    database.exec(`CREATE TABLE audit_logs (
      id TEXT PRIMARY KEY, actor_id TEXT, actor_username TEXT NOT NULL, actor_role TEXT NOT NULL,
      event_type TEXT NOT NULL, result TEXT NOT NULL, target_type TEXT, target_id TEXT,
      details_json TEXT NOT NULL DEFAULT '{}', session_id TEXT, occurred_at TEXT NOT NULL, last_activity_at TEXT
    );
    INSERT INTO audit_logs (id, actor_username, actor_role, event_type, result, occurred_at)
    VALUES ('legacy', 'legacy-admin', 'admin', 'login', 'success', '2026-10-15T12:00:00.000Z')`);
    const data = await listAuditLogs({});
    assert.equal(data.total, 1);
    assert.equal(data.entries[0].id, "legacy");
    assert.equal(data.entries[0].activeSeconds, 0);
    assert.equal(data.entries[0].endedAt, null);
  });
});

test("date filters use Polish midnight and pagination handles out-of-range pages", async () => {
  await withDatabase(async (database) => {
    await listAuditLogs({});
    const insert = database.prepare("INSERT INTO audit_logs (id, actor_username, actor_role, event_type, result, occurred_at) VALUES (?, ?, 'admin', 'login', 'success', ?)");
    const dates = ["2026-10-15T21:59:59.999Z", "2026-10-15T22:00:00.000Z", "2026-10-16T21:59:59.999Z", "2026-10-16T22:00:00.000Z"];
    dates.forEach((date, index) => insert.run(String(index), "date-admin", date));
    const filtered = await listAuditLogs({ dateFrom: "2026-10-16", dateTo: "2026-10-16" });
    assert.equal(filtered.total, 2);
    assert.deepEqual(filtered.entries.map((entry) => entry.id).sort(), ["1", "2"]);
    const lastPage = await listAuditLogs({ page: 100, pageSize: 2 });
    assert.equal(lastPage.page, 2);
    assert.equal(lastPage.entries.length, 2);
    assert.equal((await listAuditLogs({ username: "no-such-user", page: 100 })).page, 1);
  });
});

test("username wildcard characters are literal and raw errors are not stored", async () => {
  await withDatabase(async () => {
    for (const username of ["a_b%name", "axbname"]) {
      await recordAuditEvent({
        actor: { username, role: "unknown" }, eventType: "login", result: "failure",
        details: { error: "SQL parameters: SECRET-PASSWORD" },
      });
    }
    const data = await listAuditLogs({ username: "_" });
    assert.equal(data.total, 1);
    assert.equal(data.entries[0].actorUsername, "a_b%name");
    assert.deepEqual(data.entries[0].details, { reason: "operation_failed" });
    assert.doesNotMatch(JSON.stringify(data), /SECRET-PASSWORD/);
    assert.equal((await listAuditLogs({ username: "%" })).total, 1);
  });
});

test("invalid pagination and date ranges produce explicit filter errors", async () => {
  for (const page of [0, -1, 1.5, NaN, Infinity]) {
    await assert.rejects(listAuditLogs({ page }), AuditLogFilterError);
  }
  await assert.rejects(listAuditLogs({ pageSize: 101 }), AuditLogFilterError);
  await assert.rejects(listAuditLogs({ dateFrom: "2026-02-31" }), AuditLogFilterError);
  await assert.rejects(listAuditLogs({ dateFrom: "2026-10-17", dateTo: "2026-10-16" }), AuditLogFilterError);
});
