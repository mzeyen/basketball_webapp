import { NextResponse, type NextRequest } from "next/server";

import { sessionCookieName, verifySessionToken } from "@/lib/auth/token";
import { canAccessAdmin } from "@/lib/rbac/roles";

const privateRoutes = ["/dashboard", "/admin"];

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

  if (pathname.startsWith("/admin") && !canAccessAdmin(session.role)) {
    return NextResponse.redirect(new URL("/dashboard?error=forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
