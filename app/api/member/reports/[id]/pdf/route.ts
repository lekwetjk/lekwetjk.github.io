import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "../../../../../lib/auth";
import { getBulletinPdf } from "../../../../../lib/bulletin-reports";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await getBulletinPdf(id);
  if (!result) return new NextResponse("Not found", { status: 404 });
  const fileName = result.source.name.replace(/[\r\n"]/g, "-");
  return new NextResponse(result.object.body as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}