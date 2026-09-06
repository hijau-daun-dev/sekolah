import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(id: number, sekolahId?: number) {
  const r = await db.tarifPembayaran.findUnique({ where: { id }, select: { sekolahId: true } });
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
    const tid = Number(id);
    const owned = await checkOwnership(tid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { jenisPembayaranId, tahunAjaranId, tingkatId, nominal, frekuensi, keterangan } = body;
    const n = nominal != null && nominal !== "" ? Number(nominal) : undefined;
    if (n !== undefined && (Number.isNaN(n) || n < 0)) return NextResponse.json({ error: "nominal tidak valid" }, { status: 400 });

    const data = await db.tarifPembayaran.update({
      where: { id: tid },
      data: {
        jenisPembayaranId: jenisPembayaranId ? Number(jenisPembayaranId) : undefined,
        tahunAjaranId: tahunAjaranId ? Number(tahunAjaranId) : undefined,
        tingkatId: tingkatId === "" || tingkatId == null ? null : Number(tingkatId),
        nominal: n,
        frekuensi: frekuensi ?? undefined,
        keterangan: keterangan ?? null,
      },
      include: {
        jenisPembayaran: { select: { id: true, nama: true } },
        tahunAjaran: { select: { id: true, nama: true } },
        tingkat: { select: { id: true, nama: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT tarif-pembayaran/[id] error:", e);
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
    const tid = Number(id);
    const owned = await checkOwnership(tid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const cnt = await db.tagihanSiswa.count({ where: { tarifPembayaranId: tid } });
    if (cnt > 0) return NextResponse.json({ error: `Tidak dapat dihapus: masih dipakai ${cnt} tagihan` }, { status: 400 });

    await db.tarifPembayaran.delete({ where: { id: tid } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE tarif-pembayaran/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
