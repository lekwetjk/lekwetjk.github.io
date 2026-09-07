import { NextResponse } from "next/server";

import { getExportPermits } from "../../../lib/export-permits";

export async function GET() {
  return NextResponse.json({ exportPermits: await getExportPermits() });
}