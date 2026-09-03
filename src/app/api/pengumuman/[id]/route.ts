import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const existing = await db.pengumuman.findFirst({
      where: { id: Number(id), ...(sekolahId ? { sekolahId } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { judul, isi, target } = body;

    const validTarget = ["Semua", "Siswa", "Ortu", "Guru"];
    if (target && !validTarget.includes(target)) {
      return NextResponse.json({ error: "Target tidak valid" }, { status: 400 });
    }

    const data = await db.pengumuman.update({
      where: { id: Number(id) },
      data: {
        judul: judul != null ? String(judul).trim() : undefined,
        isi: isi != null ? String(isi) : undefined,
        target: target || undefined,
      },
      include: { pegawai: { select: { id: true, nama: true, jabatan: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT pengumuman error:", e);
    return NextResponse.json({ error: "Gagal memperbarui pengumuman" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const existing = await db.pengumuman.findFirst({
      where: { id: Number(id), ...(sekolahId ? { sekolahId } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 });

    await db.pengumuman.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE pengumuman error:", e);
    return NextResponse.json({ error: "Gagal menghapus pengumuman" }, { status: 500 });
  }
}
