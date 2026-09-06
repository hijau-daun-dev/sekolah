import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(id: number, sekolahId?: number) {
  const r = await db.guruMapel.findUnique({
    where: { id },
    select: { pegawai: { select: { sekolahId: true } }, tingkat: { select: { sekolahId: true } } },
  });
  if (!r) return null;
  if (sekolahId && r.pegawai.sekolahId !== sekolahId) return null;
  return r;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const gmid = Number(id);
    const owned = await checkOwnership(gmid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { pegawaiId, mapelId, tingkatId, statusAktif } = body;

    if (tingkatId) {
      const tingkat = await db.tingkat.findUnique({ where: { id: Number(tingkatId) }, select: { sekolahId: true } });
      if (!tingkat) return NextResponse.json({ error: "Tingkat tidak ditemukan" }, { status: 404 });
      if (sekolahId && tingkat.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const data = await db.guruMapel.update({
      where: { id: gmid },
      data: {
        pegawaiId: pegawaiId != null ? Number(pegawaiId) : undefined,
        mapelId: mapelId != null ? Number(mapelId) : undefined,
        tingkatId: tingkatId != null ? Number(tingkatId) : undefined,
        statusAktif: statusAktif !== undefined ? !!statusAktif : undefined,
      },
      include: {
        pegawai: { select: { id: true, nama: true, jabatan: true } },
        mapel: { select: { id: true, nama: true, kode: true } },
        tingkat: { select: { id: true, nama: true, jenjang: true, urutan: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT guru-mapel/[id] error:", e);
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
    const gmid = Number(id);
    const owned = await checkOwnership(gmid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    // Soft delete
    await db.guruMapel.update({ where: { id: gmid }, data: { statusAktif: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE guru-mapel/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
