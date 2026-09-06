import { NextResponse } from "next/server";
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("simsekolah-token", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0, secure: false });
  return res;
}
