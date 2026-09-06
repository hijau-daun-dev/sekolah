import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "83e970247b42509f122772eb2e46b6c97f1c308a4855f1da2a4abff8ee724495";
const JWT_SECRET = new TextEncoder().encode(SECRET);

export interface SessionUser {
  id: string; email: string; name: string; role: string; roleId: number;
  sekolahId: string | null; sekolahNama: string | null; sekolahLogo: string | null;
  pegawaiId: string | null; ortuId: string | null; siswaId: string | null;
}
export interface Session { user: SessionUser; }

export async function auth(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("simsekolah-token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { user: payload as unknown as SessionUser };
  } catch { return null; }
}

export async function getSession() { const s = await auth(); return s?.user ?? null; }
export async function requireUser() { const s = await getSession(); if (!s) throw new Error("UNAUTHORIZED"); return s; }

export async function signSessionToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(JWT_SECRET);
}
