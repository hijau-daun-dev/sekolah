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
    const existing = await db.pengeluaran.findFirst({
      where: { id: Number(id), ...(sekolahId ? { pegawai: { sekolahId } } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Pengeluaran tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { posAnggaranId, tanggal, nominal, keterangan, buktiNotaUrl } = body;

    const data = await db.pengeluaran.update({
      where: { id: Number(id) },
      data: {
        posAnggaranId: posAnggaranId != null ? Number(posAnggaranId) : undefined,
        tanggal: tanggal ? new Date(tanggal) : undefined,
        nominal: nominal != null ? Number(nominal) : undefined,
        keterangan: keterangan != null ? String(keterangan).trim() : undefined,
        buktiNotaUrl: buktiNotaUrl !== undefined ? (buktiNotaUrl || null) : undefined,
      },
      include: {
        posAnggaran: { select: { id: true, nama: true, kode: true, jenis: true } },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT pengeluaran error:", e);
    return NextResponse.json({ error: "Gagal memperbarui pengeluaran" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const existing = await db.pengeluaran.findFirst({
      where: { id: Number(id), ...(sekolahId ? { pegawai: { sekolahId } } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Pengeluaran tidak ditemukan" }, { status: 404 });

    await db.pengeluaran.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE pengeluaran error:", e);
    return NextResponse.json({ error: "Gagal menghapus pengeluaran" }, { status: 500 });
  }
}
