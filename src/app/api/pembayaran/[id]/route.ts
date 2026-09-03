import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const data = await db.pembayaran.findFirst({
      where: { id: Number(id), ...(sekolahId ? { tagihanSiswa: { siswa: { sekolahId } } } : {}) },
      include: {
        tagihanSiswa: {
          include: {
            siswa: { select: { id: true, nama: true, nis: true, nisn: true } },
            tarifPembayaran: { include: { jenisPembayaran: { select: { id: true, nama: true } } } },
            tahunAjaran: { select: { id: true, nama: true } },
          },
        },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
      },
    });
    if (!data) return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET pembayaran detail error:", e);
    return NextResponse.json({ error: "Gagal memuat pembayaran" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const existing = await db.pembayaran.findFirst({
      where: { id: Number(id), ...(sekolahId ? { tagihanSiswa: { siswa: { sekolahId } } } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });

    await db.$transaction(async (tx) => {
      await tx.pembayaran.delete({ where: { id: Number(id) } });
      // After delete, re-evaluate tagihan statusLunas (if no pembayaran reaches nominal, set to false)
      const remaining = await tx.pembayaran.aggregate({
        where: { tagihanSiswaId: existing.tagihanSiswaId },
        _sum: { jumlahBayar: true },
      });
      const tagihan = await tx.tagihanSiswa.findUnique({ where: { id: existing.tagihanSiswaId } });
      if (tagihan) {
        const newStatus = (remaining._sum.jumlahBayar || 0) >= tagihan.nominal;
        await tx.tagihanSiswa.update({
          where: { id: tagihan.id },
          data: { statusLunas: newStatus },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE pembayaran error:", e);
    return NextResponse.json({ error: "Gagal menghapus pembayaran" }, { status: 500 });
  }
}
