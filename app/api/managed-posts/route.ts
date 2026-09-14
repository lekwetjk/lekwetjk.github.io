import { NextResponse } from "next/server";
import { listManagedPosts } from "../../lib/managed-posts";

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind && kind !== "news" && kind !== "tender") return NextResponse.json({ error: "Nieprawidłowy typ wpisu." }, { status: 400 });
  try { return NextResponse.json({ posts: await listManagedPosts(kind as "news" | "tender" | undefined) }); }
  catch { return NextResponse.json({ error: "Nie udało się pobrać wpisów." }, { status: 503 }); }
}