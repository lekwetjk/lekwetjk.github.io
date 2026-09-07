import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../lib/auth";
import { addExportPermit, getExportPermits } from "../../../../lib/export-permits";

export async function GET() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ exportPermits: await getExportPermits() });
}

export async function POST(request: Request) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as { name?: string };
    return NextResponse.json({ exportPermits: await addExportPermit(body.name ?? "") });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się dodać kraju." }, { status: 400 });
  }
}