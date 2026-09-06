import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const where = sekolahId ? { sekolahId } : {};
    const data = await db.tahunAjaran.findMany({
      where,
      orderBy: [{ statusAktif: "desc" }, { nama: "desc" }],
      include: {
        _count: { select: { semesters: true, kelases: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET tahun-ajaran error:", e);
    return NextResponse.json({ error: "Gagal memuat tahun ajaran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { nama, tanggalMulai, tanggalSelesai, statusAktif } = body;
    if (!nama || !String(nama).trim()) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });

    // Resolve sekolahId: from session, or body, or fallback to first sekolah for super admin
    let sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) {
      const firstSekolah = await db.sekolah.findFirst({ select: { id: true } });
      if (!firstSekolah) return NextResponse.json({ error: "Belum ada sekolah terdaftar" }, { status: 400 });
      sid = firstSekolah.id;
    }

    const isActive = !!statusAktif;

    const created = await db.$transaction(async (tx) => {
      if (isActive) {
        await tx.tahunAjaran.updateMany({ where: { sekolahId: sid, statusAktif: true }, data: { statusAktif: false } });
      }
      return tx.tahunAjaran.create({
        data: {
          sekolahId: sid,
          nama: String(nama).trim(),
          tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : null,
          tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : null,
          statusAktif: isActive,
        },
        include: { _count: { select: { semesters: true, kelases: true } } },
      });
    });
    return NextResponse.json(created);
  } catch (e) {
    console.error("POST tahun-ajaran error:", e);
    return NextResponse.json({ error: "Gagal menambah tahun ajaran" }, { status: 500 });
  }
}
