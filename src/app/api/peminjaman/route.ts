import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (sekolahId) where.barang = { sekolahId };

    const data = await db.peminjamanBarang.findMany({
      where,
      include: {
        barang: {
          select: {
            id: true, nama: true, kode: true, status: true, kondisi: true,
            kategoriBarang: { select: { id: true, nama: true } },
            ruangan: { select: { id: true, nama: true } },
          },
        },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
      },
      orderBy: { tanggalPinjam: "desc" },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET peminjaman error:", e);
    return NextResponse.json({ error: "Gagal memuat peminjaman" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { barangId, tanggalKembaliRencana, keterangan } = body;

    if (!barangId || !tanggalKembaliRencana) {
      return NextResponse.json({ error: "Field wajib: barangId, tanggalKembaliRencana" }, { status: 400 });
    }

    // Verify barang belongs to sekolah and is available
    const barang = await db.barang.findFirst({
      where: { id: Number(barangId), ...(sekolahId ? { sekolahId } : {}) },
    });
    if (!barang) return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });
    if (barang.status !== "Tersedia") {
      return NextResponse.json({ error: "Barang sedang tidak tersedia" }, { status: 400 });
    }

    // pegawaiId from session
    let pegawaiId = session.user.pegawaiId ? Number(session.user.pegawaiId) : null;
    if (!pegawaiId) {
      const fallback = await db.pegawai.findFirst({
        where: sekolahId ? { sekolahId } : {},
        select: { id: true },
      });
      if (!fallback) return NextResponse.json({ error: "Pegawai tidak ditemukan untuk user ini" }, { status: 400 });
      pegawaiId = fallback.id;
    }

    // Transaction: create peminjaman + set barang.status = Dipinjam
    const data = await db.$transaction(async (tx) => {
      const pinjam = await tx.peminjamanBarang.create({
        data: {
          barangId: Number(barangId),
          peminjamPegawaiId: pegawaiId,
          tanggalPinjam: new Date(),
          tanggalKembaliRencana: new Date(tanggalKembaliRencana),
          status: "Dipinjam",
          keterangan: keterangan || null,
        },
        include: {
          barang: {
            select: {
              id: true, nama: true, kode: true, status: true, kondisi: true,
              kategoriBarang: { select: { id: true, nama: true } },
              ruangan: { select: { id: true, nama: true } },
            },
          },
          pegawai: { select: { id: true, nama: true, jabatan: true } },
        },
      });
      await tx.barang.update({
        where: { id: Number(barangId) },
        data: { status: "Dipinjam" },
      });
      return pinjam;
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST peminjaman error:", e);
    return NextResponse.json({ error: "Gagal menambah peminjaman" }, { status: 500 });
  }
}
