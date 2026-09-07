import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "./app/lib/auth";

const protectedMemberPrefixes = ["/member", "/admin", "/tresc/dla-czlonkow"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedMemberArea = protectedMemberPrefixes.some((prefix) => {
    if (prefix === "/tresc/dla-czlonkow") {
      return pathname === prefix || pathname.startsWith(`${prefix}/`);
    }

    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });

  if (!isProtectedMemberArea) {
    return NextResponse.next();
  }

  if (pathname === "/login/czlonkowie") {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";

  if (!verifySessionToken(sessionToken)) {
    const loginUrl = new URL("/login/czlonkowie", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/member", "/member/:path*", "/admin", "/admin/:path*", "/tresc/dla-czlonkow", "/tresc/dla-czlonkow/:path*"],
};
