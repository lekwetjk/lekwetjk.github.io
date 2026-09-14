import { NextResponse } from "next/server";
import { getMemberDocumentsBucket } from "../../../../db";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const object = await getMemberDocumentsBucket().get(key.join("/"));
  if (!object) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType || "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" } });
}