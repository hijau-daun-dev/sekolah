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
    const data = await db.barang.findMany({
      where,
      orderBy: [{ nama: "asc" }],
      include: {
        kategoriBarang: { select: { id: true, nama: true } },
        ruangan: { select: { id: true, nama: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET barang error:", e);
    return NextResponse.json({ error: "Gagal memuat barang" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { kode, nama, kategoriBarangId, ruanganId, jumlah, kondisi, status, tanggalBeli, hargaBeli, keterangan } = body;
    if (!nama || !String(nama).trim()) return NextResponse.json({ error: "nama wajib" }, { status: 400 });

    const sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) return NextResponse.json({ error: "sekolahId wajib untuk super admin" }, { status: 400 });

    const data = await db.barang.create({
      data: {
        sekolahId: sid,
        kode: kode || null,
        nama: String(nama).trim(),
        kategoriBarangId: kategoriBarangId ? Number(kategoriBarangId) : null,
        ruanganId: ruanganId ? Number(ruanganId) : null,
        jumlah: jumlah != null && jumlah !== "" ? Number(jumlah) : 1,
        kondisi: kondisi || "Baik",
        status: status || "Tersedia",
        tanggalBeli: tanggalBeli ? new Date(tanggalBeli) : null,
        hargaBeli: hargaBeli != null && hargaBeli !== "" ? Number(hargaBeli) : null,
        keterangan: keterangan || null,
      },
      include: {
        kategoriBarang: { select: { id: true, nama: true } },
        ruangan: { select: { id: true, nama: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST barang error:", e);
    return NextResponse.json({ error: "Gagal menambah barang" }, { status: 500 });
  }
}
