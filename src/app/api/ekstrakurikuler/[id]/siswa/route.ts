import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

async function checkOwnership(id: number, sekolahId?: number) {
  const r = await db.ekstrakurikuler.findUnique({ where: { id }, select: { sekolahId: true } });
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
    const eksId = Number(id);
    const owned = await checkOwnership(eksId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const data = await db.ekstrakurikulerSiswa.findMany({
      where: { ekstrakurikulerId: eksId },
      include: { siswa: { select: { id: true, nama: true, nis: true, status: true } } },
      orderBy: { siswa: { nama: "asc" } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET ekstrakurikuler/[id]/siswa error:", e);
    return NextResponse.json({ error: "Gagal memuat peserta" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const eksId = Number(id);
    const owned = await checkOwnership(eksId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { siswaId, status } = body;
    if (!siswaId) return NextResponse.json({ error: "siswaId wajib" }, { status: 400 });

    // Verify siswa ownership
    const siswa = await db.siswa.findUnique({ where: { id: Number(siswaId) }, select: { sekolahId: true } });
    if (!siswa) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    if (sekolahId && siswa.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    let data;
    try {
      data = await db.ekstrakurikulerSiswa.create({
        data: {
          ekstrakurikulerId: eksId,
          siswaId: Number(siswaId),
          status: status || "Aktif",
        },
        include: { siswa: { select: { id: true, nama: true, nis: true } } },
      });
    } catch {
      return NextResponse.json({ error: "Siswa sudah terdaftar di ekstrakurikuler ini" }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST ekstrakurikuler/[id]/siswa error:", e);
    return NextResponse.json({ error: "Gagal menambah peserta" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const eksId = Number(id);
    const owned = await checkOwnership(eksId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const url = new URL(req.url);
    const siswaId = url.searchParams.get("siswaId");
    if (!siswaId) return NextResponse.json({ error: "siswaId wajib (query param)" }, { status: 400 });

    await db.ekstrakurikulerSiswa.deleteMany({
      where: { ekstrakurikulerId: eksId, siswaId: Number(siswaId) },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE ekstrakurikuler/[id]/siswa error:", e);
    return NextResponse.json({ error: "Gagal menghapus peserta" }, { status: 500 });
  }
}
