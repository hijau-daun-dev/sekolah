import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getAllowedSiswaIds, getCurrentUser } from "@/lib/auth-helpers";
import { tagihanSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const url = new URL(req.url);
    const siswaIdParam = url.searchParams.get("siswaId");
    const statusLunas = url.searchParams.get("statusLunas");
    const bulanTagihan = url.searchParams.get("bulanTagihan");

    const where: Record<string, unknown> = {};
    if (statusLunas === "true") where.statusLunas = true;
    if (statusLunas === "false") where.statusLunas = false;
    if (bulanTagihan) where.bulanTagihan = bulanTagihan;
    if (sekolahId) where.siswa = { sekolahId };

    // Ortu/Siswa data isolation
    const allowedSiswaIds = await getAllowedSiswaIds();
    if (allowedSiswaIds !== null) {
      if (allowedSiswaIds.length === 0) return NextResponse.json([]);
      where.siswaId = { in: allowedSiswaIds };
    }

    // Explicit siswaId filter (still subject to isolation)
    if (siswaIdParam) {
      const requestedId = Number(siswaIdParam);
      if (allowedSiswaIds !== null && !allowedSiswaIds.includes(requestedId)) {
        return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
      }
      where.siswaId = requestedId;
    }

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
    // Only TU/KEUANGAN/SUPER_ADMIN can manually create tagihan
    const allowed = ["SUPER_ADMIN", "TU", "KEUANGAN"];
    if (!allowed.includes(session.user.role)) {
      return NextResponse.json({ error: "Hanya TU/Keuangan/Super Admin yang dapat membuat tagihan" }, { status: 403 });
    }
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    // Zod validation (PRD §3)
    const parsed = tagihanSchema.safeParse({
      siswaId: Number(body.siswaId),
      tarifPembayaranId: Number(body.tarifPembayaranId),
      tahunAjaranId: Number(body.tahunAjaranId),
      bulanTagihan: body.bulanTagihan ?? null,
      nominal: Number(body.nominal),
      statusLunas: body.statusLunas,
      tanggalJatuhTempo: body.tanggalJatuhTempo ?? null,
    });
    if (!parsed.success) {
      return NextResponse.json({
        error: "Validasi gagal",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      }, { status: 400 });
    }
    const { siswaId, tarifPembayaranId, tahunAjaranId, bulanTagihan, nominal, statusLunas, tanggalJatuhTempo } = parsed.data;

    const data = await db.tagihanSiswa.create({
      data: {
        siswaId,
        tarifPembayaranId,
        tahunAjaranId,
        bulanTagihan: bulanTagihan || null,
        nominal,
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
