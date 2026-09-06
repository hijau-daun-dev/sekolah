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
    const kelasId = searchParams.get("kelasId");

    const where: Record<string, unknown> = {};
    if (pegawaiId) where.pegawaiId = Number(pegawaiId);
    if (mapelId) where.mapelId = Number(mapelId);
    if (kelasId) where.kelasId = Number(kelasId);
    if (sekolahId) {
      where.pegawai = { sekolahId };
    }

    const data = await db.guruMapel.findMany({
      where,
      orderBy: [{ pegawai: { nama: "asc" } }, { mapel: { nama: "asc" } }],
      include: {
        pegawai: { select: { id: true, nama: true, jabatan: true } },
        mapel: { select: { id: true, nama: true, kode: true } },
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
    const { pegawaiId, mapelId, kelasId } = body;
    if (!pegawaiId || !mapelId) return NextResponse.json({ error: "pegawaiId & mapelId wajib" }, { status: 400 });

    const pegawai = await db.pegawai.findUnique({ where: { id: Number(pegawaiId) }, select: { sekolahId: true } });
    if (!pegawai) return NextResponse.json({ error: "Pegawai tidak ditemukan" }, { status: 404 });
    if (sekolahId && pegawai.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    const data = await db.guruMapel.create({
      data: {
        pegawaiId: Number(pegawaiId),
        mapelId: Number(mapelId),
        kelasId: kelasId ? Number(kelasId) : null,
      },
      include: {
        pegawai: { select: { id: true, nama: true } },
        mapel: { select: { id: true, nama: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST guru-mapel error:", e);
    return NextResponse.json({ error: "Gagal menambah. Mungkin kombinasi sudah ada." }, { status: 500 });
  }
}
