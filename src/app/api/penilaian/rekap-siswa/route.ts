import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";
import { getAllowedSiswaIds, getCurrentSekolahId } from "@/lib/auth-helpers";

/**
 * GET /api/penilaian/rekap-siswa?siswaId=X&semesterId=Y
 * Returns rekap nilai for a single siswa across all their mapels.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sekolahId = await getCurrentSekolahId().catch(() => null);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) {
      return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    }

    const allowedSiswaIds = await getAllowedSiswaIds().catch(() => null);

    const { searchParams } = new URL(req.url);
    const siswaId = searchParams.get("siswaId");
    const semesterId = searchParams.get("semesterId");
    if (!siswaId) return NextResponse.json({ error: "siswaId wajib" }, { status: 400 });

    // Verify siswa
    const siswa = await db.siswa.findFirst({
      where: { id: Number(siswaId), ...(sekolahId ? { sekolahId } : {}) },
      select: { id: true, nama: true, nis: true, nisn: true, kelasSiswas: { include: { kelas: { select: { id: true, nama: true, tingkatId: true, tingkat: { select: { nama: true } } } } } } },
    });
    if (!siswa) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });

    // Per-siswa isolation
    if (allowedSiswaIds && allowedSiswaIds.length >= 0 && !allowedSiswaIds.includes(siswa.id)) {
      return NextResponse.json({ error: "Tidak diizinkan mengakses siswa ini" }, { status: 403 });
    }

    // Find the kelas siswa is currently in (most recent kelasSiswa)
    const kelasAktif = siswa.kelasSiswas[siswa.kelasSiswas.length - 1]?.kelas;
    if (!kelasAktif) {
      return NextResponse.json({ siswa, kelas: null, semesterId: semesterId ? Number(semesterId) : null, nilaiPerMapel: [], rataRata: null });
    }

    // Get tingkat mapels for the kelas's tingkat
    const tingkatMapels = await db.tingkatMapel.findMany({
      where: { tingkatId: kelasAktif.tingkatId, statusAktif: true },
      include: { mapel: { select: { id: true, nama: true, kode: true } } },
      orderBy: { mapel: { nama: "asc" } },
    });

    // Get komponen list
    const komponenList = await db.komponenNilai.findMany({
      where: sekolahId ? { sekolahId } : {},
      orderBy: [{ bobot: "desc" }, { nama: "asc" }],
    });

    // Get penilaian
    const where: Record<string, unknown> = { siswaId: siswa.id };
    if (semesterId) where.semesterId = Number(semesterId);
    const penilaians = await db.penilaian.findMany({
      where,
      include: {
        mapel: { select: { id: true, nama: true, kode: true } },
        komponenNilai: { select: { id: true, nama: true, bobot: true } },
      },
    });

    // Group by mapel+komponen
    const grouped: Record<number, Record<number, number>> = {}; // mapelId → komponenNilaiId → nilai
    penilaians.forEach((p) => {
      if (!grouped[p.mapelId]) grouped[p.mapelId] = {};
      grouped[p.mapelId][p.komponenNilaiId] = p.nilai;
    });

    let totalNilai = 0;
    let mapelCount = 0;
    const nilaiPerMapel = tingkatMapels.map((tm) => {
      const mapelData = grouped[tm.mapelId] || {};
      const komponen = komponenList.map((k) => ({
        komponenNilaiId: k.id,
        nama: k.nama,
        bobot: k.bobot,
        nilai: mapelData[k.id] != null ? mapelData[k.id] : null,
      }));
      const totalBobot = komponen.reduce((s, c) => s + (c.nilai != null ? c.bobot : 0), 0);
      const weighted = komponen.reduce((s, c) => s + (c.nilai != null ? c.nilai * c.bobot : 0), 0);
      const nilaiAkhir = totalBobot > 0 ? weighted / totalBobot : null;
      if (nilaiAkhir != null) {
        totalNilai += nilaiAkhir;
        mapelCount++;
      }
      return {
        mapelId: tm.mapelId,
        mapelNama: tm.mapel.nama,
        mapelKode: tm.mapel.kode,
        nilaiAkhir: nilaiAkhir != null ? Math.round(nilaiAkhir * 100) / 100 : null,
        komponen,
      };
    });
    const rataRata = mapelCount > 0 ? Math.round((totalNilai / mapelCount) * 100) / 100 : null;

    return NextResponse.json({
      siswa: { id: siswa.id, nama: siswa.nama, nis: siswa.nis, nisn: siswa.nisn },
      kelas: kelasAktif,
      semesterId: semesterId ? Number(semesterId) : null,
      komponenList,
      nilaiPerMapel,
      rataRata,
    });
  } catch (e) {
    console.error("GET penilaian/rekap-siswa error:", e);
    return NextResponse.json({ error: "Gagal memuat rekap siswa" }, { status: 500 });
  }
}
