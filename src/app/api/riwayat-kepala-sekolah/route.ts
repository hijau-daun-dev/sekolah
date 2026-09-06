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
    const where = sekolahId ? { sekolahId } : qSekolahId ? { sekolahId: Number(qSekolahId) } : {};
    const data = await db.riwayatKepalaSekolah.findMany({
      where,
      orderBy: [{ tanggalMulai: "desc" }],
      include: { pegawai: { select: { id: true, nama: true, jabatan: true, nip: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET riwayat-kepala-sekolah error:", e);
    return NextResponse.json({ error: "Gagal memuat" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { pegawaiId, namaSnapshot, nipSnapshot, tanggalMulai, tanggalSelesai, status, keterangan } = body;
    if (!pegawaiId || !tanggalMulai) return NextResponse.json({ error: "pegawaiId & tanggalMulai wajib" }, { status: 400 });

    // Resolve sekolahId
    let sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) {
      const firstSekolah = await db.sekolah.findFirst({ select: { id: true } });
      if (!firstSekolah) return NextResponse.json({ error: "Belum ada sekolah terdaftar" }, { status: 400 });
      sid = firstSekolah.id;
    }

    // Verify pegawai
    const pegawai = await db.pegawai.findUnique({ where: { id: Number(pegawaiId) }, select: { sekolahId: true, nama: true, nip: true } });
    if (!pegawai) return NextResponse.json({ error: "Pegawai tidak ditemukan" }, { status: 404 });
    if (sekolahId && pegawai.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    const newStatus = status || "Aktif";
    const mulai = new Date(tanggalMulai);

    // Auto-close previous active records (SCD Type 2): set tanggalSelesai + status="Selesai"
    await db.riwayatKepalaSekolah.updateMany({
      where: { sekolahId: sid, status: "Aktif" },
      data: { status: "Selesai", tanggalSelesai: mulai },
    });

    const data = await db.riwayatKepalaSekolah.create({
      data: {
        sekolahId: sid,
        pegawaiId: Number(pegawaiId),
        namaSnapshot: namaSnapshot || pegawai.nama,
        nipSnapshot: nipSnapshot || pegawai.nip || null,
        tanggalMulai: mulai,
        tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : null,
        status: newStatus,
        keterangan: keterangan || null,
      },
      include: { pegawai: { select: { id: true, nama: true, jabatan: true, nip: true } } },
    });

    // Auto-sync sekolah.kepalaSekolah + nipKepala for "Aktif" record
    if (data.status === "Aktif") {
      await db.sekolah.update({
        where: { id: sid },
        data: { kepalaSekolah: data.namaSnapshot, nipKepala: data.nipSnapshot },
      });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("POST riwayat-kepala-sekolah error:", e);
    return NextResponse.json({ error: "Gagal menambah" }, { status: 500 });
  }
}
