import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const qSekolahId = searchParams.get("sekolahId");
    const qStatusAktif = searchParams.get("statusAktif");
    const qTahunAjaranId = searchParams.get("tahunAjaranId");
    const where: Record<string, unknown> = {};
    if (sekolahId) where.sekolahId = sekolahId;
    else if (qSekolahId) where.sekolahId = Number(qSekolahId);
    if (qStatusAktif === "true") where.statusAktif = true;
    else if (qStatusAktif === "false") where.statusAktif = false;
    if (qTahunAjaranId) where.tahunAjaranId = Number(qTahunAjaranId);
    const data = await db.semester.findMany({
      where,
      orderBy: [{ tahunAjaran: { nama: "desc" } }, { nama: "asc" }],
      include: { tahunAjaran: { select: { id: true, nama: true, statusAktif: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET semester error:", e);
    return NextResponse.json({ error: "Gagal memuat semester" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { tahunAjaranId, nama, statusAktif, tanggalMulai, tanggalSelesai } = body;
    if (!tahunAjaranId) return NextResponse.json({ error: "tahunAjaranId wajib" }, { status: 400 });
    if (!nama || !String(nama).trim()) return NextResponse.json({ error: "nama wajib" }, { status: 400 });

    const ta = await db.tahunAjaran.findUnique({ where: { id: Number(tahunAjaranId) }, select: { sekolahId: true } });
    if (!ta) return NextResponse.json({ error: "Tahun ajaran tidak ditemukan" }, { status: 404 });
    if (sekolahId && ta.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    const sid = ta.sekolahId;
    const isActive = !!statusAktif;
    const created = await db.$transaction(async (tx) => {
      if (isActive) {
        await tx.semester.updateMany({ where: { sekolahId: sid, statusAktif: true }, data: { statusAktif: false } });
      }
      return tx.semester.create({
        data: {
          sekolahId: sid,
          tahunAjaranId: Number(tahunAjaranId),
          nama: String(nama).trim(),
          statusAktif: isActive,
          tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : null,
          tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : null,
        },
        include: { tahunAjaran: { select: { id: true, nama: true } } },
      });
    });
    return NextResponse.json(created);
  } catch (e) {
    console.error("POST semester error:", e);
    return NextResponse.json({ error: "Gagal menambah semester" }, { status: 500 });
  }
}
