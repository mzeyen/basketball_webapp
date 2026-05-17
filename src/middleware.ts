import { NextResponse, type NextRequest } from "next/server";

import { sessionCookieName, verifySessionToken } from "@/lib/auth/token";

const privateRoutes = ["/profile", "/admin", "/calendar", "/training-plans", "/training-exercises"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPrivateRoute = privateRoutes.some((route) => pathname.startsWith(route));

  if (!isPrivateRoute) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(request.cookies.get(sessionCookieName)?.value);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/admin/:path*", "/calendar/:path*", "/training-plans/:path*", "/training-exercises/:path*"],
};
