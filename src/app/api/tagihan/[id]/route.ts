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
    const existing = await db.tagihanSiswa.findFirst({
      where: { id: Number(id), ...(sekolahId ? { siswa: { sekolahId } } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { statusLunas, nominal, tanggalJatuhTempo, bulanTagihan } = body;

    const data = await db.tagihanSiswa.update({
      where: { id: Number(id) },
      data: {
        statusLunas: statusLunas != null ? !!statusLunas : undefined,
        nominal: nominal != null ? Number(nominal) : undefined,
        tanggalJatuhTempo: tanggalJatuhTempo !== undefined ? (tanggalJatuhTempo ? new Date(tanggalJatuhTempo) : null) : undefined,
        bulanTagihan: bulanTagihan !== undefined ? (bulanTagihan || null) : undefined,
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT tagihan error:", e);
    return NextResponse.json({ error: "Gagal memperbarui tagihan" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const existing = await db.tagihanSiswa.findFirst({
      where: { id: Number(id), ...(sekolahId ? { siswa: { sekolahId } } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });

    // Block delete if has pembayarans
    const pembCount = await db.pembayaran.count({ where: { tagihanSiswaId: Number(id) } });
    if (pembCount > 0) {
      return NextResponse.json({ error: `Tidak dapat menghapus: tagihan memiliki ${pembCount} pembayaran` }, { status: 400 });
    }

    await db.tagihanSiswa.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE tagihan error:", e);
    return NextResponse.json({ error: "Gagal menghapus tagihan" }, { status: 500 });
  }
}
