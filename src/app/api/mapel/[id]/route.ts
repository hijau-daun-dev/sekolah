import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(id: number, sekolahId?: number) {
  const r = await db.mapel.findUnique({ where: { id }, select: { sekolahId: true } });
  if (!r) return null;
  if (sekolahId && r.sekolahId !== sekolahId) return null;
  return r;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const mid = Number(id);
    const owned = await checkOwnership(mid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { kode, nama, kategoriMapelId, jpPerMinggu, keterangan } = body;
    const data = await db.mapel.update({
      where: { id: mid },
      data: {
        kode: kode ?? null,
        nama: nama ? String(nama).trim() : undefined,
        kategoriMapelId: kategoriMapelId === "" || kategoriMapelId == null ? null : Number(kategoriMapelId),
        jpPerMinggu: jpPerMinggu === "" || jpPerMinggu == null ? null : Number(jpPerMinggu),
        keterangan: keterangan ?? null,
      },
      include: { kategoriMapel: { select: { id: true, nama: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT mapel/[id] error:", e);
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
    const mid = Number(id);
    const owned = await checkOwnership(mid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const cntJ = await db.jadwalPelajaran.count({ where: { mapelId: mid } });
    if (cntJ > 0) return NextResponse.json({ error: `Tidak dapat dihapus: masih dipakai ${cntJ} jadwal` }, { status: 400 });

    // Soft delete
    await db.mapel.update({ where: { id: mid }, data: { statusAktif: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE mapel/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
