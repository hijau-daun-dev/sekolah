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
    const qStatusAktif = searchParams.get("statusAktif");
    const qSekolahId = searchParams.get("sekolahId");
    const where: Record<string, unknown> = {};
    if (sekolahId) where.sekolahId = sekolahId;
    else if (qSekolahId) where.sekolahId = Number(qSekolahId);
    if (qStatusAktif === "true") where.statusAktif = true;
    else if (qStatusAktif === "false") where.statusAktif = false;
    const data = await db.posAnggaran.findMany({
      where,
      orderBy: [{ jenis: "asc" }, { nama: "asc" }],
      include: { _count: { select: { pengeluarans: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET pos-anggaran error:", e);
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
    const { kode, nama, jenis, keterangan } = body;
    if (!nama || !String(nama).trim()) return NextResponse.json({ error: "nama wajib" }, { status: 400 });

    // Resolve sekolahId: from session, or body, or fallback to first sekolah for super admin
    let sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) {
      const firstSekolah = await db.sekolah.findFirst({ select: { id: true } });
      if (!firstSekolah) return NextResponse.json({ error: "Belum ada sekolah terdaftar" }, { status: 400 });
      sid = firstSekolah.id;
    }

    const data = await db.posAnggaran.create({
      data: {
        sekolahId: sid,
        kode: kode || null,
        nama: String(nama).trim(),
        jenis: jenis || "Pengeluaran",
        keterangan: keterangan || null,
      },
      include: { _count: { select: { pengeluarans: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST pos-anggaran error:", e);
    return NextResponse.json({ error: "Gagal menambah" }, { status: 500 });
  }
}
