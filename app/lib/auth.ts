import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { eq, inArray, sql } from "drizzle-orm";

import { getDb, getMemberDocumentsBucket } from "../../db/index.ts";
import { memberProfiles, memberUserLogos, memberUsers } from "../../db/schema.ts";
import type { MemberProfileData } from "./member-profile";

export const AUTH_COOKIE_NAME = "krd_member_session";
const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me";
const MEMBER_PASSWORD_SALT = "krd-ig-member-salt";
const PASSWORD_HASH_PREFIX = "pbkdf2-sha256";
const PASSWORD_HASH_ITERATIONS = 10_000;
const LEGACY_DEFAULT_PASSWORD_HASH = "fd1a5d2ecc9e98159009f5da7c147abb1571d75f2486c5d576cc379ee47427a927a37d93cebc63dd25d57777dc6cf974b49900be047f09818806de273c53b3e9";
const LEGACY_DEFAULT_PASSWORD = "Test123!";
const LOCAL_MEMBER_USERS_FILE = path.join(os.tmpdir(), "krd-ig-member-users.json");
const LOCAL_MEMBER_LOGOS_FILE = path.join(os.tmpdir(), "krd-ig-member-logos.json");
const LOCAL_MEMBER_PROFILES_FILE = path.join(os.tmpdir(), "krd-ig-member-profiles.json");
const MEMBER_LOGOS_PREFIX = "member-logos/";
const MEMBER_LOGO_SETTINGS_KEY = "member-logo-settings.json";

export type MemberRole = "member" | "admin";

export type MemberUser = {
  id: string;
  username: string;
  name: string;
  role: MemberRole;
  passwordHash: string;
  isActive: boolean;
};

async function ensurePasswordResetColumn() {
  const db = getDb();
  try {
    await db.run(sql`ALTER TABLE member_users ADD COLUMN password_reset_required TEXT NOT NULL DEFAULT 'false'`);
  } catch {
    // The column already exists, or this database has not been initialized yet.
  }

  return db;
}

export function normalizeImportedText(value: string) {
  return value
    .replace(/\u00A0/g, " ")
    .replace(/\u200B/g, "")
    .replace(/\u200C/g, "")
    .replace(/\u200D/g, "")
    .replace(/\uFEFF/g, "")
    .replace(/[\u2011\u2012\u2013\u2014\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const DEFAULT_MEMBER_USERS: MemberUser[] = [
  {
    id: "member-czlonek",
    username: "czlonek",
    name: "Członek KRD-IG",
    role: "member",
    passwordHash:
      "fd1a5d2ecc9e98159009f5da7c147abb1571d75f2486c5d576cc379ee47427a927a37d93cebc63dd25d57777dc6cf974b49900be047f09818806de273c53b3e9",
    isActive: true,
  },
  {
    id: "member-admin",
    username: "admin",
    name: "Administrator",
    role: "admin",
    passwordHash:
      "fd1a5d2ecc9e98159009f5da7c147abb1571d75f2486c5d576cc379ee47427a927a37d93cebc63dd25d57777dc6cf974b49900be047f09818806de273c53b3e9",
    isActive: true,
  },
];

async function readLocalMemberUsers() {
  try {
    const value = JSON.parse(await readFile(LOCAL_MEMBER_USERS_FILE, "utf8")) as MemberUser[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function writeLocalMemberUsers(users: MemberUser[]) {
  await writeFile(LOCAL_MEMBER_USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

async function readLocalMemberLogos(): Promise<Record<string, { content: string; contentType: string; scale?: number }>> {
  try {
    return JSON.parse(await readFile(LOCAL_MEMBER_LOGOS_FILE, "utf8")) as Record<string, { content: string; contentType: string; scale?: number }>;
  } catch {
    return {};
  }
}

function memberLogoKey(userId: string) {
  return `${MEMBER_LOGOS_PREFIX}${encodeURIComponent(userId)}`;
}

function isMissingR2Binding(error: unknown) {
  return error instanceof Error && error.message.includes("binding `MEMBER_DOCUMENTS` is unavailable");
}

export async function getMemberLogoScales(userIds: string[]) {
  let scales: Record<string, number> = {};
  try {
    const object = await getMemberDocumentsBucket().get(MEMBER_LOGO_SETTINGS_KEY);
    if (object) {
      const parsed = JSON.parse(await new Response(object.body).text()) as Record<string, unknown>;
      scales = Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, number] =>
          typeof entry[1] === "number" && entry[1] >= 0.5 && entry[1] <= 1),
      );
    }
  } catch (error) {
    if (!isMissingR2Binding(error)) throw error;
    const logos = await readLocalMemberLogos();
    scales = Object.fromEntries(
      Object.entries(logos).flatMap(([userId, logo]) => typeof logo.scale === "number" ? [[userId, logo.scale]] : []),
    );
  }
  return Object.fromEntries(userIds.map((userId) => [userId, scales[userId] ?? 1]));
}

export async function saveMemberLogoScale(userId: string, scale: number) {
  if (!Number.isFinite(scale) || scale < 0.5 || scale > 1) {
    throw new Error("Skala logo musi mieścić się w zakresie od 50% do 100%.");
  }
  try {
    const scales = await getMemberLogoScales((await getMemberUsers()).map((user) => user.id));
    scales[userId] = scale;
    await getMemberDocumentsBucket().put(
      MEMBER_LOGO_SETTINGS_KEY,
      Buffer.from(JSON.stringify(scales)),
      { httpMetadata: { contentType: "application/json" } },
    );
  } catch (error) {
    if (!isMissingR2Binding(error)) throw error;
    const logos = await readLocalMemberLogos();
    if (logos[userId]) {
      logos[userId].scale = scale;
      await writeFile(LOCAL_MEMBER_LOGOS_FILE, JSON.stringify(logos), "utf8");
    }
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_HASH_ITERATIONS, 32, "sha256").toString("hex");
  return `${PASSWORD_HASH_PREFIX}$${PASSWORD_HASH_ITERATIONS}$${salt}$${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterationsValue, salt, expectedValue] = storedHash.split("$");

  if (algorithm === PASSWORD_HASH_PREFIX && salt && expectedValue) {
    const iterations = Number.parseInt(iterationsValue, 10);
    if (!Number.isSafeInteger(iterations) || iterations <= 0 || iterations > PASSWORD_HASH_ITERATIONS) {
      return false;
    }

    const actual = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
    const expected = Buffer.from(expectedValue, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  return storedHash === LEGACY_DEFAULT_PASSWORD_HASH && password === LEGACY_DEFAULT_PASSWORD;
}

export function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

export async function ensureMemberUsersSeeded() {
  try {
    const db = getDb();
    const rows = await db.select().from(memberUsers).limit(1);

    if (rows.length > 0) {
      return;
    }

    await db.insert(memberUsers).values(
      DEFAULT_MEMBER_USERS.map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        passwordHash: user.passwordHash,
      })),
    );
  } catch {
    // If the database is not configured yet, the app falls back to the in-memory defaults.
  }
}

export async function getMemberUsers(): Promise<MemberUser[]> {
  try {
    const db = getDb();
    const rows = await db.select().from(memberUsers);

    if (rows.length > 0) {
      return rows.map((row) => ({
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role as MemberRole,
        passwordHash: row.passwordHash,
        isActive: row.isActive !== "false",
      }));
    }

    await ensureMemberUsersSeeded();
    return getMemberUsers();
  } catch {
    const localUsers = await readLocalMemberUsers();
    if (localUsers.length > 0) {
      return [...DEFAULT_MEMBER_USERS.filter((defaultUser) => !localUsers.some((user) => user.username === defaultUser.username)), ...localUsers];
    }

    const configuredUsers = process.env.MEMBER_USERS;

    if (configuredUsers) {
      try {
        const parsedUsers = JSON.parse(configuredUsers) as MemberUser[];
        if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
          return parsedUsers;
        }
      } catch {
        // Ignore invalid env configuration and fall back to defaults.
      }
    }

    return DEFAULT_MEMBER_USERS;
  }
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const cleanedUsername = username.trim().toLowerCase();
  const user = (await getMemberUsers()).find(
    (candidate) => candidate.username.toLowerCase() === cleanedUsername,
  );

  if (!user || !user.isActive) {
    return false;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return false;
  }

  if (user.passwordHash === LEGACY_DEFAULT_PASSWORD_HASH) {
    await setMemberPassword(user.id, password);
  }

  return true;
}

export async function getCurrentMemberSession(token?: string) {
  return verifySessionToken(token);
}

export async function saveMemberLogo(userId: string, content: Buffer, contentType: string) {
  try {
    await getMemberDocumentsBucket().put(memberLogoKey(userId), content, { httpMetadata: { contentType } });
    return;
  } catch (error) {
    if (!isMissingR2Binding(error)) throw error;
  }

  try {
    const db = getDb();
    await db.run(sql`CREATE TABLE IF NOT EXISTS member_user_logos (user_id TEXT PRIMARY KEY NOT NULL, content TEXT NOT NULL, content_type TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.insert(memberUserLogos).values({ userId, content: content.toString("base64"), contentType })
      .onConflictDoUpdate({ target: memberUserLogos.userId, set: { content: content.toString("base64"), contentType, updatedAt: new Date().toISOString() } });
  } catch {
    const logos = await readLocalMemberLogos();
    logos[userId] = { content: content.toString("base64"), contentType };
    await writeFile(LOCAL_MEMBER_LOGOS_FILE, JSON.stringify(logos), "utf8");
  }
}

export async function getMemberLogo(userId: string) {
  try {
    const object = await getMemberDocumentsBucket().get(memberLogoKey(userId));
    if (object) {
      const content = Buffer.from(await new Response(object.body).arrayBuffer()).toString("base64");
      return { userId, content, contentType: object.httpMetadata?.contentType ?? "application/octet-stream", updatedAt: object.uploaded.toISOString() };
    }
  } catch (error) {
    if (!isMissingR2Binding(error)) throw error;
  }

  try {
    const db = getDb();
    await db.run(sql`CREATE TABLE IF NOT EXISTS member_user_logos (user_id TEXT PRIMARY KEY NOT NULL, content TEXT NOT NULL, content_type TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    const rows = await db.select().from(memberUserLogos).where(eq(memberUserLogos.userId, userId)).limit(1);
    if (rows[0]) return rows[0];
  } catch {
    const logo = (await readLocalMemberLogos())[userId];
    if (logo) return logo;
  }
  return null;
}

export async function getMemberLogoUserIds(userIds: string[]) {
  if (userIds.length === 0) {
    return new Set<string>();
  }

  const logoUserIds = new Set<string>();
  try {
    const result = await getMemberDocumentsBucket().list({ prefix: MEMBER_LOGOS_PREFIX });
    for (const object of result.objects) {
      const encodedUserId = object.key.slice(MEMBER_LOGOS_PREFIX.length);
      try { logoUserIds.add(decodeURIComponent(encodedUserId)); } catch { /* Ignore malformed legacy keys. */ }
    }
  } catch (error) {
    if (!isMissingR2Binding(error)) throw error;
  }

  try {
    const db = getDb();
    const rows = await db
      .select({ userId: memberUserLogos.userId })
      .from(memberUserLogos)
      .where(inArray(memberUserLogos.userId, userIds));
    rows.forEach((row) => logoUserIds.add(row.userId));
  } catch {
    const logos = await readLocalMemberLogos();
    userIds.filter((userId) => Boolean(logos[userId])).forEach((userId) => logoUserIds.add(userId));
  }
  return new Set(userIds.filter((userId) => logoUserIds.has(userId)));
}

export async function getPublicMemberBannerItems() {
  const users = (await getMemberUsers()).filter((user) => user.role === "member" && user.isActive);
  const logoUserIds = await getMemberLogoUserIds(users.map((user) => user.id));
  const visibleUsers = users.filter((user) => logoUserIds.has(user.id));
  const userIds = visibleUsers.map((user) => user.id);
  const [profiles, scales] = await Promise.all([
    getMemberProfilesByUserId(userIds),
    getMemberLogoScales(userIds),
  ]);
  const items = visibleUsers.map((user) => ({
    id: user.id,
    name: profiles[user.id]?.companyName?.trim() || user.name,
    scale: scales[user.id],
  }));
  return items.sort((left, right) => left.name.localeCompare(right.name, "pl", { sensitivity: "base" }));
}

async function getMemberProfilesByUserId(userIds: string[]) {
  if (userIds.length === 0) return {} as Record<string, MemberProfileData>;
  try {
    const db = getDb();
    const rows = await db.select({ userId: memberProfiles.userId, data: memberProfiles.data })
      .from(memberProfiles)
      .where(inArray(memberProfiles.userId, userIds));
    return Object.fromEntries(rows.map((row) => [row.userId, JSON.parse(row.data) as MemberProfileData]));
  } catch {
    try {
      const profiles = JSON.parse(await readFile(LOCAL_MEMBER_PROFILES_FILE, "utf8")) as Record<string, MemberProfileData>;
      return Object.fromEntries(userIds.flatMap((userId) => profiles[userId] ? [[userId, profiles[userId]]] : []));
    } catch {
      return {} as Record<string, MemberProfileData>;
    }
  }
}

export async function deleteMemberLogo(userId: string) {
  try {
    const bucket = getMemberDocumentsBucket();
    const scales = await getMemberLogoScales((await getMemberUsers()).map((user) => user.id));
    delete scales[userId];
    await Promise.all([
      bucket.delete(memberLogoKey(userId)),
      bucket.put(MEMBER_LOGO_SETTINGS_KEY, Buffer.from(JSON.stringify(scales)), { httpMetadata: { contentType: "application/json" } }),
    ]);
  } catch (error) {
    if (!isMissingR2Binding(error)) throw error;
  }

  try {
    const db = getDb();
    await db.delete(memberUserLogos).where(eq(memberUserLogos.userId, userId));
  } catch {
    const logos = await readLocalMemberLogos();
    delete logos[userId];
    await writeFile(LOCAL_MEMBER_LOGOS_FILE, JSON.stringify(logos), "utf8");
  }
}

export async function getMemberProfile(userId: string): Promise<MemberProfileData | null> {
  try {
    const db = getDb();
    await db.run(sql`CREATE TABLE IF NOT EXISTS member_profiles (user_id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    const rows = await db.select().from(memberProfiles).where(eq(memberProfiles.userId, userId)).limit(1);
    return rows[0] ? JSON.parse(rows[0].data) as MemberProfileData : null;
  } catch {
    try {
      const profiles = JSON.parse(await readFile(LOCAL_MEMBER_PROFILES_FILE, "utf8")) as Record<string, MemberProfileData>;
      return profiles[userId] ?? null;
    } catch {
      return null;
    }
  }
}

export async function saveMemberProfile(userId: string, data: MemberProfileData) {
  const serialized = JSON.stringify(data);
  try {
    const db = getDb();
    await db.run(sql`CREATE TABLE IF NOT EXISTS member_profiles (user_id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.insert(memberProfiles).values({ userId, data: serialized }).onConflictDoUpdate({ target: memberProfiles.userId, set: { data: serialized, updatedAt: new Date().toISOString() } });
  } catch {
    let profiles: Record<string, MemberProfileData> = {};
    try { profiles = JSON.parse(await readFile(LOCAL_MEMBER_PROFILES_FILE, "utf8")) as Record<string, MemberProfileData>; } catch { /* create local store */ }
    profiles[userId] = data;
    await writeFile(LOCAL_MEMBER_PROFILES_FILE, JSON.stringify(profiles), "utf8");
  }
}

export async function createMemberAccount(input: {
  username: string;
  name: string;
  role: MemberRole;
  password: string;
}) {
  const username = normalizeImportedText(input.username).trim();
  const name = normalizeImportedText(input.name).trim();

  if (!username || !name || !input.password) {
    throw new Error("Username, name and password are required.");
  }

  const existingUsers = await getMemberUsers();

  if (existingUsers.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("User with this username already exists.");
  }

  const user: MemberUser = {
    id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    username,
    name,
    role: input.role,
    passwordHash: hashPassword(input.password),
    isActive: true,
  };

  try {
    const db = getDb();
    await db.insert(memberUsers).values({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      passwordHash: user.passwordHash,
      isActive: user.isActive ? "true" : "false",
    });
    return user;
  } catch {
    const localUsers = await readLocalMemberUsers();
    await writeLocalMemberUsers([...localUsers, user]);
    return user;
  }
}

export async function updateMemberAccount(userId: string, input: { username: string; name: string; role: MemberRole; password?: string }) {
  const username = normalizeImportedText(input.username).trim();
  const name = normalizeImportedText(input.name).trim();
  if (!username || !name) throw new Error("Login and name are required.");
  const existingUser = (await getMemberUsers()).find((user) => user.username.toLowerCase() === username.toLowerCase() && user.id !== userId);
  if (existingUser) throw new Error("User with this login already exists.");

  try {
    const db = getDb();
    await db.update(memberUsers).set({
      username,
      name,
      role: input.role,
      ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
      updatedAt: new Date().toISOString(),
    }).where(eq(memberUsers.id, userId));
  } catch {
    const users = await getMemberUsers();
    const index = users.findIndex((user) => user.id === userId);
    if (index < 0) throw new Error("User not found.");
    const updatedUser = { ...users[index], username, name, role: input.role, ...(input.password ? { passwordHash: hashPassword(input.password) } : {}) };
    const localUsers = await readLocalMemberUsers();
    await writeLocalMemberUsers([...localUsers.filter((user) => user.id !== userId), updatedUser]);
  }

  return (await getMemberUsers()).find((user) => user.id === userId) ?? null;
}

export async function setMemberPassword(userId: string, password: string, passwordResetRequired = false) {
  if (password.length < 8) {
    throw new Error("Hasło musi mieć co najmniej 8 znaków.");
  }

  try {
    const db = await ensurePasswordResetColumn();
    await db.run(sql`UPDATE member_users SET password_hash = ${hashPassword(password)}, password_reset_required = ${passwordResetRequired ? "true" : "false"}, updated_at = CURRENT_TIMESTAMP WHERE id = ${userId}`);
  } catch {
    const users = await getMemberUsers();
    const user = users.find((candidate) => candidate.id === userId);
    if (!user) throw new Error("User not found.");
    const localUsers = await readLocalMemberUsers();
    await writeLocalMemberUsers([
      ...localUsers.filter((candidate) => candidate.id !== userId),
      { ...user, passwordHash: hashPassword(password) },
    ]);
  }
}

export async function isMemberPasswordResetRequired(userId: string) {
  try {
    const db = await ensurePasswordResetColumn();
    const row = await db.get<{ passwordResetRequired?: string }>(sql`SELECT password_reset_required AS passwordResetRequired FROM member_users WHERE id = ${userId} LIMIT 1`);
    return row?.passwordResetRequired === "true";
  } catch {
    return false;
  }
}

export async function findMemberUserByUsername(username: string) {
  const normalizedUsername = normalizeImportedText(username).trim().toLowerCase();
  return (await getMemberUsers()).find((user) => user.username.toLowerCase() === normalizedUsername) ?? null;
}

export async function setMemberAccountActive(userId: string, isActive: boolean) {
  if (userId === "member-admin") {
    throw new Error("Primary admin account cannot be blocked.");
  }

  try {
    const db = getDb();
    await db.update(memberUsers).set({ isActive: isActive ? "true" : "false", updatedAt: new Date().toISOString() }).where(eq(memberUsers.id, userId));
    return isActive;
  } catch {
    const users = await getMemberUsers();
    const index = users.findIndex((user) => user.id === userId);
    if (index < 0) throw new Error("User not found.");
    const localUsers = await readLocalMemberUsers();
    const updatedUser = { ...users[index], isActive };
    await writeLocalMemberUsers([...localUsers.filter((user) => user.id !== userId), updatedUser]);
    return isActive;
  }
}

export async function deleteMemberAccount(userId: string) {
  if (userId === "member-admin") {
    throw new Error("The primary admin account cannot be deleted.");
  }

  try {
    const db = getDb();
    await db.delete(memberUsers).where(eq(memberUsers.id, userId));
  } catch {
    // Fallback is intentionally silent when DB is unavailable.
  }

  const localUsers = await readLocalMemberUsers();
  if (localUsers.length > 0) {
    await writeLocalMemberUsers(localUsers.filter((user) => user.id !== userId));
  }

  await deleteMemberLogo(userId);

  const users = await getMemberUsers();
  return users.filter((user) => user.id !== userId);
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(rawPayload: string) {
  return crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(rawPayload)
    .digest("base64url");
}

export function createSessionToken(
  user: Pick<MemberUser, "id" | "username" | "name" | "role">,
) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + 60 * 60 * 24 * 7,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token?: string): null | {
  sub: string;
  username: string;
  name: string;
  role: MemberRole;
  exp: number;
} {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  if (signPayload(encodedPayload) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
      sub: string;
      username: string;
      name: string;
      role: MemberRole;
      exp: number;
    };

    if (typeof payload?.exp !== "number") {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      sub: payload.sub,
      username: payload.username,
      name: payload.name,
      role: payload.role,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
