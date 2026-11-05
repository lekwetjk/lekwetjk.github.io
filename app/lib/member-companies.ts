import { inArray, sql } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { memberCompanies, memberCompanyUsers } from "../../db/schema.ts";
import type { MemberUser } from "./auth.ts";
import { getLocalMemberStore } from "./local-member-store.ts";

export type MemberCompany = { id: string; name: string; userCount: number };
type CompanyRecord = { id: string; name: string };

function requireLocalBinding(error: unknown) {
  if (!(error instanceof Error && error.message.includes("binding `DB` is unavailable"))) throw error;
}

export async function getMemberCompanyIds(userIds: string[]): Promise<Record<string, string>> {
  const result = Object.fromEntries(userIds.map(userId => [userId, userId]));
  if (userIds.length === 0) return result;
  try {
    const db = getDb();
    for (let offset = 0; offset < userIds.length; offset += 100) {
      const links = await db.select().from(memberCompanyUsers).where(inArray(memberCompanyUsers.userId, userIds.slice(offset, offset + 100)));
      for (const link of links) result[link.userId] = link.companyId;
    }
  } catch (error) {
    requireLocalBinding(error);
    const store = await getLocalMemberStore();
    for (const userId of userIds) result[userId] = store.get<{ companyId: string }>("company-links", userId)?.companyId ?? userId;
  }
  return result;
}

export async function getMemberCompanyId(userId: string) {
  return (await getMemberCompanyIds([userId]))[userId];
}

export async function listMemberCompanies(users: MemberUser[]): Promise<MemberCompany[]> {
  try {
    const db = getDb();
    await db.run(sql`INSERT INTO member_companies (id, name) SELECT id, name FROM member_users WHERE role = 'member' ON CONFLICT(id) DO NOTHING`);
    return await db.all<MemberCompany>(sql`SELECT c.id,
      COALESCE(NULLIF(TRIM(json_extract(p.data, '$.companyName')), ''), c.name) AS name,
      (SELECT COUNT(*) FROM member_users u LEFT JOIN member_company_users l ON l.user_id = u.id
        WHERE u.role = 'member' AND COALESCE(l.company_id, u.id) = c.id) AS userCount
      FROM member_companies c LEFT JOIN member_profiles p ON p.user_id = c.id ORDER BY name`);
  } catch (error) {
    requireLocalBinding(error);
  }
  const store = await getLocalMemberStore();
  const members = users.filter(user => user.role === "member");
  for (const user of members) {
    if (!store.get("companies", user.id)) store.set("companies", user.id, { id: user.id, name: user.name });
  }
  const companies = Object.values(store.list<CompanyRecord>("companies"));
  const counts = new Map<string, number>();
  for (const user of members) {
    const companyId = await getMemberCompanyId(user.id);
    counts.set(companyId, (counts.get(companyId) ?? 0) + 1);
  }
  return companies.map(company => ({
    ...company,
    name: store.get<{ companyName?: string }>("profiles", company.id)?.companyName?.trim() || company.name,
    userCount: counts.get(company.id) ?? 0,
  })).sort((left, right) => left.name.localeCompare(right.name, "pl"));
}

export async function assignUserCompany(users: MemberUser[], userId: string, companyId: string) {
  const user = users.find(candidate => candidate.id === userId);
  if (!user || user.role !== "member") throw new Error("Wybierz konto członkowskie.");
  const companies = await listMemberCompanies(users);
  if (!companies.some(company => company.id === companyId)) throw new Error("Nie znaleziono firmy.");
  try {
    await getDb().insert(memberCompanyUsers).values({ userId, companyId }).onConflictDoUpdate({ target: memberCompanyUsers.userId, set: { companyId } });
    return;
  } catch (error) {
    requireLocalBinding(error);
  }
  const store = await getLocalMemberStore();
  store.set("company-links", userId, { companyId });
}