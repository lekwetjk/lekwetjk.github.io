import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, getMemberProfile, getMemberUsers, verifySessionToken } from "../../../../lib/auth";

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await getMemberUsers();
  const profiles = await Promise.all(users.map(async (user) => ({ user, profile: await getMemberProfile(user.id) })));
  const maxItems = (key: "selectedScopes" | "selectedSpecies" | "selectedExportPermits") =>
    Math.max(1, ...profiles.map(({ profile }) => profile?.[key]?.length ?? 0));
  const scopeColumns = maxItems("selectedScopes");
  const speciesColumns = maxItems("selectedSpecies");
  const exportColumns = maxItems("selectedExportPermits");
  const headers = [
    "login", "rola", "osoba do kontaktu", "e-mail", "telefon", "nazwa firmy", "adres firmy",
    "kod pocztowy", "miasto", "NIP", "strona internetowa", "województwo",
    ...Array.from({ length: scopeColumns }, (_, index) => `zakres działalności ${index + 1}`),
    ...Array.from({ length: speciesColumns }, (_, index) => `gatunek drobiu ${index + 1}`),
    "asortyment", "certyfikaty",
    ...Array.from({ length: exportColumns }, (_, index) => `uprawnienie eksportowe ${index + 1}`),
    "dodatkowe informacje",
  ];
  const rows = profiles.map(({ user, profile }) => {
    const values = (items: string[] | undefined, count: number) => Array.from({ length: count }, (_, index) => items?.[index] ?? "");
    return [
      user.username, user.role, profile?.contactPerson, profile?.email, profile?.phone, profile?.companyName,
      profile?.streetAddress, profile?.postalCode, profile?.city, profile?.nip, profile?.website,
      profile?.voivodeship, ...values(profile?.selectedScopes, scopeColumns), ...values(profile?.selectedSpecies, speciesColumns),
      profile?.selectedAssortments, profile?.selectedCertifications, ...values(profile?.selectedExportPermits, exportColumns), profile?.notes,
    ].map(csvCell).join(";");
  });

  const csv = `\uFEFF${headers.map(csvCell).join(";")}\r\n${rows.join("\r\n")}\r\n`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="dane-czlonkow.csv"',
    },
  });
}