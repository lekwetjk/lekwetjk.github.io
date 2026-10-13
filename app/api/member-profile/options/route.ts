import { NextResponse } from "next/server";

import { getMemberProfileDictionaries } from "../../../lib/member-profile-dictionaries";

export async function GET() {
  return NextResponse.json({ dictionaries: await getMemberProfileDictionaries() });
}