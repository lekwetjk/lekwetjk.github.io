import { randomUUID } from "node:crypto";

import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { getDb } from "../../db/index.ts";
import { getLocalManagedPostsDb } from "../../db/local-managed-posts.ts";
import { auditLogs } from "../../db/schema.ts";
import type { MemberRole } from "./auth";
import { parseIsoDate, warsawDayBoundary } from "./calendar-dates.ts";

export type AuditResult = "success" | "failure";

export type AuditActor = {
  sub?: string;
  username: string;
  role: MemberRole | "unknown";
  sessionId?: string;
};

export type AuditLogEntry = {
  id: string;
  actorId: string | null;
  actorUsername: string;
  actorRole: MemberRole | "unknown";
  eventType: string;
  result: AuditResult;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  sessionId: string | null;
  occurredAt: string;
  lastActivityAt: string | null;
  activeSeconds: number;
  endedAt: string | null;
};

let initialization: {
  binding: unknown;
  development: boolean;
  promise: Promise<ReturnType<typeof getDb>>;
} | undefined;

async function initializeAuditLogTable() {
  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch (error) {
    if (
      process.env.NODE_ENV !== "development"
      || !(error instanceof Error)
      || !error.message.includes("Cloudflare D1 binding `DB` is unavailable")
    ) {
      throw error;
    }
    db = await getLocalManagedPostsDb();
  }
  await db.run(sql`CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    actor_id TEXT,
    actor_username TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    event_type TEXT NOT NULL,
    result TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details_json TEXT NOT NULL DEFAULT '{}',
    session_id TEXT,
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TEXT,
    active_seconds INTEGER NOT NULL DEFAULT 0,
    ended_at TEXT
  )`);
  for (const [column, statement] of [
    ["active_seconds", sql`ALTER TABLE audit_logs ADD COLUMN active_seconds INTEGER NOT NULL DEFAULT 0`],
    ["ended_at", sql`ALTER TABLE audit_logs ADD COLUMN ended_at TEXT`],
  ] as const) {
    const columns = await db.all<{ name: string }>(sql`PRAGMA table_info(audit_logs)`);
    if (columns.some((entry) => entry.name === column)) continue;
    try {
      await db.run(statement);
    } catch (error) {
      const currentColumns = await db.all<{ name: string }>(sql`PRAGMA table_info(audit_logs)`);
      if (!currentColumns.some((entry) => entry.name === column)) throw error;
    }
  }
  await db.run(sql`CREATE INDEX IF NOT EXISTS audit_logs_occurred_at_idx ON audit_logs (occurred_at DESC)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs (actor_username, occurred_at DESC)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS audit_logs_session_idx ON audit_logs (session_id)`);
  return db;
}

async function ensureAuditLogTable() {
  const binding = (globalThis as typeof globalThis & { env?: { DB?: unknown } }).env?.DB;
  const development = process.env.NODE_ENV === "development";
  if (initialization && initialization.binding === binding && initialization.development === development) {
    return initialization.promise;
  }
  const promise = initializeAuditLogTable();
  initialization = { binding, development, promise };
  try {
    return await promise;
  } catch (error) {
    if (initialization?.promise === promise) initialization = undefined;
    throw error;
  }
}

export async function recordAuditEvent(input: {
  actor: AuditActor;
  eventType: string;
  result: AuditResult;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  trackActivity?: boolean;
}) {
  const db = await ensureAuditLogTable();
  const occurredAt = new Date().toISOString();
  // Database errors can include SQL parameters; never persist their raw text.
  const { error, ...details } = input.details ?? {};
  await db.insert(auditLogs).values({
    id: randomUUID(),
    actorId: input.actor.sub ?? null,
    actorUsername: input.actor.username.slice(0, 200),
    actorRole: input.actor.role,
    eventType: input.eventType,
    result: input.result,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    detailsJson: JSON.stringify(error === undefined ? details : { ...details, reason: details.reason ?? "operation_failed" }),
    sessionId: input.actor.sessionId ?? null,
    occurredAt,
    lastActivityAt: input.trackActivity ? occurredAt : null,
  });
}

export async function recordAuditEventSafely(input: Parameters<typeof recordAuditEvent>[0]) {
  try {
    await recordAuditEvent(input);
  } catch (error) {
    console.error("Nie udało się zapisać zdarzenia w rejestrze logów.", error);
  }
}

export async function updateSessionActivity(sessionId: string, finished = false) {
  const db = await ensureAuditLogTable();
  const timestamp = new Date().toISOString();
  const elapsed = sql`(julianday(${timestamp}) - julianday(${auditLogs.lastActivityAt})) * 86400`;
  await db.update(auditLogs)
    .set({
      lastActivityAt: timestamp,
      activeSeconds: sql`${auditLogs.activeSeconds} + CASE WHEN ${elapsed} BETWEEN 0 AND 360 THEN CAST(ROUND(${elapsed}) AS INTEGER) ELSE 0 END`,
      ...(finished ? { endedAt: timestamp } : {}),
    })
    .where(and(
      eq(auditLogs.sessionId, sessionId),
      eq(auditLogs.eventType, "login"),
      eq(auditLogs.result, "success"),
      isNull(auditLogs.endedAt),
    ));
}

export async function updateSessionActivitySafely(sessionId?: string, finished = false) {
  if (!sessionId) return;
  try {
    await updateSessionActivity(sessionId, finished);
  } catch (error) {
    console.error("Nie udało się zaktualizować czasu aktywności w rejestrze logów.", error);
  }
}

export async function listAuditLogs(filters: {
  page?: number;
  pageSize?: number;
  role?: MemberRole;
  result?: AuditResult;
  eventType?: string;
  username?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const requestedPage = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) {
    throw new AuditLogFilterError("Numer strony musi być dodatnią liczbą całkowitą.");
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new AuditLogFilterError("Liczba wpisów na stronie musi mieścić się w zakresie 1–100.");
  }
  for (const value of [filters.dateFrom, filters.dateTo]) {
    if (value && !parseIsoDate(value)) throw new AuditLogFilterError("Podaj poprawną datę w formacie dd.mm.rrrr.");
  }
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    throw new AuditLogFilterError("Data „Od” nie może być późniejsza niż data „Do”.");
  }
  const db = await ensureAuditLogTable();
  const username = filters.username?.trim().replace(/[\\%_]/g, "\\$&");
  const conditions = [
    filters.role ? eq(auditLogs.actorRole, filters.role) : undefined,
    filters.result ? eq(auditLogs.result, filters.result) : undefined,
    filters.eventType ? eq(auditLogs.eventType, filters.eventType) : undefined,
    username ? sql`${auditLogs.actorUsername} LIKE ${`%${username}%`} ESCAPE '\\'` : undefined,
    filters.dateFrom ? gte(auditLogs.occurredAt, warsawDayBoundary(filters.dateFrom)) : undefined,
    filters.dateTo ? lt(auditLogs.occurredAt, warsawDayBoundary(filters.dateTo, true)) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const where = conditions.length ? and(...conditions) : undefined;
  const countRows = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(where);
  const total = Number(countRows[0]?.count ?? 0);
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
  const rows = await db.select().from(auditLogs).where(where)
    .orderBy(desc(auditLogs.occurredAt), desc(auditLogs.id)).limit(pageSize).offset((page - 1) * pageSize);

  return {
    entries: rows.map((row): AuditLogEntry => ({
      ...row,
      details: JSON.parse(row.detailsJson) as Record<string, unknown>,
    })),
    total,
    page,
    pageSize,
  };
}

export class AuditLogFilterError extends Error {}
