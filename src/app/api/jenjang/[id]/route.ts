import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: hanya Super Admin yang bisa kelola jenjang" }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const { kode, nama, urutan, keterangan, statusAktif } = body;

    const existing = await db.jenjang.findUnique({ where: { id: Number(id) } });
    if (!existing) return NextResponse.json({ error: "Jenjang tidak ditemukan" }, { status: 404 });

    // Cek duplikat kode kalau kode diubah
    if (kode && kode !== existing.kode) {
      const dup = await db.jenjang.findUnique({ where: { kode: String(kode).trim().toUpperCase() } });
      if (dup) return NextResponse.json({ error: `Kode "${kode}" sudah dipakai` }, { status: 400 });
    }

    const updated = await db.jenjang.update({
      where: { id: Number(id) },
      data: {
        kode: kode !== undefined ? String(kode).trim().toUpperCase() : undefined,
        nama: nama !== undefined ? String(nama).trim() : undefined,
        urutan: urutan !== undefined ? Number(urutan) : undefined,
        keterangan: keterangan !== undefined ? (keterangan || null) : undefined,
        statusAktif: statusAktif !== undefined ? Boolean(statusAktif) : undefined,
      },
      include: { _count: { select: { sekolahs: true } } },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PUT jenjang/[id] error:", e);
    return NextResponse.json({ error: "Gagal update jenjang" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: hanya Super Admin yang bisa kelola jenjang" }, { status: 403 });
    }
    const { id } = await params;

    // Cek apakah jenjang masih dipakai oleh sekolah
    const sekolahCount = await db.sekolah.count({ where: { jenjangId: Number(id) } });
    if (sekolahCount > 0) {
      return NextResponse.json(
        { error: `Tidak bisa hapus jenjang: masih ada ${sekolahCount} sekolah dengan jenjang ini. Ubah jenjang sekolah dulu.` },
        { status: 400 }
      );
    }

    await db.jenjang.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE jenjang/[id] error:", e);
    return NextResponse.json({ error: "Gagal hapus jenjang" }, { status: 500 });
  }
}
