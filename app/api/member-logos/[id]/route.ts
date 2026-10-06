import { NextResponse } from "next/server";

import { getMemberLogo, getMemberUsers } from "../../../lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = (await getMemberUsers()).find(
    (user) => user.id === id && user.role === "member" && user.isActive,
  );
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const logo = await getMemberLogo(id);
  if (!logo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(Buffer.from(logo.content, "base64"), {
    headers: {
      "Content-Type": logo.contentType,
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}