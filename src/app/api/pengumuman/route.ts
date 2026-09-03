import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const where = sekolahId ? { sekolahId } : {};
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
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { judul, isi, target } = body;

    if (!judul || !isi) {
      return NextResponse.json({ error: "Field wajib: judul, isi" }, { status: 400 });
    }
    const validTarget = ["Semua", "Siswa", "Ortu", "Guru"];
    if (target && !validTarget.includes(target)) {
      return NextResponse.json({ error: "Target tidak valid" }, { status: 400 });
    }

    let pegawaiId = session.user.pegawaiId ? Number(session.user.pegawaiId) : null;
    if (!pegawaiId) {
      const fallback = await db.pegawai.findFirst({
        where: sekolahId ? { sekolahId } : {},
        select: { id: true },
      });
      if (!fallback) return NextResponse.json({ error: "Pegawai tidak ditemukan untuk user ini" }, { status: 400 });
      pegawaiId = fallback.id;
    }

    const sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) return NextResponse.json({ error: "sekolahId wajib untuk super admin" }, { status: 400 });

    const data = await db.pengumuman.create({
      data: {
        sekolahId: sid,
        pegawaiId,
        judul: String(judul).trim(),
        isi: String(isi),
        target: target || "Semua",
      },
      include: { pegawai: { select: { id: true, nama: true, jabatan: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST pengumuman error:", e);
    return NextResponse.json({ error: "Gagal menambah pengumuman" }, { status: 500 });
  }
}
