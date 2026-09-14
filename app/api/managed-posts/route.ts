import { NextResponse } from "next/server";
import { listManagedPosts } from "../../lib/managed-posts";

const PRODUCTION_API_BASE = "https://krd-ig-website-concept.lek-wet-jk.workers.dev";

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind && kind !== "news" && kind !== "tender") return NextResponse.json({ error: "Nieprawidłowy typ wpisu." }, { status: 400 });
  const origin = request.headers.get("origin");
  const headers = origin === "http://localhost:3000" ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : undefined;
  try { return NextResponse.json({ posts: await listManagedPosts(kind as "news" | "tender" | undefined) }, { headers }); }
  catch {
    if (new URL(request.url).hostname === "localhost") {
      try {
        const response = await fetch(`${PRODUCTION_API_BASE}/api/managed-posts${kind ? `?kind=${kind}` : ""}`);
        if (response.ok) return NextResponse.json(await response.json(), { headers });
      } catch {
        // Keep the normal error response when production is unavailable during local preview.
      }
    }
    return NextResponse.json({ error: "Nie udało się pobrać wpisów." }, { status: 503, headers });
  }
}