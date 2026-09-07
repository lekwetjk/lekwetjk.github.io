import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, saveMemberLogo, updateMemberAccount, verifySessionToken } from "../../../../lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!["image/jpeg", "image/bmp", "image/png"].includes(logo.type)) return NextResponse.json({ error: "Logo musi być w formacie JPG, BMP lub PNG." }, { status: 400 });
    if (logo.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Logo może mieć maksymalnie 5 MB." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const user = await updateMemberAccount(id, {
      username: String(formData.get("username") ?? ""),
      name: String(formData.get("name") ?? ""),
      role: formData.get("role") === "admin" ? "admin" : "member",
      password: String(formData.get("password") ?? "") || undefined,
    });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (logo instanceof File && logo.size > 0) await saveMemberLogo(id, Buffer.from(await logo.arrayBuffer()), logo.type);
    return NextResponse.redirect(new URL("/admin/uzytkownicy", request.url), 303);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}