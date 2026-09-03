import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type Role = "SUPER_ADMIN" | "TU" | "KEUANGAN" | "GURU" | "SISWA" | "ORTU";

export async function getSession() {
  return auth();
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireRole(...roles: Role[]) {
  const session = await requireUser();
  if (!roles.includes(session.user.role as Role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireSekolahId() {
  const session = await requireUser();
  if (session.user.role === "SUPER_ADMIN") {
    return null; // super admin can access all
  }
  if (!session.user.sekolahId) {
    throw new Error("NO_SEKOLAH");
  }
  return Number(session.user.sekolahId);
}

export function filterBySekolah<T extends Record<string, unknown>>(
  where: T,
  sekolahId: number | null
): T {
  if (sekolahId === null) return where; // super admin
  return { ...where, sekolahId } as T;
}

export async function getUserSekolahIdInt(): Promise<number | null> {
  const session = await requireUser();
  if (session.user.role === "SUPER_ADMIN") return null;
  if (!session.user.sekolahId) throw new Error("NO_SEKOLAH");
  return Number(session.user.sekolahId);
}
