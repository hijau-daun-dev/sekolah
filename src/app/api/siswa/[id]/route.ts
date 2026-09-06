import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(siswaId: number, sekolahId?: number) {
  const s = await db.siswa.findUnique({ where: { id: siswaId }, select: { sekolahId: true } });
  if (!s) return null;
  if (sekolahId && s.sekolahId !== sekolahId) return null;
  return s;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const siswaId = Number(id);
    const owned = await checkOwnership(siswaId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const data = await db.siswa.findUnique({
      where: { id: siswaId },
      include: {
        kelasSiswas: {
          include: {
            kelas: { select: { id: true, nama: true, tingkat: { select: { nama: true } }, tahunAjaran: { select: { nama: true, statusAktif: true } } } },
          },
          orderBy: { createdAt: "desc" },
        },
        ortuSiswas: { include: { ortu: { select: { id: true, nama: true, telepon: true } } } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET siswa/[id] error:", e);
    return NextResponse.json({ error: "Gagal memuat siswa" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const siswaId = Number(id);
    const owned = await checkOwnership(siswaId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { nis, nisn, nama, gender, tempatLahir, tanggalLahir, alamat, telepon, fotoUrl, status } = body;

    const data = await db.siswa.update({
      where: { id: siswaId },
      data: {
        nis: nis ?? null,
        nisn: nisn ?? null,
        nama: nama ? String(nama).trim() : undefined,
        gender: gender ?? null,
        tempatLahir: tempatLahir ?? null,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : tanggalLahir === "" ? null : undefined,
        alamat: alamat ?? null,
        telepon: telepon ?? null,
        fotoUrl: fotoUrl ?? null,
        status: status ?? undefined,
      },
      include: { kelasSiswas: { include: { kelas: { select: { id: true, nama: true } } } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT siswa/[id] error:", e);
    return NextResponse.json({ error: "Gagal mengupdate siswa" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const siswaId = Number(id);
    const owned = await checkOwnership(siswaId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    await db.siswa.delete({ where: { id: siswaId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE siswa/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus siswa" }, { status: 500 });
  }
}
