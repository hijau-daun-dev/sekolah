import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Returns the list of siswa IDs that the current user is allowed to access.
 * - SUPER_ADMIN/TU/KEUANGAN/GURU: returns null (= no filter, all in sekolah)
 * - ORTU: returns IDs of their children (via OrtuSiswa)
 * - SISWA: returns [their own siswaId]
 */
export async function getAllowedSiswaIds(): Promise<number[] | null> {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");

  const role = session.user.role;
  if (role === "SUPER_ADMIN" || role === "TU" || role === "KEUANGAN" || role === "GURU") {
    return null; // no per-siswa filter, only sekolah filter
  }

  if (role === "ORTU") {
    const ortuId = session.user.ortuId;
    if (!ortuId) throw new Error("NO_ORTU");
    const rels = await db.ortuSiswa.findMany({
      where: { ortuId: Number(ortuId) },
      select: { siswaId: true },
    });
    return rels.map((r) => r.siswaId);
  }

  if (role === "SISWA") {
    const siswaId = session.user.siswaId;
    if (!siswaId) throw new Error("NO_SISWA");
    return [Number(siswaId)];
  }

  return []; // unknown role: no access
}

/**
 * Returns the pegawaiId for the current GURU user (null if not a guru).
 */
export async function getCurrentPegawaiId(): Promise<number | null> {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "GURU") return null;
  return session.user.pegawaiId ? Number(session.user.pegawaiId) : null;
}

/**
 * Returns the current user's sekolahId (null for SUPER_ADMIN).
 */
export async function getCurrentSekolahId(): Promise<number | null> {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  if (session.user.role === "SUPER_ADMIN") return null;
  if (!session.user.sekolahId) throw new Error("NO_SEKOLAH");
  return Number(session.user.sekolahId);
}

/**
 * Returns current user's role and id for role-based checks.
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return {
    role: session.user.role,
    userId: Number(session.user.id),
    pegawaiId: session.user.pegawaiId ? Number(session.user.pegawaiId) : null,
    ortuId: session.user.ortuId ? Number(session.user.ortuId) : null,
    siswaId: session.user.siswaId ? Number(session.user.siswaId) : null,
    sekolahId: session.user.sekolahId ? Number(session.user.sekolahId) : null,
  };
}
