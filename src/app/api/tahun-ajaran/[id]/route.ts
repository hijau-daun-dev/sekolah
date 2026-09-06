import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(id: number, sekolahId?: number) {
  const r = await db.tahunAjaran.findUnique({ where: { id }, select: { sekolahId: true } });
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
    const owned = await checkOwnership(Number(id), sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    const data = await db.tahunAjaran.findUnique({
      where: { id: Number(id) },
      include: { semesters: true, _count: { select: { kelases: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET tahun-ajaran/[id] error:", e);
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
    const taId = Number(id);
    const owned = await checkOwnership(taId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { nama, tanggalMulai, tanggalSelesai, statusAktif } = body;
    const isActive = statusAktif === true || statusAktif === "true";

    const updated = await db.$transaction(async (tx) => {
      if (isActive) {
        await tx.tahunAjaran.updateMany({ where: { sekolahId: owned.sekolahId, statusAktif: true, NOT: { id: taId } }, data: { statusAktif: false } });
      }
      return tx.tahunAjaran.update({
        where: { id: taId },
        data: {
          nama: nama ? String(nama).trim() : undefined,
          tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : tanggalMulai === "" ? null : undefined,
          tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : tanggalSelesai === "" ? null : undefined,
          statusAktif: typeof statusAktif === "boolean" ? isActive : undefined,
        },
        include: { _count: { select: { semesters: true, kelases: true } } },
      });
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PUT tahun-ajaran/[id] error:", e);
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
    const taId = Number(id);
    const owned = await checkOwnership(taId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const countS = await db.semester.count({ where: { tahunAjaranId: taId } });
    const countK = await db.kelas.count({ where: { tahunAjaranId: taId } });
    if (countS > 0 || countK > 0) {
      return NextResponse.json({ error: `Tidak dapat dihapus: masih memiliki ${countS} semester & ${countK} kelas` }, { status: 400 });
    }

    await db.tahunAjaran.delete({ where: { id: taId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE tahun-ajaran/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
