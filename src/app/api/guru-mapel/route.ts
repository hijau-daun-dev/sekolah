import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const pegawaiId = searchParams.get("pegawaiId");
    const mapelId = searchParams.get("mapelId");
    const tingkatId = searchParams.get("tingkatId");
    const qSekolahId = searchParams.get("sekolahId");
    const statusAktif = searchParams.get("statusAktif");

    const where: Record<string, unknown> = {};
    if (pegawaiId) where.pegawaiId = Number(pegawaiId);
    if (mapelId) where.mapelId = Number(mapelId);
    if (tingkatId) where.tingkatId = Number(tingkatId);
    if (statusAktif === "true") where.statusAktif = true;
    else if (statusAktif === "false") where.statusAktif = false;
    if (sekolahId) where.pegawai = { sekolahId };
    else if (qSekolahId) where.pegawai = { sekolahId: Number(qSekolahId) };

    const data = await db.guruMapel.findMany({
      where,
      orderBy: [{ pegawai: { nama: "asc" } }, { mapel: { nama: "asc" } }, { tingkat: { urutan: "asc" } }],
      include: {
        pegawai: { select: { id: true, nama: true, jabatan: true } },
        mapel: { select: { id: true, nama: true, kode: true } },
        tingkat: { select: { id: true, nama: true, jenjang: true, urutan: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET guru-mapel error:", e);
    return NextResponse.json({ error: "Gagal memuat" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { pegawaiId, mapelId, tingkatId, statusAktif } = body;
    if (!pegawaiId || !mapelId || !tingkatId) return NextResponse.json({ error: "pegawaiId, mapelId & tingkatId wajib" }, { status: 400 });

    const pegawai = await db.pegawai.findUnique({ where: { id: Number(pegawaiId) }, select: { sekolahId: true } });
    if (!pegawai) return NextResponse.json({ error: "Pegawai tidak ditemukan" }, { status: 404 });
    if (sekolahId && pegawai.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    // Verify tingkat ownership
    const tingkat = await db.tingkat.findUnique({ where: { id: Number(tingkatId) }, select: { sekolahId: true } });
    if (!tingkat) return NextResponse.json({ error: "Tingkat tidak ditemukan" }, { status: 404 });
    if (sekolahId && tingkat.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    let data;
    try {
      data = await db.guruMapel.create({
        data: {
          pegawaiId: Number(pegawaiId),
          mapelId: Number(mapelId),
          tingkatId: Number(tingkatId),
          statusAktif: statusAktif !== undefined ? !!statusAktif : true,
        },
        include: {
          pegawai: { select: { id: true, nama: true, jabatan: true } },
          mapel: { select: { id: true, nama: true, kode: true } },
          tingkat: { select: { id: true, nama: true, jenjang: true, urutan: true } },
        },
      });
    } catch {
      return NextResponse.json({ error: "Kombinasi pegawai+mapel+tingkat sudah ada" }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST guru-mapel error:", e);
    return NextResponse.json({ error: "Gagal menambah." }, { status: 500 });
  }
}
