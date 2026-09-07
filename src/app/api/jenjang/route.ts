import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

// Default jenjang yang akan di-seed kalau tabel kosong
export const DEFAULT_JENJANG = [
  { kode: "SD", nama: "Sekolah Dasar", urutan: 1, keterangan: "Sekolah Dasar (negeri/swasta)" },
  { kode: "MI", nama: "Madrasah Ibtidaiyah", urutan: 1, keterangan: "Setara SD, bawah Kemenag" },
  { kode: "SMP", nama: "Sekolah Menengah Pertama", urutan: 2, keterangan: "Sekolah Menengah Pertama (negeri/swasta)" },
  { kode: "MTs", nama: "Madrasah Tsanawiyah", urutan: 2, keterangan: "Setara SMP, bawah Kemenag" },
  { kode: "MA", nama: "Madrasah Aliyah", urutan: 3, keterangan: "Setara SMA, bawah Kemenag" },
  { kode: "SMA", nama: "Sekolah Menengah Atas", urutan: 3, keterangan: "Sekolah Menengah Atas (negeri/swasta)" },
  { kode: "SMK", nama: "Sekolah Menengah Kejuruan", urutan: 3, keterangan: "Sekolah Menengah Kejuruan (negeri/swasta)" },
];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const statusAktif = url.searchParams.get("statusAktif");

    const where: Record<string, unknown> = {};
    if (statusAktif === "true") where.statusAktif = true;

    let list = await db.jenjang.findMany({
      where,
      orderBy: [{ urutan: "asc" }, { nama: "asc" }],
      include: { _count: { select: { sekolahs: true } } },
    });

    // Auto-seed default jenjang kalau tabel kosong
    if (list.length === 0) {
      await db.jenjang.createMany({
        data: DEFAULT_JENJANG.map((j) => ({ ...j, statusAktif: true })),
      });
      list = await db.jenjang.findMany({
        where,
        orderBy: [{ urutan: "asc" }, { nama: "asc" }],
        include: { _count: { select: { sekolahs: true } } },
      });
    }

    return NextResponse.json(list);
  } catch (e) {
    console.error("GET jenjang error:", e);
    return NextResponse.json({ error: "Gagal memuat jenjang" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: hanya Super Admin yang bisa kelola jenjang" }, { status: 403 });
    }

    const body = await req.json();
    const { kode, nama, urutan, keterangan, statusAktif } = body;

    if (!kode || !String(kode).trim()) return NextResponse.json({ error: "Kode jenjang wajib" }, { status: 400 });
    if (!nama || !String(nama).trim()) return NextResponse.json({ error: "Nama jenjang wajib" }, { status: 400 });

    // Cek duplikat kode
    const existing = await db.jenjang.findUnique({ where: { kode: String(kode).trim().toUpperCase() } });
    if (existing) return NextResponse.json({ error: `Kode "${kode}" sudah dipakai` }, { status: 400 });

    const created = await db.jenjang.create({
      data: {
        kode: String(kode).trim().toUpperCase(),
        nama: String(nama).trim(),
        urutan: Number(urutan) || 0,
        keterangan: keterangan || null,
        statusAktif: statusAktif !== false,
      },
      include: { _count: { select: { sekolahs: true } } },
    });
    return NextResponse.json(created);
  } catch (e) {
    console.error("POST jenjang error:", e);
    return NextResponse.json({ error: "Gagal membuat jenjang" }, { status: 500 });
  }
}
