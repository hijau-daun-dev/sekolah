import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(id: number, sekolahId?: number) {
  const r = await db.kategoriMapel.findUnique({ where: { id }, select: { sekolahId: true } });
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
    const kid = Number(id);
    const owned = await checkOwnership(kid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    const body = await req.json();
    const { nama, keterangan } = body;
    const data = await db.kategoriMapel.update({
      where: { id: kid },
      data: { nama: nama ? String(nama).trim() : undefined, keterangan: keterangan ?? null },
      include: { _count: { select: { mapels: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT kategori-mapel/[id] error:", e);
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
    const kid = Number(id);
    const owned = await checkOwnership(kid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const cnt = await db.mapel.count({ where: { kategoriMapelId: kid } });
    if (cnt > 0) return NextResponse.json({ error: `Tidak dapat dihapus: masih dipakai ${cnt} mapel` }, { status: 400 });

    // Soft delete
    await db.kategoriMapel.update({ where: { id: kid }, data: { statusAktif: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE kategori-mapel/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
