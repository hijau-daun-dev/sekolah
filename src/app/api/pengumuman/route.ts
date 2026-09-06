import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";
import { pengumumanSchema } from "@/lib/schemas";

/**
 * Resolve which `target` values the current user role is allowed to see.
 * - SUPER_ADMIN/TU/KEUANGAN: see all (no target filter)
 * - GURU: target IN ("Semua", "Guru")
 * - SISWA: target IN ("Semua", "Siswa")
 * - ORTU: target IN ("Semua", "Ortu")
 */
function allowedTargetsForRole(role: string): string[] | null {
  switch (role) {
    case "SUPER_ADMIN":
    case "TU":
    case "KEUANGAN":
      return null; // no filter
    case "GURU":
      return ["Semua", "Guru"];
    case "SISWA":
      return ["Semua", "Siswa"];
    case "ORTU":
      return ["Semua", "Ortu"];
    default:
      return ["Semua"]; // unknown role: only universal
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const where: Record<string, unknown> = {};
    if (sekolahId) where.sekolahId = sekolahId;

    const allowedTargets = allowedTargetsForRole(session.user.role);
    if (allowedTargets) where.target = { in: allowedTargets };

    const data = await db.pengumuman.findMany({
      where,
      include: { pegawai: { select: { id: true, nama: true, jabatan: true } } },
      orderBy: { tanggalPosting: "desc" },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET pengumuman error:", e);
    return NextResponse.json({ error: "Gagal memuat pengumuman" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // PRD Alur 6: Admin/Kepala Sekolah (SUPER_ADMIN/TU/GURU) yang dapat memposting pengumuman
    const allowedRoles = ["SUPER_ADMIN", "TU", "GURU"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden: hanya Admin/TU/Guru yang dapat memposting pengumuman" }, { status: 403 });
    }

    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    // Zod validation (PRD §3)
    const parsed = pengumumanSchema.safeParse({
      judul: body.judul,
      isi: body.isi,
      target: body.target,
    });
    if (!parsed.success) {
      return NextResponse.json({
        error: "Validasi gagal",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      }, { status: 400 });
    }
    const { judul, isi, target } = parsed.data;

    let pegawaiId = session.user.pegawaiId ? Number(session.user.pegawaiId) : null;
    if (!pegawaiId) {
      const fallback = await db.pegawai.findFirst({
        where: sekolahId ? { sekolahId } : {},
        select: { id: true },
      });
      if (!fallback) return NextResponse.json({ error: "Pegawai tidak ditemukan untuk user ini" }, { status: 400 });
      pegawaiId = fallback.id;
    }

    // Resolve sekolahId: from session, or body, or fallback to first sekolah for super admin
    let sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) {
      const firstSekolah = await db.sekolah.findFirst({ select: { id: true } });
      if (!firstSekolah) return NextResponse.json({ error: "Belum ada sekolah terdaftar" }, { status: 400 });
      sid = firstSekolah.id;
    }

    const data = await db.pengumuman.create({
      data: {
        sekolahId: sid,
        pegawaiId,
        judul: String(judul).trim(),
        isi: String(isi),
        target,
      },
      include: { pegawai: { select: { id: true, nama: true, jabatan: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST pengumuman error:", e);
    return NextResponse.json({ error: "Gagal menambah pengumuman" }, { status: 500 });
  }
}
