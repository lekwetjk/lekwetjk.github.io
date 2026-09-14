import { NextResponse } from "next/server";

import { WSTAWIENIA_COLUMNS, getWstawieniaRows } from "../../lib/wstawienia";

export async function GET() {
  try {
    return NextResponse.json({ columns: WSTAWIENIA_COLUMNS, rows: await getWstawieniaRows() });
  } catch {
    return NextResponse.json({ error: "Nie udało się odczytać tabeli wstawień." }, { status: 503 });
  }
}