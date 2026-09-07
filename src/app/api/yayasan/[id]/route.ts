import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const yayasan = await db.yayasan.findUnique({
      where: { id: Number(id) },
      include: {
        sekolahs: {
          select: { id: true, nama: true, jenjang: true, statusAktif: true },
          orderBy: { nama: "asc" },
        },
        _count: { select: { sekolahs: true } },
      },
    });
    if (!yayasan) return NextResponse.json({ error: "Yayasan tidak ditemukan" }, { status: 404 });
    return NextResponse.json(yayasan);
  } catch (e) {
    console.error("GET yayasan/[id] error:", e);
    return NextResponse.json({ error: "Gagal memuat yayasan" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: hanya Super Admin yang bisa kelola yayasan" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const { nama, npsnYayasan, alamat, telepon, email, website, logoUrl, ketuaYayasan, description, statusAktif } = body;

    const existing = await db.yayasan.findUnique({ where: { id: Number(id) } });
    if (!existing) return NextResponse.json({ error: "Yayasan tidak ditemukan" }, { status: 404 });

    const updated = await db.yayasan.update({
      where: { id: Number(id) },
      data: {
        nama: nama !== undefined ? String(nama).trim() : undefined,
        npsnYayasan: npsnYayasan !== undefined ? (npsnYayasan || null) : undefined,
        alamat: alamat !== undefined ? (alamat || null) : undefined,
        telepon: telepon !== undefined ? (telepon || null) : undefined,
        email: email !== undefined ? (email || null) : undefined,
        website: website !== undefined ? (website || null) : undefined,
        logoUrl: logoUrl !== undefined ? (logoUrl || null) : undefined,
        ketuaYayasan: ketuaYayasan !== undefined ? (ketuaYayasan || null) : undefined,
        description: description !== undefined ? (description || null) : undefined,
        statusAktif: statusAktif !== undefined ? Boolean(statusAktif) : undefined,
      },
      include: { _count: { select: { sekolahs: true } } },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PUT yayasan/[id] error:", e);
    return NextResponse.json({ error: "Gagal update yayasan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: hanya Super Admin yang bisa kelola yayasan" }, { status: 403 });
    }
    const { id } = await params;

    // Cek apakah yayasan masih dipakai oleh sekolah
    const sekolahCount = await db.sekolah.count({ where: { yayasanId: Number(id) } });
    if (sekolahCount > 0) {
      return NextResponse.json(
        { error: `Tidak bisa hapus yayasan: masih ada ${sekolahCount} sekolah yang terdaftar di yayasan ini. Pindahkan/hapus sekolah dulu.` },
        { status: 400 }
      );
    }

    await db.yayasan.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE yayasan/[id] error:", e);
    return NextResponse.json({ error: "Gagal hapus yayasan" }, { status: 500 });
  }
}
