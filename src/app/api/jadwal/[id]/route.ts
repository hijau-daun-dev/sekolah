import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { kelasId, mapelId, pegawaiId, tahunAjaranId, hari, jamKe, jamMulai, jamSelesai } = body;

    const existing = await db.jadwalPelajaran.findFirst({
      where: { id: Number(id), ...(sekolahId ? { kelas: { sekolahId } } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });

    const validHari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    if (hari && !validHari.includes(hari)) {
      return NextResponse.json({ error: "Hari tidak valid" }, { status: 400 });
    }

    const data = await db.jadwalPelajaran.update({
      where: { id: Number(id) },
      data: {
        kelasId: kelasId != null ? Number(kelasId) : undefined,
        mapelId: mapelId != null ? Number(mapelId) : undefined,
        pegawaiId: pegawaiId != null ? Number(pegawaiId) : undefined,
        tahunAjaranId: tahunAjaranId != null ? Number(tahunAjaranId) : undefined,
        hari: hari || undefined,
        jamKe: jamKe != null ? Number(jamKe) : undefined,
        jamMulai: jamMulai !== undefined ? (jamMulai || null) : undefined,
        jamSelesai: jamSelesai !== undefined ? (jamSelesai || null) : undefined,
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
    console.error("PUT jadwal error:", e);
    return NextResponse.json({ error: "Gagal memperbarui jadwal" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const existing = await db.jadwalPelajaran.findFirst({
      where: { id: Number(id), ...(sekolahId ? { kelas: { sekolahId } } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });

    await db.jadwalPelajaran.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE jadwal error:", e);
    return NextResponse.json({ error: "Gagal menghapus jadwal" }, { status: 500 });
  }
}
