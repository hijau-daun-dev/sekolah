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
    const kelasId = searchParams.get("kelasId");
    const siswaId = searchParams.get("siswaId");

    const where: Record<string, unknown> = {};
    if (kelasId) where.kelasId = Number(kelasId);
    if (siswaId) where.siswaId = Number(siswaId);
    if (sekolahId) {
      where.kelas = { sekolahId };
    }

    const data = await db.kelasSiswa.findMany({
      where,
      orderBy: [{ kelas: { nama: "asc" } }, { siswa: { nama: "asc" } }],
      include: {
        kelas: { select: { id: true, nama: true, tingkat: { select: { nama: true } }, tahunAjaran: { select: { nama: true } } } },
        siswa: { select: { id: true, nama: true, nis: true, status: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET kelas-siswa error:", e);
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
    const { kelasId, siswaId, tahunAjaranId } = body;
    if (!kelasId || !siswaId || !tahunAjaranId) {
      return NextResponse.json({ error: "kelasId, siswaId, tahunAjaranId wajib" }, { status: 400 });
    }

    // ownership check
    const kelas = await db.kelas.findUnique({ where: { id: Number(kelasId) }, select: { sekolahId: true, tahunAjaranId: true } });
    if (!kelas) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    if (sekolahId && kelas.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    const siswa = await db.siswa.findUnique({ where: { id: Number(siswaId) }, select: { sekolahId: true } });
    if (!siswa) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    if (sekolahId && siswa.sekolahId !== sekolahId) return NextResponse.json({ error: "Siswa beda sekolah" }, { status: 400 });

    const data = await db.kelasSiswa.create({
      data: {
        kelasId: Number(kelasId),
        siswaId: Number(siswaId),
        tahunAjaranId: Number(tahunAjaranId),
      },
      include: {
        kelas: { select: { id: true, nama: true } },
        siswa: { select: { id: true, nama: true, nis: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST kelas-siswa error:", e);
    return NextResponse.json({ error: "Gagal menambah. Mungkin siswa sudah terdaftar di kelas ini." }, { status: 500 });
  }
}
