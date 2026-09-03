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
    const kelasId = url.searchParams.get("kelasId");
    const pegawaiId = url.searchParams.get("pegawaiId");
    const hari = url.searchParams.get("hari");

    // Filter by sekolahId via kelas.sekolahId
    const whereKelas = sekolahId ? { sekolahId } : {};
    const where: Record<string, unknown> = {};
    if (kelasId) where.kelasId = Number(kelasId);
    if (pegawaiId) where.pegawaiId = Number(pegawaiId);
    if (hari) where.hari = hari;

    const data = await db.jadwalPelajaran.findMany({
      where: { ...where, kelas: whereKelas },
      orderBy: [{ hari: "asc" }, { jamKe: "asc" }],
      include: {
        kelas: { select: { id: true, nama: true, tingkat: { select: { nama: true } } } },
        mapel: { select: { id: true, nama: true, kode: true } },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
        tahunAjaran: { select: { id: true, nama: true, statusAktif: true } },
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
    const { kelasId, mapelId, pegawaiId, tahunAjaranId, hari, jamKe, jamMulai, jamSelesai } = body;

    if (!kelasId || !mapelId || !pegawaiId || !tahunAjaranId || !hari || jamKe == null) {
      return NextResponse.json({ error: "Field wajib: kelasId, mapelId, pegawaiId, tahunAjaranId, hari, jamKe" }, { status: 400 });
    }
    const validHari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    if (!validHari.includes(hari)) {
      return NextResponse.json({ error: "Hari tidak valid" }, { status: 400 });
    }

    // Verify kelas belongs to sekolah
    const kelas = await db.kelas.findFirst({ where: { id: Number(kelasId), ...(sekolahId ? { sekolahId } : {}) } });
    if (!kelas) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });

    const data = await db.jadwalPelajaran.create({
      data: {
        kelasId: Number(kelasId),
        mapelId: Number(mapelId),
        pegawaiId: Number(pegawaiId),
        tahunAjaranId: Number(tahunAjaranId),
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
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST jadwal error:", e);
    return NextResponse.json({ error: "Gagal menambah jadwal" }, { status: 500 });
  }
}
