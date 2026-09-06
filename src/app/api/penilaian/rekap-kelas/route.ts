import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";
import { getAllowedSiswaIds, getCurrentSekolahId } from "@/lib/auth-helpers";

/**
 * GET /api/penilaian/rekap-kelas?kelasId=X&semesterId=Y
 * Returns rekap nilai per siswa: { siswaId, nama, nis, nilaiPerMapel: [{mapelId, mapelNama, nilaiAkhir, komponen: [...]}], rataRata }
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
    const kelasId = searchParams.get("kelasId");
    const semesterId = searchParams.get("semesterId");
    if (!kelasId) return NextResponse.json({ error: "kelasId wajib" }, { status: 400 });

    // Verify kelas
    const kelas = await db.kelas.findFirst({
      where: { id: Number(kelasId), ...(sekolahId ? { sekolahId } : {}) },
      select: { id: true, nama: true, tingkatId: true, tingkat: { select: { nama: true } }, tahunAjaranId: true, tahunAjaran: { select: { nama: true } } },
    });
    if (!kelas) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });

    // Get students in the kelas
    const kelasSiswas = await db.kelasSiswa.findMany({
      where: { kelasId: kelas.id },
      include: { siswa: { select: { id: true, nama: true, nis: true } } },
      orderBy: { siswa: { nama: "asc" } },
    });
    let siswaList = kelasSiswas.map((ks) => ks.siswa);
    if (allowedSiswaIds && allowedSiswaIds.length >= 0) {
      siswaList = siswaList.filter((s) => allowedSiswaIds.includes(s.id));
    }

    const siswaIds = siswaList.map((s) => s.id);

    // Get all penilaian for these siswa in the semester
    const where: Record<string, unknown> = { siswaId: { in: siswaIds } };
    if (semesterId) where.semesterId = Number(semesterId);
    const penilaians = await db.penilaian.findMany({
      where,
      include: {
        mapel: { select: { id: true, nama: true, kode: true } },
        komponenNilai: { select: { id: true, nama: true, bobot: true } },
      },
    });

    // Get komponen list (for sekolah)
    const komponenList = await db.komponenNilai.findMany({
      where: sekolahId ? { sekolahId } : {},
      orderBy: [{ bobot: "desc" }, { nama: "asc" }],
    });

    // Get tingkat mapels for ordering
    const tingkatMapels = await db.tingkatMapel.findMany({
      where: { tingkatId: kelas.tingkatId, statusAktif: true },
      include: { mapel: { select: { id: true, nama: true, kode: true } } },
      orderBy: { mapel: { nama: "asc" } },
    });

    // Group by siswa then mapel then komponen
    const bySiswa: Record<number, {
      siswaId: number; nama: string; nis?: string | null;
      nilaiPerMapel: {
        mapelId: number; mapelNama: string; mapelKode?: string | null;
        nilaiAkhir: number | null;
        komponen: { komponenNilaiId: number; nama: string; bobot: number; nilai: number | null }[];
      }[];
      rataRata: number | null;
    }> = {};
    siswaList.forEach((s) => {
      bySiswa[s.id] = { siswaId: s.id, nama: s.nama, nis: s.nis, nilaiPerMapel: [], rataRata: null };
    });

    // Group penilaian by siswa+mapel
    const grouped: Record<string, Record<number, Record<number, number>>> = {}; // siswaId → mapelId → komponenNilaiId → nilai
    penilaians.forEach((p) => {
      if (!grouped[p.siswaId]) grouped[p.siswaId] = {};
      if (!grouped[p.siswaId][p.mapelId]) grouped[p.siswaId][p.mapelId] = {};
      grouped[p.siswaId][p.mapelId][p.komponenNilaiId] = p.nilai;
    });

    // Build per-siswa rekap
    Object.values(bySiswa).forEach((rec) => {
      const siswaData = grouped[rec.siswaId] || {};
      let totalNilai = 0;
      let mapelCount = 0;
      rec.nilaiPerMapel = tingkatMapels.map((tm) => {
        const mapelData = siswaData[tm.mapelId] || {};
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
      rec.rataRata = mapelCount > 0 ? Math.round((totalNilai / mapelCount) * 100) / 100 : null;
    });

    return NextResponse.json({
      kelas: { id: kelas.id, nama: kelas.nama, tingkat: kelas.tingkat, tahunAjaran: kelas.tahunAjaran },
      semesterId: semesterId ? Number(semesterId) : null,
      komponenList,
      siswa: Object.values(bySiswa),
    });
  } catch (e) {
    console.error("GET penilaian/rekap-kelas error:", e);
    return NextResponse.json({ error: "Gagal memuat rekap kelas" }, { status: 500 });
  }
}
