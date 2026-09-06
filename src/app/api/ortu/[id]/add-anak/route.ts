import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const ortuId = Number(id);

    // Verify ownership
    const ortu = await db.ortu.findUnique({ where: { id: ortuId }, select: { sekolahId: true } });
    if (!ortu) return NextResponse.json({ error: "Ortu tidak ditemukan" }, { status: 404 });
    if (sekolahId && ortu.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    const body = await req.json();
    const { siswaId, hubungan } = body;
    if (!siswaId) return NextResponse.json({ error: "siswaId wajib" }, { status: 400 });
    if (!hubungan || !String(hubungan).trim()) return NextResponse.json({ error: "hubungan wajib" }, { status: 400 });

    // Verify siswa is in same sekolah
    const siswa = await db.siswa.findUnique({ where: { id: Number(siswaId) }, select: { sekolahId: true } });
    if (!siswa) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    if (sekolahId && siswa.sekolahId !== sekolahId) return NextResponse.json({ error: "Siswa beda sekolah" }, { status: 400 });

    // upsert relation (unique [ortuId, siswaId])
    const rel = await db.ortuSiswa.upsert({
      where: { ortuId_siswaId: { ortuId, siswaId: Number(siswaId) } },
      update: { hubungan: String(hubungan).trim() },
      create: { ortuId, siswaId: Number(siswaId), hubungan: String(hubungan).trim() },
      include: { siswa: { select: { id: true, nama: true, nis: true, status: true } } },
    });
    return NextResponse.json(rel);
  } catch (e) {
    console.error("POST ortu add-anak error:", e);
    return NextResponse.json({ error: "Gagal menambah anak" }, { status: 500 });
  }
}
