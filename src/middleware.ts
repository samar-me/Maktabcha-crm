import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { supabaseResponse, user } = await updateSession(request);

  // Protected paths that require real Supabase authentication
  const protectedRoutes = [
    "/dashboard",
    "/students",
    "/groups",
    "/attendance",
    "/lessons",
    "/homework",
    "/grades",
    "/payments",
    "/debtors",
    "/reports",
    "/settings",
    "/assignments",
    "/curriculum",
  ];

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // If user is accessing root "/", redirect to dashboard if authenticated, else to login
  if (pathname === "/") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // If protected route and NOT authenticated in Supabase -> redirect to /login
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is already authenticated in Supabase and visits /login -> redirect to /dashboard
  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt, manifest.webmanifest (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest).*)",
  ],
};
