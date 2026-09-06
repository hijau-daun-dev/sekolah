import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(ortuId: number, sekolahId?: number) {
  const o = await db.ortu.findUnique({ where: { id: ortuId }, select: { sekolahId: true } });
  if (!o) return null;
  if (sekolahId && o.sekolahId !== sekolahId) return null;
  return o;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const ortuId = Number(id);
    const owned = await checkOwnership(ortuId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const data = await db.ortu.findUnique({
      where: { id: ortuId },
      include: {
        anakAnak: { include: { siswa: { select: { id: true, nama: true, nis: true, status: true } } } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET ortu/[id] error:", e);
    return NextResponse.json({ error: "Gagal memuat ortu" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const ortuId = Number(id);
    const owned = await checkOwnership(ortuId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { nama, nik, telepon, email, alamat, pekerjaan, fotoUrl, statusAktif } = body;

    const data = await db.ortu.update({
      where: { id: ortuId },
      data: {
        nama: nama ? String(nama).trim() : undefined,
        nik: nik ?? null,
        telepon: telepon ?? null,
        email: email ?? null,
        alamat: alamat ?? null,
        pekerjaan: pekerjaan ?? null,
        fotoUrl: fotoUrl ?? null,
        statusAktif: statusAktif !== undefined ? !!statusAktif : undefined,
      },
      include: { anakAnak: { include: { siswa: { select: { id: true, nama: true } } } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT ortu/[id] error:", e);
    return NextResponse.json({ error: "Gagal mengupdate ortu" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const ortuId = Number(id);
    const owned = await checkOwnership(ortuId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    // Soft delete
    await db.ortu.update({ where: { id: ortuId }, data: { statusAktif: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE ortu/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus ortu" }, { status: 500 });
  }
}
