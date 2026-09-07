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

  const headers = [
    "login", "rola", "osoba do kontaktu", "e-mail", "telefon", "nazwa firmy", "adres firmy",
    "kod pocztowy", "miasto", "NIP", "strona internetowa", "województwo", "zakres działalności",
    "gatunek drobiu", "asortyment", "certyfikaty", "uprawnienia eksportowe", "dodatkowe informacje",
  ];
  const users = await getMemberUsers();
  const rows = await Promise.all(users.map(async (user) => {
    const profile = await getMemberProfile(user.id);
    return [
      user.username, user.role, profile?.contactPerson, profile?.email, profile?.phone, profile?.companyName,
      profile?.streetAddress, profile?.postalCode, profile?.city, profile?.nip, profile?.website,
      profile?.voivodeship, profile?.selectedScopes, profile?.selectedSpecies, profile?.selectedAssortments,
      profile?.selectedCertifications, profile?.selectedExportPermits, profile?.notes,
    ].map(csvCell).join(";");
  }));

  const csv = `\uFEFF${headers.map(csvCell).join(";")}\r\n${rows.join("\r\n")}\r\n`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="dane-czlonkow.csv"',
    },
  });
}