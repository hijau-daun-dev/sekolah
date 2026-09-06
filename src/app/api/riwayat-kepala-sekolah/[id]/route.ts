import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(id: number, sekolahId?: number) {
  const r = await db.riwayatKepalaSekolah.findUnique({ where: { id }, select: { sekolahId: true } });
  if (!r) return null;
  if (sekolahId && r.sekolahId !== sekolahId) return null;
  return r;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const rksId = Number(id);
    const owned = await checkOwnership(rksId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { pegawaiId, namaSnapshot, nipSnapshot, tanggalMulai, tanggalSelesai, status, keterangan } = body;
    const data = await db.riwayatKepalaSekolah.update({
      where: { id: rksId },
      data: {
        pegawaiId: pegawaiId != null ? Number(pegawaiId) : undefined,
        namaSnapshot: namaSnapshot !== undefined ? (namaSnapshot || null) : undefined,
        nipSnapshot: nipSnapshot === undefined ? undefined : (nipSnapshot || null),
        tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : undefined,
        tanggalSelesai: tanggalSelesai === undefined ? undefined : (tanggalSelesai ? new Date(tanggalSelesai) : null),
        status: status || undefined,
        keterangan: keterangan === undefined ? undefined : (keterangan || null),
      },
      include: { pegawai: { select: { id: true, nama: true, jabatan: true, nip: true } } },
    });

    if (data.status === "Aktif") {
      await db.sekolah.update({
        where: { id: owned.sekolahId },
        data: { kepalaSekolah: data.namaSnapshot, nipKepala: data.nipSnapshot },
      });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT riwayat-kepala-sekolah/[id] error:", e);
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
    const rksId = Number(id);
    const owned = await checkOwnership(rksId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    // Fetch full record to check status
    const rks = await db.riwayatKepalaSekolah.findUnique({ where: { id: rksId }, select: { status: true } });
    if (rks?.status === "Aktif") {
      return NextResponse.json({ error: "Tidak dapat menghapus riwayat kepala sekolah yang masih aktif. Tutup terlebih dahulu (set status=Selesai + tanggalSelesai)." }, { status: 400 });
    }

    await db.riwayatKepalaSekolah.delete({ where: { id: rksId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE riwayat-kepala-sekolah/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
