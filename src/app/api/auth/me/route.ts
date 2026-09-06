import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "83e970247b42509f122772eb2e46b6c97f1c308a4855f1da2a4abff8ee724495";
const JWT_SECRET = new TextEncoder().encode(SECRET);

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(/simsekolah-token=([^;]+)/);
    const token = tokenMatch?.[1];
    if (!token) return NextResponse.json({ user: null });
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return NextResponse.json({ user: payload });
  } catch { return NextResponse.json({ user: null }); }
}
