import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(id: number, sekolahId?: number) {
  const r = await db.barang.findUnique({ where: { id }, select: { sekolahId: true } });
  if (!r) return null;
  if (sekolahId && r.sekolahId !== sekolahId) return null;
  return r;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const bid = Number(id);
    const owned = await checkOwnership(bid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    const data = await db.barang.findUnique({
      where: { id: bid },
      include: { kategoriBarang: { select: { id: true, nama: true } }, ruangan: { select: { id: true, nama: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET barang/[id] error:", e);
    return NextResponse.json({ error: "Gagal memuat" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const bid = Number(id);
    const owned = await checkOwnership(bid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { kode, nama, kategoriBarangId, ruanganId, jumlah, kondisi, status, tanggalBeli, hargaBeli, keterangan } = body;
    const data = await db.barang.update({
      where: { id: bid },
      data: {
        kode: kode ?? null,
        nama: nama ? String(nama).trim() : undefined,
        kategoriBarangId: kategoriBarangId === "" || kategoriBarangId == null ? null : Number(kategoriBarangId),
        ruanganId: ruanganId === "" || ruanganId == null ? null : Number(ruanganId),
        jumlah: jumlah != null && jumlah !== "" ? Number(jumlah) : undefined,
        kondisi: kondisi ?? undefined,
        status: status ?? undefined,
        tanggalBeli: tanggalBeli ? new Date(tanggalBeli) : tanggalBeli === "" ? null : undefined,
        hargaBeli: hargaBeli === "" || hargaBeli == null ? null : Number(hargaBeli),
        keterangan: keterangan ?? null,
      },
      include: {
        kategoriBarang: { select: { id: true, nama: true } },
        ruangan: { select: { id: true, nama: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT barang/[id] error:", e);
    return NextResponse.json({ error: "Gagal mengupdate" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const bid = Number(id);
    const owned = await checkOwnership(bid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    await db.barang.delete({ where: { id: bid } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE barang/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
