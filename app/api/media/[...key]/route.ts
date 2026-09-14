import { NextResponse } from "next/server";
import { getMemberDocumentsBucket } from "../../../../db";

const PRODUCTION_API_BASE = "https://krd-ig-website-concept.lek-wet-jk.workers.dev";

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const objectKey = key.join("/");
  try {
    const object = await getMemberDocumentsBucket().get(objectKey);
    if (object) return new NextResponse(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType || "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    if (new URL(request.url).hostname === "localhost") {
      const response = await fetch(`${PRODUCTION_API_BASE}/api/media/${encodeURIComponent(objectKey)}`);
      if (response.ok) return new NextResponse(response.body, { headers: { "Content-Type": response.headers.get("Content-Type") || "application/octet-stream" } });
    }
  }
  return new NextResponse("Not found", { status: 404 });
}