import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const where = sekolahId ? { pegawai: { sekolahId } } : {};
    const data = await db.pengeluaran.findMany({
      where,
      include: {
        posAnggaran: { select: { id: true, nama: true, kode: true, jenis: true } },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
      },
      orderBy: { tanggal: "desc" },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET pengeluaran error:", e);
    return NextResponse.json({ error: "Gagal memuat pengeluaran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { posAnggaranId, tanggal, nominal, keterangan, buktiNotaUrl } = body;

    if (!posAnggaranId || nominal == null || !keterangan) {
      return NextResponse.json({ error: "Field wajib: posAnggaranId, nominal, keterangan" }, { status: 400 });
    }
    if (Number(nominal) <= 0) {
      return NextResponse.json({ error: "Nominal harus > 0" }, { status: 400 });
    }

    // Verify posAnggaran belongs to sekolah
    const pos = await db.posAnggaran.findFirst({
      where: { id: Number(posAnggaranId), ...(sekolahId ? { sekolahId } : {}) },
    });
    if (!pos) return NextResponse.json({ error: "Pos anggaran tidak ditemukan" }, { status: 404 });

    // pegawaiId from session, fallback to any pegawai of sekolah
    let pegawaiId = session.user.pegawaiId ? Number(session.user.pegawaiId) : null;
    if (!pegawaiId) {
      const fallback = await db.pegawai.findFirst({
        where: sekolahId ? { sekolahId } : {},
        select: { id: true },
      });
      if (!fallback) return NextResponse.json({ error: "Pegawai tidak ditemukan untuk user ini" }, { status: 400 });
      pegawaiId = fallback.id;
    }

    const data = await db.pengeluaran.create({
      data: {
        pegawaiId,
        posAnggaranId: Number(posAnggaranId),
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        nominal: Number(nominal),
        keterangan: String(keterangan).trim(),
        buktiNotaUrl: buktiNotaUrl || null,
      },
      include: {
        posAnggaran: { select: { id: true, nama: true, kode: true, jenis: true } },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST pengeluaran error:", e);
    return NextResponse.json({ error: "Gagal menambah pengeluaran" }, { status: 500 });
  }
}
