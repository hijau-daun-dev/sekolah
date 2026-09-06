import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(id: number, sekolahId?: number) {
  const r = await db.jenisPembayaran.findUnique({ where: { id }, select: { sekolahId: true } });
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
    const jid = Number(id);
    const owned = await checkOwnership(jid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { nama, keterangan } = body;
    const data = await db.jenisPembayaran.update({
      where: { id: jid },
      data: { nama: nama ? String(nama).trim() : undefined, keterangan: keterangan ?? null },
      include: { _count: { select: { tarifPembayarans: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT jenis-pembayaran/[id] error:", e);
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
    const jid = Number(id);
    const owned = await checkOwnership(jid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const cnt = await db.tarifPembayaran.count({ where: { jenisPembayaranId: jid } });
    if (cnt > 0) return NextResponse.json({ error: `Tidak dapat dihapus: masih dipakai ${cnt} tarif` }, { status: 400 });

    await db.jenisPembayaran.update({ where: { id: jid }, data: { statusAktif: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE jenis-pembayaran/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
