import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const url = new URL(req.url);
    const kelasId = url.searchParams.get("kelasId");
    const pegawaiId = url.searchParams.get("pegawaiId");
    const hari = url.searchParams.get("hari");
    const tipeJadwal = url.searchParams.get("tipeJadwal");
    const tahunAjaranId = url.searchParams.get("tahunAjaranId");

    // Filter by sekolahId via kelas.sekolahId OR ekstrakurikuler.sekolahId
    const whereKelas = sekolahId ? { sekolahId } : {};
    const where: Record<string, unknown> = {};
    if (kelasId) where.kelasId = Number(kelasId);
    if (pegawaiId) where.pegawaiId = Number(pegawaiId);
    if (hari) where.hari = hari;
    if (tipeJadwal) where.tipeJadwal = tipeJadwal;
    if (tahunAjaranId) where.tahunAjaranId = Number(tahunAjaranId);

    const data = await db.jadwalPelajaran.findMany({
      where: { ...where, kelas: whereKelas },
      orderBy: [{ hari: "asc" }, { jamKe: "asc" }],
      include: {
        kelas: { select: { id: true, nama: true, tingkat: { select: { id: true, nama: true } } } },
        mapel: { select: { id: true, nama: true, kode: true } },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
        tahunAjaran: { select: { id: true, nama: true, statusAktif: true } },
        ekstrakurikuler: { select: { id: true, nama: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET jadwal error:", e);
    return NextResponse.json({ error: "Gagal memuat jadwal" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const {
      kelasId, mapelId, pegawaiId, tahunAjaranId, hari, jamKe, jamMulai, jamSelesai,
      tipeJadwal, judulKhusus, ekstrakurikulerId,
    } = body;

    const tipe = (tipeJadwal as string) || "pelajaran";
    if (!["pelajaran", "ekskul", "khusus"].includes(tipe)) {
      return NextResponse.json({ error: "tipeJadwal tidak valid (harus pelajaran/ekskul/khusus)" }, { status: 400 });
    }

    if (!tahunAjaranId || !hari || jamKe == null) {
      return NextResponse.json({ error: "Field wajib: tahunAjaranId, hari, jamKe" }, { status: 400 });
    }
    const validHari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    if (!validHari.includes(hari)) {
      return NextResponse.json({ error: "Hari tidak valid" }, { status: 400 });
    }

    // For "pelajaran": kelasId, mapelId, pegawaiId are required and TingkatMapel+GuruMapel must exist
    // For "ekskul": kelasId (optional), ekstrakurikulerId required, pegawaiId optional
    // For "khusus": kelasId required, judulKhusus required, pegawaiId optional

    let verifiedKelasId: number | null = null;
    if (kelasId) {
      const kelas = await db.kelas.findFirst({ where: { id: Number(kelasId), ...(sekolahId ? { sekolahId } : {}) } });
      if (!kelas) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
      verifiedKelasId = kelas.id;
    }

    if (tipe === "pelajaran") {
      if (!verifiedKelasId || !mapelId || !pegawaiId) {
        return NextResponse.json({ error: "Untuk tipe 'pelajaran': kelasId, mapelId, pegawaiId wajib" }, { status: 400 });
      }
      // Verify TingkatMapel exists
      const kelas = await db.kelas.findUnique({ where: { id: verifiedKelasId }, select: { tingkatId: true } });
      if (!kelas) return NextResponse.json({ error: "Kelas tidak valid" }, { status: 400 });
      const tm = await db.tingkatMapel.findUnique({
        where: { tingkatId_mapelId: { tingkatId: kelas.tingkatId, mapelId: Number(mapelId) } },
      });
      if (!tm) return NextResponse.json({ error: "Mapel belum didaftarkan di tingkat ini (TingkatMapel)" }, { status: 400 });
      // Verify GuruMapel exists
      const gm = await db.guruMapel.findUnique({
        where: { pegawaiId_mapelId_tingkatId: { pegawaiId: Number(pegawaiId), mapelId: Number(mapelId), tingkatId: kelas.tingkatId } },
      });
      if (!gm) return NextResponse.json({ error: "Guru belum ditugaskan untuk mapel & tingkat ini (GuruMapel)" }, { status: 400 });
    } else if (tipe === "ekskul") {
      if (!ekstrakurikulerId) return NextResponse.json({ error: "Untuk tipe 'ekskul': ekstrakurikulerId wajib" }, { status: 400 });
      const eks = await db.ekstrakurikuler.findFirst({ where: { id: Number(ekstrakurikulerId), ...(sekolahId ? { sekolahId } : {}) } });
      if (!eks) return NextResponse.json({ error: "Ekstrakurikuler tidak ditemukan" }, { status: 404 });
    } else if (tipe === "khusus") {
      if (!judulKhusus || !String(judulKhusus).trim()) return NextResponse.json({ error: "Untuk tipe 'khusus': judulKhusus wajib" }, { status: 400 });
      if (!verifiedKelasId) return NextResponse.json({ error: "Untuk tipe 'khusus': kelasId wajib" }, { status: 400 });
    }

    const data = await db.jadwalPelajaran.create({
      data: {
        kelasId: verifiedKelasId,
        mapelId: tipe === "pelajaran" ? Number(mapelId) : null,
        pegawaiId: pegawaiId ? Number(pegawaiId) : null,
        tahunAjaranId: Number(tahunAjaranId),
        tipeJadwal: tipe,
        judulKhusus: judulKhusus || null,
        ekstrakurikulerId: tipe === "ekskul" ? Number(ekstrakurikulerId) : null,
        hari,
        jamKe: Number(jamKe),
        jamMulai: jamMulai || null,
        jamSelesai: jamSelesai || null,
      },
      include: {
        kelas: { select: { id: true, nama: true, tingkat: { select: { nama: true } } } },
        mapel: { select: { id: true, nama: true, kode: true } },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
        tahunAjaran: { select: { id: true, nama: true, statusAktif: true } },
        ekstrakurikuler: { select: { id: true, nama: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST jadwal error:", e);
    return NextResponse.json({ error: "Gagal menambah jadwal" }, { status: 500 });
  }
}
