import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";
import { getAllowedSiswaIds } from "@/lib/auth-helpers";
import { pembayaranSchema } from "@/lib/schemas";

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

    // Build tagihanSiswa filter
    const tagihanFilter: Record<string, unknown> = {};
    if (sekolahId) tagihanFilter.siswa = { sekolahId };
    if (siswaId) tagihanFilter.siswaId = Number(siswaId);

    // Ortu/Siswa data isolation
    const allowedSiswaIds = await getAllowedSiswaIds();
    if (allowedSiswaIds !== null) {
      if (allowedSiswaIds.length === 0) return NextResponse.json([]);
      // Merge with existing siswa filter
      const existingSiswaFilter = (tagihanFilter.siswa as Record<string, unknown> | undefined) || {};
      tagihanFilter.siswa = { ...existingSiswaFilter, id: { in: allowedSiswaIds } };
    }
    if (Object.keys(tagihanFilter).length > 0) where.tagihanSiswa = tagihanFilter;

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
    // Only KEUANGAN/SUPER_ADMIN can input pembayaran (PRD Alur 3)
    const allowed = ["SUPER_ADMIN", "KEUANGAN"];
    if (!allowed.includes(session.user.role)) {
      return NextResponse.json({ error: "Hanya Admin Keuangan/Super Admin yang dapat input pembayaran" }, { status: 403 });
    }
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    // Zod validation (PRD §3: strict input validation)
    const parsed = pembayaranSchema.safeParse({
      tagihanSiswaId: Number(body.tagihanSiswaId),
      jumlahBayar: Number(body.jumlahBayar),
      metodePembayaran: body.metodePembayaran,
      keterangan: body.keterangan || null,
    });
    if (!parsed.success) {
      return NextResponse.json({
        error: "Validasi gagal",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      }, { status: 400 });
    }
    const { tagihanSiswaId, jumlahBayar: jumlahBayarNum, metodePembayaran, keterangan } = parsed.data;

    // pegawaiId from session
    const pegawaiId = session.user.pegawaiId ? Number(session.user.pegawaiId) : null;
    let pegawaiIdFinal = pegawaiId;
    if (!pegawaiIdFinal) {
      // Fallback: any pegawai in this sekolah
      const fallbackPegawai = await db.pegawai.findFirst({
        where: sekolahId ? { sekolahId } : {},
        select: { id: true },
      });
      if (!fallbackPegawai) {
        return NextResponse.json({ error: "Pegawai tidak ditemukan untuk user ini" }, { status: 400 });
      }
      pegawaiIdFinal = fallbackPegawai.id;
    }

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
          pegawaiId: pegawaiIdFinal!,
          tanggalBayar: new Date(),
          jumlahBayar: jumlahBayarNum,
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
      if (jumlahBayarNum >= tagihan.nominal) {
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
