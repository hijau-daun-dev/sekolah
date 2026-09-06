import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(id: number, sekolahId?: number) {
  const r = await db.komponenNilai.findUnique({ where: { id }, select: { sekolahId: true } });
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
    const { nama, bobot, keterangan } = body;
    const b = bobot != null && bobot !== "" ? Number(bobot) : undefined;
    if (b !== undefined && (Number.isNaN(b) || b < 0 || b > 100)) {
      return NextResponse.json({ error: "Bobot harus 0-100" }, { status: 400 });
    }

    const data = await db.komponenNilai.update({
      where: { id: kid },
      data: {
        nama: nama ? String(nama).trim() : undefined,
        bobot: b !== undefined ? b : undefined,
        keterangan: keterangan ?? null,
      },
      include: { _count: { select: { penilaians: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT komponen-nilai/[id] error:", e);
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

    const cnt = await db.penilaian.count({ where: { komponenNilaiId: kid } });
    if (cnt > 0) return NextResponse.json({ error: `Tidak dapat dihapus: masih dipakai ${cnt} penilaian` }, { status: 400 });

    // Soft delete
    await db.komponenNilai.update({ where: { id: kid }, data: { statusAktif: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE komponen-nilai/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
