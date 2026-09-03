import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const url = new URL(req.url);
    const kelasId = url.searchParams.get("kelasId");
    const mapelId = url.searchParams.get("mapelId");
    const komponenNilaiId = url.searchParams.get("komponenNilaiId");

    const where: Record<string, unknown> = {};
    if (mapelId) where.mapelId = Number(mapelId);
    if (komponenNilaiId) where.komponenNilaiId = Number(komponenNilaiId);
    if (sekolahId) where.siswa = { sekolahId };
    if (kelasId) {
      // Filter siswa that are in this kelas via kelasSiswa
      where.siswa = {
        ...(sekolahId ? { sekolahId } : {}),
        kelasSiswas: { some: { kelasId: Number(kelasId) } },
      };
    }

    const data = await db.penilaian.findMany({
      where,
      include: {
        siswa: { select: { id: true, nama: true, nis: true } },
        mapel: { select: { id: true, nama: true, kode: true } },
        komponenNilai: { select: { id: true, nama: true, bobot: true } },
      },
      orderBy: { siswa: { nama: "asc" } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET penilaian error:", e);
    return NextResponse.json({ error: "Gagal memuat penilaian" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const arr: Array<{
      siswaId: number; mapelId: number; komponenNilaiId: number;
      tahunAjaranId?: number | null; nilai: number; tanggal?: string;
      keterangan?: string | null;
    }> = Array.isArray(body) ? body : (Array.isArray(body?.items) ? body.items : null);

    if (!arr) return NextResponse.json({ error: "Body harus array atau { items: [] }" }, { status: 400 });

    for (const item of arr) {
      if (!item.siswaId || !item.mapelId || !item.komponenNilaiId || item.nilai == null) {
        return NextResponse.json({ error: "Field wajib: siswaId, mapelId, komponenNilaiId, nilai" }, { status: 400 });
      }
      if (Number(item.nilai) < 0 || Number(item.nilai) > 100) {
        return NextResponse.json({ error: "Nilai harus 0-100" }, { status: 400 });
      }
    }

    const results = await db.$transaction(
      arr.map((item) =>
        db.penilaian.upsert({
          where: {
            siswaId_mapelId_komponenNilaiId: {
              siswaId: Number(item.siswaId),
              mapelId: Number(item.mapelId),
              komponenNilaiId: Number(item.komponenNilaiId),
            },
          },
          create: {
            siswaId: Number(item.siswaId),
            mapelId: Number(item.mapelId),
            komponenNilaiId: Number(item.komponenNilaiId),
            tahunAjaranId: item.tahunAjaranId ? Number(item.tahunAjaranId) : null,
            nilai: Number(item.nilai),
            tanggal: item.tanggal ? new Date(item.tanggal) : new Date(),
            keterangan: item.keterangan || null,
          },
          update: {
            nilai: Number(item.nilai),
            tahunAjaranId: item.tahunAjaranId != null ? Number(item.tahunAjaranId) : undefined,
            tanggal: item.tanggal ? new Date(item.tanggal) : undefined,
            keterangan: item.keterangan || null,
          },
        })
      )
    );
    return NextResponse.json({ saved: results.length });
  } catch (e) {
    console.error("POST penilaian error:", e);
    return NextResponse.json({ error: "Gagal menyimpan penilaian" }, { status: 500 });
  }
}
