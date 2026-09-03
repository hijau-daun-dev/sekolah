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
    const data = await db.tarifPembayaran.findMany({
      where,
      orderBy: [{ tahunAjaran: { nama: "desc" } }, { jenisPembayaran: { nama: "asc" } }],
      include: {
        jenisPembayaran: { select: { id: true, nama: true } },
        tahunAjaran: { select: { id: true, nama: true } },
        tingkat: { select: { id: true, nama: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET tarif-pembayaran error:", e);
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
    const { jenisPembayaranId, tahunAjaranId, tingkatId, nominal, frekuensi, keterangan } = body;
    if (!jenisPembayaranId || !tahunAjaranId) return NextResponse.json({ error: "jenisPembayaranId & tahunAjaranId wajib" }, { status: 400 });
    const n = Number(nominal);
    if (Number.isNaN(n) || n < 0) return NextResponse.json({ error: "nominal tidak valid" }, { status: 400 });

    // Resolve sekolahId: from session, or body, or fallback to first sekolah for super admin
    let sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) {
      const firstSekolah = await db.sekolah.findFirst({ select: { id: true } });
      if (!firstSekolah) return NextResponse.json({ error: "Belum ada sekolah terdaftar" }, { status: 400 });
      sid = firstSekolah.id;
    }

    const data = await db.tarifPembayaran.create({
      data: {
        sekolahId: sid,
        jenisPembayaranId: Number(jenisPembayaranId),
        tahunAjaranId: Number(tahunAjaranId),
        tingkatId: tingkatId ? Number(tingkatId) : null,
        nominal: n,
        frekuensi: frekuensi || "Bulanan",
        keterangan: keterangan || null,
      },
      include: {
        jenisPembayaran: { select: { id: true, nama: true } },
        tahunAjaran: { select: { id: true, nama: true } },
        tingkat: { select: { id: true, nama: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST tarif-pembayaran error:", e);
    return NextResponse.json({ error: "Gagal menambah tarif" }, { status: 500 });
  }
}
