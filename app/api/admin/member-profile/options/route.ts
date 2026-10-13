import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import {
  createMemberProfileDictionaryOption,
  getMemberProfileDictionaries,
  updateMemberProfileDictionaryOption,
} from "../../../../lib/member-profile-dictionaries";

export async function GET() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ dictionaries: await getMemberProfileDictionaries(true) });
}

export async function POST(request: Request) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as {
      category?: string;
      valuePl?: string;
      valueEn?: string;
      sortOrder?: number;
    };
    return NextResponse.json({ option: await createMemberProfileDictionaryOption(body) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się dodać wartości." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as {
      id?: string;
      category?: string;
      valuePl?: string;
      valueEn?: string;
      sortOrder?: number;
      isActive?: boolean;
    };
    if (!body.id) throw new Error("Brak identyfikatora wartości.");
    return NextResponse.json({ option: await updateMemberProfileDictionaryOption(body.id, body) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się zapisać wartości." }, { status: 400 });
  }
}