import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(id: number, sekolahId?: number) {
  const r = await db.ekstrakurikuler.findUnique({ where: { id }, select: { sekolahId: true } });
  if (!r) return null;
  if (sekolahId && r.sekolahId !== sekolahId) return null;
  return r;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const eksId = Number(id);
    const owned = await checkOwnership(eksId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const data = await db.ekstrakurikuler.findUnique({
      where: { id: eksId },
      include: {
        pembina: { select: { id: true, nama: true, jabatan: true } },
        pesertas: {
          include: { siswa: { select: { id: true, nama: true, nis: true, status: true } } },
          orderBy: { siswa: { nama: "asc" } },
        },
        _count: { select: { pesertas: true, jadwals: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET ekstrakurikuler/[id] error:", e);
    return NextResponse.json({ error: "Gagal memuat" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const eksId = Number(id);
    const owned = await checkOwnership(eksId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { nama, deskripsi, pembinaId, hari, jamMulai, jamSelesai, tempat, statusAktif } = body;

    if (pembinaId) {
      const pembina = await db.pegawai.findUnique({ where: { id: Number(pembinaId) }, select: { sekolahId: true } });
      if (!pembina) return NextResponse.json({ error: "Pembina tidak ditemukan" }, { status: 404 });
      if (sekolahId && pembina.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const data = await db.ekstrakurikuler.update({
      where: { id: eksId },
      data: {
        nama: nama ? String(nama).trim() : undefined,
        deskripsi: deskripsi === undefined ? undefined : (deskripsi || null),
        pembinaId: pembinaId === undefined ? undefined : (pembinaId ? Number(pembinaId) : null),
        hari: hari === undefined ? undefined : (hari || null),
        jamMulai: jamMulai === undefined ? undefined : (jamMulai || null),
        jamSelesai: jamSelesai === undefined ? undefined : (jamSelesai || null),
        tempat: tempat === undefined ? undefined : (tempat || null),
        statusAktif: statusAktif !== undefined ? !!statusAktif : undefined,
      },
      include: {
        pembina: { select: { id: true, nama: true, jabatan: true } },
        _count: { select: { pesertas: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT ekstrakurikuler/[id] error:", e);
    return NextResponse.json({ error: "Gagal mengupdate" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const eksId = Number(id);
    const owned = await checkOwnership(eksId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    // Soft delete
    await db.ekstrakurikuler.update({ where: { id: eksId }, data: { statusAktif: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE ekstrakurikuler/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
