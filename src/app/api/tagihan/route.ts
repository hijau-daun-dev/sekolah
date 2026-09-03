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
    const siswaId = url.searchParams.get("siswaId");
    const statusLunas = url.searchParams.get("statusLunas");
    const bulanTagihan = url.searchParams.get("bulanTagihan");

    const where: Record<string, unknown> = {};
    if (siswaId) where.siswaId = Number(siswaId);
    if (statusLunas === "true") where.statusLunas = true;
    if (statusLunas === "false") where.statusLunas = false;
    if (bulanTagihan) where.bulanTagihan = bulanTagihan;
    if (sekolahId) where.siswa = { sekolahId };

    const data = await db.tagihanSiswa.findMany({
      where,
      include: {
        siswa: { select: { id: true, nama: true, nis: true } },
        tarifPembayaran: { include: { jenisPembayaran: { select: { id: true, nama: true } } } },
        tahunAjaran: { select: { id: true, nama: true } },
        pembayarans: { select: { id: true, jumlahBayar: true, tanggalBayar: true, kodeKwitansi: true } },
      },
      orderBy: [{ statusLunas: "asc" }, { tanggalJatuhTempo: "asc" }, { siswa: { nama: "asc" } }],
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET tagihan error:", e);
    return NextResponse.json({ error: "Gagal memuat tagihan" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { siswaId, tarifPembayaranId, tahunAjaranId, bulanTagihan, nominal, statusLunas, tanggalJatuhTempo } = body;

    if (!siswaId || !tarifPembayaranId || !tahunAjaranId || nominal == null) {
      return NextResponse.json({ error: "Field wajib: siswaId, tarifPembayaranId, tahunAjaranId, nominal" }, { status: 400 });
    }

    const data = await db.tagihanSiswa.create({
      data: {
        siswaId: Number(siswaId),
        tarifPembayaranId: Number(tarifPembayaranId),
        tahunAjaranId: Number(tahunAjaranId),
        bulanTagihan: bulanTagihan || null,
        nominal: Number(nominal),
        statusLunas: !!statusLunas,
        tanggalJatuhTempo: tanggalJatuhTempo ? new Date(tanggalJatuhTempo) : null,
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST tagihan error:", e);
    return NextResponse.json({ error: "Gagal menambah tagihan" }, { status: 500 });
  }
}
