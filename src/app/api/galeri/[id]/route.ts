import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const existing = await db.galeriBerita.findFirst({
      where: { id: Number(id), ...(sekolahId ? { sekolahId } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { judul, konten, gambarUrl, kategori } = body;

    const validKat = ["Berita", "Galeri", "Pengumuman"];
    if (kategori && !validKat.includes(kategori)) {
      return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
    }

    const data = await db.galeriBerita.update({
      where: { id: Number(id) },
      data: {
        judul: judul != null ? String(judul).trim() : undefined,
        konten: konten != null ? String(konten) : undefined,
        gambarUrl: gambarUrl !== undefined ? (gambarUrl || null) : undefined,
        kategori: kategori || undefined,
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT galeri error:", e);
    return NextResponse.json({ error: "Gagal memperbarui galeri" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const existing = await db.galeriBerita.findFirst({
      where: { id: Number(id), ...(sekolahId ? { sekolahId } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });

    await db.galeriBerita.update({ where: { id: Number(id) }, data: { statusAktif: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE galeri error:", e);
    return NextResponse.json({ error: "Gagal menghapus galeri" }, { status: 500 });
  }
}
