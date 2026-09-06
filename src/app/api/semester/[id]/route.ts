import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(id: number, sekolahId?: number) {
  const r = await db.semester.findUnique({ where: { id }, select: { sekolahId: true } });
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
    const semId = Number(id);
    const owned = await checkOwnership(semId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { nama, statusAktif, tanggalMulai, tanggalSelesai } = body;
    const isActive = statusAktif === true || statusAktif === "true";

    const updated = await db.$transaction(async (tx) => {
      if (isActive) {
        await tx.semester.updateMany({ where: { sekolahId: owned.sekolahId, statusAktif: true, NOT: { id: semId } }, data: { statusAktif: false } });
      }
      return tx.semester.update({
        where: { id: semId },
        data: {
          nama: nama ? String(nama).trim() : undefined,
          statusAktif: typeof statusAktif === "boolean" ? isActive : undefined,
          tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : tanggalMulai === "" ? null : undefined,
          tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : tanggalSelesai === "" ? null : undefined,
        },
        include: { tahunAjaran: { select: { id: true, nama: true } } },
      });
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PUT semester/[id] error:", e);
    return NextResponse.json({ error: "Gagal mengupdate semester" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const semId = Number(id);
    const owned = await checkOwnership(semId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    await db.semester.delete({ where: { id: semId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE semester/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus semester" }, { status: 500 });
  }
}
