import crypto from "node:crypto";

import { and, asc, eq, ne, sql } from "drizzle-orm";

import { getDb } from "../../db/index.ts";
import { getLocalManagedPostsDb } from "../../db/local-managed-posts.ts";
import { memberProfileDictionaryOptions } from "../../db/schema.ts";
import {
  defaultMemberProfileDictionaries,
  memberProfileDictionaryCategories,
  type MemberProfileDictionaryCategory,
  type MemberProfileDictionaryOption,
} from "./member-profile-options.ts";

export type MemberProfileDictionaries = Record<MemberProfileDictionaryCategory, MemberProfileDictionaryOption[]>;

let initialization:
  | { binding: unknown; promise: ReturnType<typeof initializeDictionaries> }
  | undefined;

function getDatabaseBinding() {
  return (globalThis as typeof globalThis & { env?: { DB?: unknown } }).env?.DB;
}

function isCategory(value: string): value is MemberProfileDictionaryCategory {
  return memberProfileDictionaryCategories.includes(value as MemberProfileDictionaryCategory);
}

async function getDictionaryDb() {
  try {
    return getDb();
  } catch (error) {
    if (process.env.NODE_ENV !== "development") throw error;
    return getLocalManagedPostsDb();
  }
}

async function initializeDictionaries() {
  const db = await getDictionaryDb();
  await db.run(sql`CREATE TABLE IF NOT EXISTS member_profile_dictionary_options (
    id TEXT PRIMARY KEY NOT NULL,
    category TEXT NOT NULL,
    value_pl TEXT NOT NULL,
    value_en TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active TEXT NOT NULL DEFAULT 'true',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  const defaults = memberProfileDictionaryCategories.flatMap((category) =>
    defaultMemberProfileDictionaries[category].map((item, sortOrder) => ({
      id: `default-${category}-${sortOrder}`,
      category,
      ...item,
      sortOrder,
      isActive: "true" as const,
    })),
  );
  await db.insert(memberProfileDictionaryOptions).values(defaults).onConflictDoNothing({
    target: memberProfileDictionaryOptions.id,
  });

  const legacyTable = await db.all<{ name: string }>(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'member_export_permit_options'`,
  );
  if (legacyTable.length > 0) {
    const legacyPermits = await db.all<{ name: string }>(sql`SELECT name FROM member_export_permit_options`);
    const defaultNames = new Set(defaultMemberProfileDictionaries.exportPermits.map((item) => item.valuePl));
    const customPermits = legacyPermits
      .filter((item) => !defaultNames.has(item.name))
      .map((item, index) => ({
        id: `legacy-export-${encodeURIComponent(item.name)}`,
        category: "exportPermits",
        valuePl: item.name,
        valueEn: item.name,
        sortOrder: defaultMemberProfileDictionaries.exportPermits.length + index,
        isActive: "true" as const,
      }));
    if (customPermits.length > 0) {
      await db.insert(memberProfileDictionaryOptions).values(customPermits).onConflictDoNothing({
        target: memberProfileDictionaryOptions.id,
      });
    }
  }

  return db;
}

async function ensureDictionaries() {
  const binding = getDatabaseBinding();
  const current = initialization;
  if (current && current.binding === binding) return current.promise;

  const promise = initializeDictionaries();
  initialization = { binding, promise };
  try {
    return await promise;
  } catch (error) {
    if (initialization?.promise === promise) initialization = undefined;
    throw error;
  }
}

function toOption(row: typeof memberProfileDictionaryOptions.$inferSelect): MemberProfileDictionaryOption {
  if (!isCategory(row.category)) throw new Error(`Nieznana kategoria słownika: ${row.category}`);
  return {
    id: row.id,
    category: row.category,
    valuePl: row.valuePl,
    valueEn: row.valueEn,
    sortOrder: row.sortOrder,
    isActive: row.isActive === "true",
  };
}

export async function getMemberProfileDictionaries(includeInactive = false): Promise<MemberProfileDictionaries> {
  const db = await ensureDictionaries();
  const rows = await db.select().from(memberProfileDictionaryOptions)
    .where(includeInactive ? undefined : eq(memberProfileDictionaryOptions.isActive, "true"))
    .orderBy(asc(memberProfileDictionaryOptions.category), asc(memberProfileDictionaryOptions.sortOrder), asc(memberProfileDictionaryOptions.valuePl));
  const result: MemberProfileDictionaries = {
    voivodeships: [],
    businessScopes: [],
    poultrySpecies: [],
    assortments: [],
    certifications: [],
    exportPermits: [],
  };
  for (const row of rows) {
    const item = toOption(row);
    result[item.category].push(item);
  }
  return result;
}

function normalizeInput(input: { category?: string; valuePl?: string; valueEn?: string; sortOrder?: number }) {
  const category = input.category?.trim() ?? "";
  const valuePl = input.valuePl?.trim() ?? "";
  const valueEn = input.valueEn?.trim() ?? "";
  const sortOrder = Number.isInteger(input.sortOrder) ? Math.max(0, input.sortOrder!) : 0;
  if (!isCategory(category)) throw new Error("Wybierz poprawny słownik.");
  if (!valuePl || !valueEn) throw new Error("Podaj polską i angielską wartość.");
  if (valuePl.length > 120 || valueEn.length > 120) throw new Error("Wartość słownika może mieć maksymalnie 120 znaków.");
  return { category, valuePl, valueEn, sortOrder };
}

async function assertUniqueValue(category: MemberProfileDictionaryCategory, valuePl: string, excludedId?: string) {
  const db = await ensureDictionaries();
  const rows = await db.select({ id: memberProfileDictionaryOptions.id })
    .from(memberProfileDictionaryOptions)
    .where(and(
      eq(memberProfileDictionaryOptions.category, category),
      eq(memberProfileDictionaryOptions.valuePl, valuePl),
      excludedId ? ne(memberProfileDictionaryOptions.id, excludedId) : undefined,
    ))
    .limit(1);
  if (rows.length > 0) throw new Error("Taka polska wartość już istnieje w tym słowniku.");
  return db;
}

export async function createMemberProfileDictionaryOption(input: {
  category?: string;
  valuePl?: string;
  valueEn?: string;
  sortOrder?: number;
}) {
  const normalized = normalizeInput(input);
  const db = await assertUniqueValue(normalized.category, normalized.valuePl);
  const id = crypto.randomUUID();
  await db.insert(memberProfileDictionaryOptions).values({
    id,
    ...normalized,
    isActive: "true",
  });
  return toOption((await db.select().from(memberProfileDictionaryOptions)
    .where(eq(memberProfileDictionaryOptions.id, id)).limit(1))[0]);
}

export async function updateMemberProfileDictionaryOption(id: string, input: {
  category?: string;
  valuePl?: string;
  valueEn?: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const normalized = normalizeInput(input);
  const db = await assertUniqueValue(normalized.category, normalized.valuePl, id);
  const existing = await db.select({ id: memberProfileDictionaryOptions.id })
    .from(memberProfileDictionaryOptions).where(eq(memberProfileDictionaryOptions.id, id)).limit(1);
  if (!existing[0]) throw new Error("Nie znaleziono wartości słownika.");
  await db.update(memberProfileDictionaryOptions).set({
    ...normalized,
    isActive: input.isActive === false ? "false" : "true",
    updatedAt: new Date().toISOString(),
  }).where(eq(memberProfileDictionaryOptions.id, id));
  return toOption((await db.select().from(memberProfileDictionaryOptions)
    .where(eq(memberProfileDictionaryOptions.id, id)).limit(1))[0]);
}
