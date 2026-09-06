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
    const tingkatId = searchParams.get("tingkatId");
    const mapelId = searchParams.get("mapelId");
    const statusAktif = searchParams.get("statusAktif");

    const where: Record<string, unknown> = {};
    if (tingkatId) where.tingkatId = Number(tingkatId);
    if (mapelId) where.mapelId = Number(mapelId);
    if (statusAktif === "true") where.statusAktif = true;
    else if (statusAktif === "false") where.statusAktif = false;
    if (sekolahId) where.tingkat = { sekolahId };

    const data = await db.tingkatMapel.findMany({
      where,
      orderBy: [{ tingkat: { urutan: "asc" } }, { mapel: { nama: "asc" } }],
      include: {
        tingkat: { select: { id: true, nama: true, jenjang: true, urutan: true } },
        mapel: { select: { id: true, nama: true, kode: true, kategoriMapel: { select: { nama: true } } } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET tingkat-mapel error:", e);
    return NextResponse.json({ error: "Gagal memuat tingkat-mapel" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { tingkatId, mapelId, jpPerMinggu, statusAktif } = body;
    if (!tingkatId || !mapelId) return NextResponse.json({ error: "tingkatId & mapelId wajib" }, { status: 400 });

    // Verify tingkat ownership
    const tingkat = await db.tingkat.findUnique({ where: { id: Number(tingkatId) }, select: { sekolahId: true } });
    if (!tingkat) return NextResponse.json({ error: "Tingkat tidak ditemukan" }, { status: 404 });
    if (sekolahId && tingkat.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    // Verify mapel ownership
    const mapel = await db.mapel.findUnique({ where: { id: Number(mapelId) }, select: { sekolahId: true } });
    if (!mapel) return NextResponse.json({ error: "Mapel tidak ditemukan" }, { status: 404 });
    if (sekolahId && mapel.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    let data;
    try {
      data = await db.tingkatMapel.create({
        data: {
          tingkatId: Number(tingkatId),
          mapelId: Number(mapelId),
          jpPerMinggu: jpPerMinggu != null && jpPerMinggu !== "" ? Number(jpPerMinggu) : null,
          statusAktif: statusAktif !== undefined ? !!statusAktif : true,
        },
        include: {
          tingkat: { select: { id: true, nama: true, jenjang: true, urutan: true } },
          mapel: { select: { id: true, nama: true, kode: true } },
        },
      });
    } catch {
      return NextResponse.json({ error: "Kombinasi tingkat & mapel sudah ada" }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST tingkat-mapel error:", e);
    return NextResponse.json({ error: "Gagal menambah tingkat-mapel" }, { status: 500 });
  }
}
