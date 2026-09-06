import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(id: number, sekolahId?: number) {
  const r = await db.kelas.findUnique({ where: { id }, select: { sekolahId: true } });
  if (!r) return null;
  if (sekolahId && r.sekolahId !== sekolahId) return null;
  return r;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const kid = Number(id);
    const owned = await checkOwnership(kid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    const data = await db.kelas.findUnique({
      where: { id: kid },
      include: {
        tingkat: true, jurusan: true, tahunAjaran: true, walikelas: { select: { id: true, nama: true } },
        kelasSiswas: { include: { siswa: { select: { id: true, nama: true, nis: true, status: true } } } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET kelas/[id] error:", e);
    return NextResponse.json({ error: "Gagal memuat" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const kid = Number(id);
    const owned = await checkOwnership(kid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { nama, tingkatId, jurusanId, tahunAjaranId, walikelasId, ruangan, kapasitas } = body;
    const data = await db.kelas.update({
      where: { id: kid },
      data: {
        nama: nama ? String(nama).trim() : undefined,
        tingkatId: tingkatId ? Number(tingkatId) : undefined,
        jurusanId: jurusanId === "" || jurusanId == null ? null : Number(jurusanId),
        tahunAjaranId: tahunAjaranId ? Number(tahunAjaranId) : undefined,
        walikelasId: walikelasId === "" || walikelasId == null ? null : Number(walikelasId),
        ruangan: ruangan ?? null,
        kapasitas: kapasitas === "" || kapasitas == null ? null : Number(kapasitas),
      },
      include: {
        tingkat: { select: { id: true, nama: true } },
        jurusan: { select: { id: true, kode: true, nama: true } },
        tahunAjaran: { select: { id: true, nama: true } },
        walikelas: { select: { id: true, nama: true } },
        _count: { select: { kelasSiswas: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT kelas/[id] error:", e);
    return NextResponse.json({ error: "Gagal mengupdate kelas" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const kid = Number(id);
    const owned = await checkOwnership(kid, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const cnt = await db.kelasSiswa.count({ where: { kelasId: kid } });
    if (cnt > 0) return NextResponse.json({ error: `Tidak dapat dihapus: masih memiliki ${cnt} siswa` }, { status: 400 });

    await db.kelas.delete({ where: { id: kid } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE kelas/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus kelas" }, { status: 500 });
  }
}
