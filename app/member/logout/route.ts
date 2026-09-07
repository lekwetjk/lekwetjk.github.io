import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "../../lib/auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login/czlonkowie", request.url), 303);

  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
