import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { eq, sql } from "drizzle-orm";

import { getDb } from "../../db/index.ts";
import { memberProfiles, memberUserLogos, memberUsers } from "../../db/schema.ts";
import type { MemberProfileData } from "./member-profile";

export const AUTH_COOKIE_NAME = "krd_member_session";
const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me";
const MEMBER_PASSWORD_SALT = "krd-ig-member-salt";
const LOCAL_MEMBER_USERS_FILE = path.join(os.tmpdir(), "krd-ig-member-users.json");
const LOCAL_MEMBER_LOGOS_FILE = path.join(os.tmpdir(), "krd-ig-member-logos.json");
const LOCAL_MEMBER_PROFILES_FILE = path.join(os.tmpdir(), "krd-ig-member-profiles.json");

export type MemberRole = "member" | "admin";

export type MemberUser = {
  id: string;
  username: string;
  name: string;
  role: MemberRole;
  passwordHash: string;
};

const DEFAULT_MEMBER_USERS: MemberUser[] = [
  {
    id: "member-czlonek",
    username: "czlonek",
    name: "Członek KRD-IG",
    role: "member",
    passwordHash:
      "fd1a5d2ecc9e98159009f5da7c147abb1571d75f2486c5d576cc379ee47427a927a37d93cebc63dd25d57777dc6cf974b49900be047f09818806de273c53b3e9",
  },
  {
    id: "member-admin",
    username: "admin",
    name: "Administrator",
    role: "admin",
    passwordHash:
      "fd1a5d2ecc9e98159009f5da7c147abb1571d75f2486c5d576cc379ee47427a927a37d93cebc63dd25d57777dc6cf974b49900be047f09818806de273c53b3e9",
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

async function readLocalMemberLogos(): Promise<Record<string, { content: string; contentType: string }>> {
  try {
    return JSON.parse(await readFile(LOCAL_MEMBER_LOGOS_FILE, "utf8")) as Record<string, { content: string; contentType: string }>;
  } catch {
    return {};
  }
}

export function hashPassword(password: string): string {
  return crypto.scryptSync(password, MEMBER_PASSWORD_SALT, 64).toString("hex");
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

  if (!user) {
    return false;
  }

  const candidateHash = hashPassword(password);
  const expectedHash = user.passwordHash;
  const actual = Buffer.from(candidateHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
}

export async function getCurrentMemberSession(token?: string) {
  return verifySessionToken(token);
}

export async function saveMemberLogo(userId: string, content: Buffer, contentType: string) {
  try {
    const db = getDb();
    await db.run(sql`CREATE TABLE IF NOT EXISTS member_user_logos (user_id TEXT PRIMARY KEY NOT NULL, content TEXT NOT NULL, content_type TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.insert(memberUserLogos).values({ userId, content: content.toString("base64"), contentType })
      .onConflictDoUpdate({ target: memberUserLogos.userId, set: { content: content.toString("base64"), contentType } });
  } catch {
    const logos = await readLocalMemberLogos();
    logos[userId] = { content: content.toString("base64"), contentType };
    await writeFile(LOCAL_MEMBER_LOGOS_FILE, JSON.stringify(logos), "utf8");
  }
}

export async function getMemberLogo(userId: string) {
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

export async function deleteMemberLogo(userId: string) {
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
  const username = input.username.trim();
  const name = input.name.trim();

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
  };

  try {
    const db = getDb();
    await db.insert(memberUsers).values({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      passwordHash: user.passwordHash,
    });
    return user;
  } catch {
    const localUsers = await readLocalMemberUsers();
    await writeLocalMemberUsers([...localUsers, user]);
    return user;
  }
}

export async function updateMemberAccount(userId: string, input: { username: string; name: string; role: MemberRole; password?: string }) {
  const username = input.username.trim();
  const name = input.name.trim();
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
