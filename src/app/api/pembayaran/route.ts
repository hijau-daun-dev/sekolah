import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const METODE_LIST = ["Tunai", "Transfer", "Debit", "QRIS"];

function random4(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const url = new URL(req.url);
    const siswaId = url.searchParams.get("siswaId");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (siswaId) where.tagihanSiswa = { siswaId: Number(siswaId) };
    if (from || to) {
      const tg: Record<string, Date> = {};
      if (from) tg.gte = new Date(from);
      if (to) {
        const t = new Date(to);
        t.setHours(23, 59, 59, 999);
        tg.lte = t;
      }
      where.tanggalBayar = tg;
    }
    if (sekolahId) where.tagihanSiswa = { ...(where.tagihanSiswa as object || {}), siswa: { sekolahId } };

    const data = await db.pembayaran.findMany({
      where,
      include: {
        tagihanSiswa: {
          include: {
            siswa: { select: { id: true, nama: true, nis: true } },
            tarifPembayaran: { include: { jenisPembayaran: { select: { id: true, nama: true } } } },
            tahunAjaran: { select: { id: true, nama: true } },
          },
        },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
      },
      orderBy: { tanggalBayar: "desc" },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET pembayaran error:", e);
    return NextResponse.json({ error: "Gagal memuat pembayaran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { tagihanSiswaId, jumlahBayar, metodePembayaran, keterangan } = body;

    if (!tagihanSiswaId || jumlahBayar == null || !metodePembayaran) {
      return NextResponse.json({ error: "Field wajib: tagihanSiswaId, jumlahBayar, metodePembayaran" }, { status: 400 });
    }
    if (!METODE_LIST.includes(metodePembayaran)) {
      return NextResponse.json({ error: `Metode tidak valid: ${metodePembayaran}` }, { status: 400 });
    }
    if (Number(jumlahBayar) <= 0) {
      return NextResponse.json({ error: "Jumlah bayar harus > 0" }, { status: 400 });
    }

    // pegawaiId from session
    const pegawaiId = session.user.pegawaiId ? Number(session.user.pegawaiId) : null;
    if (!pegawaiId) {
      // If user has no pegawai linkage, look up any pegawai in this sekolah as fallback (TU)
      const fallbackPegawai = await db.pegawai.findFirst({
        where: sekolahId ? { sekolahId } : {},
        select: { id: true },
      });
      if (!fallbackPegawai) {
        return NextResponse.json({ error: "Pegawai tidak ditemukan untuk user ini" }, { status: 400 });
      }
    }
    const pegawaiIdFinal = pegawaiId || (await db.pegawai.findFirst({ where: sekolahId ? { sekolahId } : {}, select: { id: true } }))!.id;

    // Verify tagihan exists & belongs to sekolah
    const tagihan = await db.tagihanSiswa.findFirst({
      where: { id: Number(tagihanSiswaId), ...(sekolahId ? { siswa: { sekolahId } } : {}) },
      include: { siswa: true },
    });
    if (!tagihan) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });

    // Generate unique kodeKwitansi: KWT-YYYYMMDD-XXXX
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    let kodeKwitansi = `KWT-${ymd}-${random4()}`;
    for (let attempt = 0; attempt < 10; attempt++) {
      const exists = await db.pembayaran.findUnique({ where: { kodeKwitansi }, select: { id: true } });
      if (!exists) break;
      kodeKwitansi = `KWT-${ymd}-${random4()}`;
    }

    // Use $transaction
    const data = await db.$transaction(async (tx) => {
      const pemb = await tx.pembayaran.create({
        data: {
          tagihanSiswaId: Number(tagihanSiswaId),
          pegawaiId: pegawaiIdFinal,
          tanggalBayar: new Date(),
          jumlahBayar: Number(jumlahBayar),
          metodePembayaran,
          kodeKwitansi,
          keterangan: keterangan || null,
        },
        include: {
          tagihanSiswa: {
            include: {
              siswa: { select: { id: true, nama: true, nis: true } },
              tarifPembayaran: { include: { jenisPembayaran: { select: { id: true, nama: true } } } },
              tahunAjaran: { select: { id: true, nama: true } },
            },
          },
          pegawai: { select: { id: true, nama: true, jabatan: true } },
        },
      });

      // Update tagihan.statusLunas if jumlahBayar >= nominal
      if (Number(jumlahBayar) >= tagihan.nominal) {
        await tx.tagihanSiswa.update({
          where: { id: tagihan.id },
          data: { statusLunas: true },
        });
      }

      return pemb;
    });

    return NextResponse.json(data);
  } catch (e) {
    console.error("POST pembayaran error:", e);
    return NextResponse.json({ error: "Gagal menyimpan pembayaran" }, { status: 500 });
  }
}
