import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("miqat_session")?.value;

  let session: { id: string; role: string; name?: string } | null = null;
  if (sessionCookie) {
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie));
    } catch {
      session = null;
    }
  }

  const isLoggedIn = !!session;
  const isAdmin = session?.role === "ADMIN";
  const isCaptain = session?.role === "CAPTAIN";

  // Login page access
  if (pathname === "/login") {
    if (isLoggedIn) {
      if (isAdmin) {
        return NextResponse.redirect(new URL("/admin", request.url));
      } else if (isCaptain) {
        return NextResponse.redirect(new URL("/captain", request.url));
      }
    }
    return NextResponse.next();
  }

  // Admin routes protection
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin) {
      // Captain trying to access admin
      return NextResponse.redirect(new URL("/captain", request.url));
    }
    return NextResponse.next();
  }

  // Captain routes protection
  if (pathname.startsWith("/captain")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isCaptain) {
      // Admin trying to access captain workspace
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // Root redirect or deprecated route redirects
  const deprecatedRoutes = [
    "/",
    "/overview",
    "/requests",
    "/trips",
    "/drivers",
    "/fleet",
    "/driver-portal",
    "/contracts",
  ];

  if (deprecatedRoutes.includes(pathname)) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (isCaptain) {
      return NextResponse.redirect(new URL("/captain", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/captain/:path*",
    "/overview/:path*",
    "/requests/:path*",
    "/trips/:path*",
    "/drivers/:path*",
    "/fleet/:path*",
    "/driver-portal/:path*",
    "/contracts/:path*",
  ],
};
