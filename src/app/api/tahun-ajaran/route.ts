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
    const where: Record<string, unknown> = {};
    if (sekolahId) where.sekolahId = sekolahId;
    else if (qSekolahId) where.sekolahId = Number(qSekolahId);
    const data = await db.tahunAjaran.findMany({
      where,
      orderBy: [{ statusAktif: "desc" }, { nama: "desc" }],
      include: {
        _count: { select: { semesters: true, kelases: true } },
        kepalaSekolahPegawai: { select: { id: true, nama: true, jabatan: true, nip: true } },
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
    const { nama, tanggalMulai, tanggalSelesai, statusAktif, kepalaSekolahPegawaiId, kepalaSekolahNama } = body;
    if (!nama || !String(nama).trim()) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });

    // Resolve sekolahId
    let sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) {
      const firstSekolah = await db.sekolah.findFirst({ select: { id: true } });
      if (!firstSekolah) return NextResponse.json({ error: "Belum ada sekolah terdaftar" }, { status: 400 });
      sid = firstSekolah.id;
    }

    // Verify pegawai ownership if provided
    if (kepalaSekolahPegawaiId) {
      const pegawai = await db.pegawai.findUnique({ where: { id: Number(kepalaSekolahPegawaiId) }, select: { sekolahId: true, nama: true, nip: true } });
      if (!pegawai) return NextResponse.json({ error: "Pegawai kepala sekolah tidak ditemukan" }, { status: 404 });
      if (sekolahId && pegawai.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
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
          kepalaSekolahPegawaiId: kepalaSekolahPegawaiId ? Number(kepalaSekolahPegawaiId) : null,
          kepalaSekolahNama: kepalaSekolahNama || null,
        },
        include: {
          _count: { select: { semesters: true, kelases: true } },
          kepalaSekolahPegawai: { select: { id: true, nama: true, jabatan: true, nip: true } },
        },
      });
    });

    // Update sekolah.kepalaSekolah if provided
    if (kepalaSekolahNama) {
      await db.sekolah.update({ where: { id: sid }, data: { kepalaSekolah: kepalaSekolahNama } });
    }

    return NextResponse.json(created);
  } catch (e) {
    console.error("POST tahun-ajaran error:", e);
    return NextResponse.json({ error: "Gagal menambah tahun ajaran" }, { status: 500 });
  }
}
