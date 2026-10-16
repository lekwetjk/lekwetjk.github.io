import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../lib/auth";
import { updateSessionActivity } from "../../../lib/audit-log";

export async function POST() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.sessionId) return new NextResponse(null, { status: 204 });
  try {
    await updateSessionActivity(session.sessionId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Nie udało się zapisać aktywności sesji.", error);
    return NextResponse.json({ error: "Nie udało się zapisać aktywności sesji." }, { status: 503 });
  }
}
