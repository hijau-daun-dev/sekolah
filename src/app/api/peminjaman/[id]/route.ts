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
    const existing = await db.peminjamanBarang.findFirst({
      where: { id: Number(id), ...(sekolahId ? { barang: { sekolahId } } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Peminjaman tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const action = body.action as string | undefined;
    const statusField = body.status as string | undefined;

    // Handle return action: either action="return" OR status="Dikembalikan"
    if (action === "return" || statusField === "Dikembalikan") {
      const kondisiKembali = body.kondisiKembali as string | undefined;
      const keterangan = body.keterangan as string | undefined;
      if (!kondisiKembali || !["Baik", "Rusak"].includes(kondisiKembali)) {
        return NextResponse.json({ error: "kondisiKembali wajib (Baik/Rusak)" }, { status: 400 });
      }
      if (existing.status === "Dikembalikan") {
        return NextResponse.json({ error: "Barang sudah dikembalikan" }, { status: 400 });
      }

      const data = await db.$transaction(async (tx) => {
        const updated = await tx.peminjamanBarang.update({
          where: { id: Number(id) },
          data: {
            tanggalKembaliAktual: new Date(),
            kondisiKembali,
            status: "Dikembalikan",
            keterangan: keterangan || existing.keterangan,
          },
          include: {
            barang: {
              select: {
                id: true, nama: true, kode: true, status: true, kondisi: true,
                kategoriBarang: { select: { id: true, nama: true } },
                ruangan: { select: { id: true, nama: true } },
              },
            },
            pegawai: { select: { id: true, nama: true, jabatan: true } },
          },
        });
        // Set barang.status back to "Tersedia"
        // If kondisiKembali == "Rusak", also update barang.kondisi accordingly
        await tx.barang.update({
          where: { id: existing.barangId },
          data: {
            status: "Tersedia",
            ...(kondisiKembali === "Rusak" ? { kondisi: "Rusak Ringan" } : {}),
          },
        });
        return updated;
      });
      return NextResponse.json(data);
    }

    // Generic PUT for other fields
    const { tanggalKembaliRencana, keterangan } = body as { tanggalKembaliRencana?: string; keterangan?: string };
    const data = await db.peminjamanBarang.update({
      where: { id: Number(id) },
      data: {
        tanggalKembaliRencana: tanggalKembaliRencana ? new Date(tanggalKembaliRencana) : undefined,
        keterangan: keterangan != null ? keterangan : undefined,
      },
      include: {
        barang: {
          select: {
            id: true, nama: true, kode: true, status: true, kondisi: true,
            kategoriBarang: { select: { id: true, nama: true } },
            ruangan: { select: { id: true, nama: true } },
          },
        },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT peminjaman error:", e);
    return NextResponse.json({ error: "Gagal memperbarui peminjaman" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const existing = await db.peminjamanBarang.findFirst({
      where: { id: Number(id), ...(sekolahId ? { barang: { sekolahId } } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Peminjaman tidak ditemukan" }, { status: 404 });

    // If still Dipinjam, restore barang.status to Tersedia
    await db.$transaction(async (tx) => {
      if (existing.status === "Dipinjam") {
        await tx.barang.update({
          where: { id: existing.barangId },
          data: { status: "Tersedia" },
        });
      }
      await tx.peminjamanBarang.delete({ where: { id: Number(id) } });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE peminjaman error:", e);
    return NextResponse.json({ error: "Gagal menghapus peminjaman" }, { status: 500 });
  }
}
