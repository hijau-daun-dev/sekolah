import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "83e970247b42509f122772eb2e46b6c97f1c308a4855f1da2a4abff8ee724495";
const JWT_SECRET = new TextEncoder().encode(SECRET);

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/auth/") || path.startsWith("/api/seed")) {
    return NextResponse.next();
  }
  const token = req.cookies.get("simsekolah-token")?.value;
  if (!token) { const url = new URL("/login", req.url); return NextResponse.redirect(url); }
  try { await jwtVerify(token, JWT_SECRET); return NextResponse.next(); }
  catch { const url = new URL("/login", req.url); return NextResponse.redirect(url); }
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|uploads|logo.svg|robots.txt).*)"],
};
