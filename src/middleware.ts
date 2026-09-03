import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple auth middleware: check for next-auth.session-token cookie.
// API routes handle their own auth via auth-guard.
// Note: NextAuth v5 deprecated `next-auth/middleware`'s `withAuth`. This custom middleware
// just redirects unauthenticated users to /login (cookie-based check).
export function middleware(req: NextRequest) {
  const token =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (!token) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect all page routes EXCEPT:
    // - /login
    // - /api/* (API uses its own auth via auth-guard helper)
    // - Next internals & public assets
    "/((?!login|api|_next/static|_next/image|favicon.ico|uploads|logo.svg|robots.txt).*)",
  ],
};
