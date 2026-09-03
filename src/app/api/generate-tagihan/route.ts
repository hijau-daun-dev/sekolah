import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const BULAN_LIST = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function getEndOfMonth(year: number, monthIdx: number): Date {
  // monthIdx: 0-11
  return new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
}

function parseTahunAjaranYear(nama?: string | null): { startYear: number; endYear: number } | null {
  if (!nama) return null;
  // Format "2025/2026" or "2025-2026"
  const m = nama.match(/(\d{4})\s*[\/-]\s*(\d{4})/);
  if (m) return { startYear: Number(m[1]), endYear: Number(m[2]) };
  // Single year fallback
  const m2 = nama.match(/(\d{4})/);
  if (m2) {
    const y = Number(m2[1]);
    return { startYear: y, endYear: y + 1 };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { tahunAjaranId, bulanTagihan, jenisPembayaranId } = body;
    if (!tahunAjaranId || !bulanTagihan) {
      return NextResponse.json({ error: "tahunAjaranId dan bulanTagihan wajib diisi" }, { status: 400 });
    }
    if (!BULAN_LIST.includes(bulanTagihan)) {
      return NextResponse.json({ error: `bulanTagihan tidak valid. Pilihan: ${BULAN_LIST.join(", ")}` }, { status: 400 });
    }

    const bulanIdx = BULAN_LIST.indexOf(bulanTagihan);

    // 1. Get tahun ajaran
    const tahunAjaran = await db.tahunAjaran.findFirst({
      where: { id: Number(tahunAjaranId), ...(sekolahId ? { sekolahId } : {}) },
    });
    if (!tahunAjaran) return NextResponse.json({ error: "Tahun ajaran tidak ditemukan" }, { status: 404 });

    const parsedYear = parseTahunAjaranYear(tahunAjaran.nama);
    // If bulan Jul-Dec -> use startYear, else (Jan-Jun) -> use endYear. Fallback current year.
    const currentYear = new Date().getFullYear();
    const jatuhTempoYear = parsedYear
      ? (bulanIdx >= 6 ? parsedYear.startYear : parsedYear.endYear)
      : currentYear;
    const tanggalJatuhTempo = getEndOfMonth(jatuhTempoYear, bulanIdx);

    // 2. Find all siswa aktif for sekolah
    const siswaList = await db.siswa.findMany({
      where: { status: "Aktif", ...(sekolahId ? { sekolahId } : {}) },
      include: {
        kelasSiswas: {
          where: { tahunAjaranId: Number(tahunAjaranId) },
          include: { kelas: { select: { id: true, nama: true, tingkatId: true } } },
          take: 1,
        },
      },
    });

    if (siswaList.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, total: 0, message: "Tidak ada siswa aktif" });
    }

    // 3. Find all tarif for tahun ajaran (filter by jenis if provided)
    const tarifWhere: Record<string, unknown> = { tahunAjaranId: Number(tahunAjaranId) };
    if (sekolahId) tarifWhere.sekolahId = sekolahId;
    if (jenisPembayaranId) tarifWhere.jenisPembayaranId = Number(jenisPembayaranId);

    const tarifList = await db.tarifPembayaran.findMany({
      where: tarifWhere,
      include: { jenisPembayaran: { select: { id: true, nama: true } } },
    });

    if (tarifList.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, total: 0, message: "Tidak ada tarif pembayaran" });
    }

    // 4. For each siswa, find matching tarif by their kelas.tingkatId
    // Build a map of (siswaId, tarifId) -> existing tagihan for this bulan
    const siswaIds = siswaList.map((s) => s.id);
    const tarifIds = tarifList.map((t) => t.id);

    const existing = await db.tagihanSiswa.findMany({
      where: {
        siswaId: { in: siswaIds },
        tarifPembayaranId: { in: tarifIds },
        bulanTagihan,
      },
      select: { siswaId: true, tarifPembayaranId: true },
    });
    const existingSet = new Set(existing.map((e) => `${e.siswaId}:${e.tarifPembayaranId}`));

    // 5. Build create list
    const toCreate: Array<{
      siswaId: number; tarifPembayaranId: number; tahunAjaranId: number;
      bulanTagihan: string; nominal: number; statusLunas: boolean; tanggalJatuhTempo: Date;
    }> = [];

    for (const s of siswaList) {
      const kelasSiswa = s.kelasSiswas[0];
      if (!kelasSiswa) continue; // siswa not in any kelas for this tahun ajaran
      const tingkatId = kelasSiswa.kelas.tingkatId;

      for (const t of tarifList) {
        // Only match tarif where tingkatId == null (umum) or equals siswa's kelas tingkat
        if (t.tingkatId != null && t.tingkatId !== tingkatId) continue;

        const key = `${s.id}:${t.id}`;
        if (existingSet.has(key)) continue;

        // Skip if frekuensi "Sekali" and there's already any tagihan for this siswa+tarif (regardless of bulan)
        if (t.frekuensi === "Sekali") {
          const anyExisting = await db.tagihanSiswa.findFirst({
            where: { siswaId: s.id, tarifPembayaranId: t.id },
            select: { id: true },
          });
          if (anyExisting) continue;
        }

        toCreate.push({
          siswaId: s.id,
          tarifPembayaranId: t.id,
          tahunAjaranId: Number(tahunAjaranId),
          bulanTagihan,
          nominal: t.nominal,
          statusLunas: false,
          tanggalJatuhTempo,
        });
      }
    }

    if (toCreate.length === 0) {
      return NextResponse.json({
        created: 0,
        skipped: siswaList.length * tarifList.length,
        total: 0,
        message: "Semua tagihan sudah ada",
      });
    }

    // 6. Bulk create in transaction
    await db.$transaction(
      toCreate.map((t) =>
        db.tagihanSiswa.create({
          data: t,
        })
      )
    );

    return NextResponse.json({
      created: toCreate.length,
      skipped: siswaList.length * tarifList.length - toCreate.length,
      total: toCreate.length,
      message: `Berhasil generate ${toCreate.length} tagihan`,
    });
  } catch (e) {
    console.error("POST generate-tagihan error:", e);
    return NextResponse.json({ error: "Gagal generate tagihan" }, { status: 500 });
  }
}
