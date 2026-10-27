import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../../lib/auth";
import { getBulletinPdf } from "../../../../../lib/bulletin-reports";
import { getPreparedBulletinPdf } from "../../../../../lib/bulletin-pdfs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const prepared = await getPreparedBulletinPdf(id);
    const result = prepared ? null : await getBulletinPdf(id);
    if (!prepared && !result) return new NextResponse("Not found", { status: 404 });
    const fileName = (prepared?.fileName ?? result!.source.name).replace(/[\r\n"]/g, "-");
    const body = prepared?.body ?? result!.object.body;
    return new NextResponse(body as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Failed to download bulletin PDF", error);
    return NextResponse.json({ error: "Nie udało się pobrać biuletynu PDF." }, { status: 500 });
  }
}