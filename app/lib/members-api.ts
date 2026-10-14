import { createHash, timingSafeEqual } from "node:crypto";
import { asc, eq } from "drizzle-orm";

import { getDb } from "../../db/index.ts";
import { memberProfiles, memberUsers } from "../../db/schema.ts";
import { getMemberLogo } from "./auth.ts";
import {
  getMemberProfileDictionaries,
  type MemberProfileDictionaries,
} from "./member-profile-dictionaries.ts";

export type MembersApiLanguage = "pl" | "en";

export function getMembersApiKey(): string | undefined {
  const bindings = (globalThis as typeof globalThis & {
    env?: { MEMBERS_API_KEY?: string };
  }).env;
  return bindings?.MEMBERS_API_KEY ?? process.env.MEMBERS_API_KEY;
}

export function isMembersApiKeyValid(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

function parseProfile(data: string | null): Record<string, unknown> {
  if (data === null) return {};
  const profile: unknown = JSON.parse(data);
  if (typeof profile !== "object" || profile === null || Array.isArray(profile)) {
    throw new Error("Invalid member profile in database.");
  }
  return profile as Record<string, unknown>;
}

function profileText(profile: Record<string, unknown>, key: string): string {
  const value = profile[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error(`Invalid member profile field: ${key}.`);
  return value;
}

function profileList(profile: Record<string, unknown>, key: string): string[] {
  const value = profile[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === "string")) {
    throw new Error(`Invalid member profile field: ${key}.`);
  }
  return value;
}

function translateValue(
  value: string,
  options: MemberProfileDictionaries[keyof MemberProfileDictionaries],
  language: MembersApiLanguage,
) {
  if (language === "pl") return value;
  return options.find((option) => option.valuePl === value)?.valueEn ?? value;
}

function translateList(
  values: string[],
  options: MemberProfileDictionaries[keyof MemberProfileDictionaries],
  language: MembersApiLanguage,
) {
  return values.map((value) => translateValue(value, options, language));
}

export async function getApiMembers(language: MembersApiLanguage = "pl") {
  const dictionaries = await getMemberProfileDictionaries(true);
  const rows = await getDb()
    .select({ id: memberUsers.id, name: memberUsers.name, profileData: memberProfiles.data })
    .from(memberUsers)
    .leftJoin(memberProfiles, eq(memberUsers.id, memberProfiles.userId))
    .where(eq(memberUsers.role, "member"))
    .orderBy(asc(memberUsers.id));

  return Promise.all(rows.map(async (row) => {
    const profile = parseProfile(row.profileData);
    const logo = await getMemberLogo(row.id, { strict: true });
    return {
      id: row.id,
      name: profileText(profile, "companyName").trim() || row.name,
      address: {
        street: profileText(profile, "streetAddress"),
        postalCode: profileText(profile, "postalCode"),
        city: profileText(profile, "city"),
        voivodeship: translateValue(
          profileText(profile, "voivodeship"),
          dictionaries.voivodeships,
          language,
        ),
      },
      description: profileText(profile, "notes"),
      logo: logo ? `data:${logo.contentType};base64,${logo.content}` : null,
      scopes: translateList(profileList(profile, "selectedScopes"), dictionaries.businessScopes, language),
      species: translateList(profileList(profile, "selectedSpecies"), dictionaries.poultrySpecies, language),
      assortments: translateList(profileList(profile, "selectedAssortments"), dictionaries.assortments, language),
      exportPermits: translateList(profileList(profile, "selectedExportPermits"), dictionaries.exportPermits, language),
      certifications: translateList(profileList(profile, "selectedCertifications"), dictionaries.certifications, language),
      website: profileText(profile, "website"),
    };
  }));
}
