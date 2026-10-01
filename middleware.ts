import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, verifySessionToken } from "./app/lib/auth";
import { safeMemberRedirect } from "./app/lib/member-redirect";

const protectedMemberPrefixes = ["/member", "/admin", "/tresc/dla-czlonkow", "/tresc/raporty"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";
  const session = verifySessionToken(sessionToken);

  if (pathname === "/login/czlonkowie") {
    if (session) {
      const redirectPath = safeMemberRedirect(request.nextUrl.searchParams.get("redirect"));
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    return NextResponse.next();
  }

  if (pathname === "/tresc/raporty" && !request.nextUrl.searchParams.get("raport")) {
    return NextResponse.next();
  }

  const isProtectedMemberArea = protectedMemberPrefixes.some((prefix) => {
    if (prefix === "/tresc/dla-czlonkow") {
      return pathname === prefix || pathname.startsWith(`${prefix}/`);
    }

    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });

  if (!isProtectedMemberArea) {
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/login/czlonkowie", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login/czlonkowie", "/member", "/member/:path*", "/admin", "/admin/:path*", "/tresc/dla-czlonkow", "/tresc/dla-czlonkow/:path*", "/tresc/raporty", "/tresc/raporty/:path*"],
};
