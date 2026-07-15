import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/password-expired",
  "/install",
  "/error",
  "/api",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/manifest.json",
  // Shared/public pages
  "/share/dash",
  "/share/file",
  "/share/folder",
  "/url-safe",
  // Static assets
  "/next.svg",
  "/vercel.svg",
  "/window.svg",
];

// Admin paths that require admin verification
const ADMIN_PATHS = ["/admin"];

// Paths that are always public within admin
const ADMIN_PUBLIC_PATHS = ["/admin/verify", "/admin/setup"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some((path) => pathname.startsWith(path));
}

function isAdminPublicPath(pathname: string): boolean {
  return ADMIN_PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for auth token
  const authToken =
    request.cookies.get("auth_token")?.value ||
    request.cookies.get("rb_token")?.value;

  // If no auth token and not on a public path, redirect to login
  if (!authToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin path protection
  if (isAdminPath(pathname) && !isAdminPublicPath(pathname)) {
    // Check admin auth cookie
    const adminToken =
      request.cookies.get("admin_token")?.value ||
      request.cookies.get("rb_admin_token")?.value;

    if (!adminToken) {
      const verifyUrl = new URL("/admin/verify", request.url);
      verifyUrl.searchParams.set("nexturl", pathname);
      return NextResponse.redirect(verifyUrl);
    }
  }

  // Add performance headers
  const response = NextResponse.next();

  // DNS prefetch
  response.headers.set("X-DNS-Prefetch-Control", "on");

  // Prevent MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, manifest.json
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.json|.*\\.).*)",
  ],
};
