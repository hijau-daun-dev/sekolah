import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

/**
 * GET /api/jadwal/options?kelasId=X
 * Returns:
 *  - kelas: kelas detail (id, nama)
 *  - tingkat: tingkat detail (id, nama, jenjang)
 *  - availableMapels: mapels available for the kelas's tingkat (via TingkatMapel)
 *  - availableGurusByMapel: gurus grouped by mapelId (via GuruMapel at this tingkat)
 *  - availableEkskul: all active ekstrakurikulers in sekolah
 *  - allPegawai: all active pegawais (for khusus/ekskul pembina picker) — bonus field
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const kelasId = searchParams.get("kelasId");

    if (!kelasId) return NextResponse.json({ error: "kelasId wajib" }, { status: 400 });

    const kelas = await db.kelas.findFirst({
      where: { id: Number(kelasId), ...(sekolahId ? { sekolahId } : {}) },
      select: { id: true, nama: true, tingkatId: true, tingkat: { select: { id: true, nama: true, jenjang: true, urutan: true } } },
    });
    if (!kelas) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });

    // Mapels available for this tingkat (via TingkatMapel)
    const tingkatMapels = await db.tingkatMapel.findMany({
      where: { tingkatId: kelas.tingkatId, statusAktif: true },
      include: { mapel: { select: { id: true, nama: true, kode: true } } },
      orderBy: { mapel: { nama: "asc" } },
    });
    const availableMapels = tingkatMapels.map((tm) => ({
      id: tm.mapel.id,
      nama: tm.mapel.nama,
      kode: tm.mapel.kode,
      jpPerMinggu: tm.jpPerMinggu,
    }));

    // Gurus available per mapel at this tingkat (via GuruMapel)
    const guruMapels = await db.guruMapel.findMany({
      where: { tingkatId: kelas.tingkatId, statusAktif: true },
      include: {
        pegawai: { select: { id: true, nama: true, jabatan: true } },
        mapel: { select: { id: true, nama: true } },
      },
      orderBy: { pegawai: { nama: "asc" } },
    });
    const availableGurusByMapel: Record<number, { id: number; nama: string; jabatan: string | null }[]> = {};
    guruMapels.forEach((gm) => {
      const mid = gm.mapel.id;
      if (!availableGurusByMapel[mid]) availableGurusByMapel[mid] = [];
      availableGurusByMapel[mid].push({ id: gm.pegawai.id, nama: gm.pegawai.nama, jabatan: gm.pegawai.jabatan });
    });

    // All active ekstrakurikulers in sekolah
    const availableEkskul = await db.ekstrakurikuler.findMany({
      where: { statusAktif: true, ...(sekolahId ? { sekolahId } : {}) },
      select: { id: true, nama: true, pembinaId: true, pembina: { select: { nama: true } } },
      orderBy: { nama: "asc" },
    });

    // All pegawais (for khusus/ekskul pembina picker) — bonus field
    const allPegawai = await db.pegawai.findMany({
      where: { status: "Aktif", ...(sekolahId ? { sekolahId } : {}) },
      select: { id: true, nama: true, jabatan: true },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json({
      kelas: { id: kelas.id, nama: kelas.nama },
      tingkat: kelas.tingkat,
      availableMapels,
      availableGurusByMapel,
      availableEkskul,
      allPegawai,
    });
  } catch (e) {
    console.error("GET jadwal/options error:", e);
    return NextResponse.json({ error: "Gagal memuat options" }, { status: 500 });
  }
}
