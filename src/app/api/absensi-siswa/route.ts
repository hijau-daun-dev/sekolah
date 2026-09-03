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
    const tanggal = url.searchParams.get("tanggal");

    const where: Record<string, unknown> = {};
    if (kelasId) where.kelasId = Number(kelasId);
    if (tanggal) {
      const start = new Date(tanggal);
      start.setHours(0, 0, 0, 0);
      const end = new Date(tanggal);
      end.setHours(23, 59, 59, 999);
      where.tanggal = { gte: start, lte: end };
    }
    if (sekolahId) where.siswa = { sekolahId };

    const data = await db.absensiSiswa.findMany({
      where,
      include: {
        siswa: { select: { id: true, nama: true, nis: true } },
        kelas: { select: { id: true, nama: true } },
      },
      orderBy: { siswa: { nama: "asc" } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET absensi-siswa error:", e);
    return NextResponse.json({ error: "Gagal memuat absensi siswa" }, { status: 500 });
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
      siswaId: number; kelasId?: number | null; tanggal: string;
      status: string; keterangan?: string | null;
    }> = Array.isArray(body) ? body : (Array.isArray(body?.items) ? body.items : null);

    if (!arr) return NextResponse.json({ error: "Body harus array atau { items: [] }" }, { status: 400 });

    const validStatus = ["Hadir", "Sakit", "Izin", "Alpa"];
    for (const item of arr) {
      if (!item.siswaId || !item.tanggal || !item.status) {
        return NextResponse.json({ error: "Field wajib: siswaId, tanggal, status" }, { status: 400 });
      }
      if (!validStatus.includes(item.status)) {
        return NextResponse.json({ error: `Status tidak valid: ${item.status}` }, { status: 400 });
      }
    }

    const results = await db.$transaction(
      arr.map((item) =>
        db.absensiSiswa.upsert({
          where: { siswaId_tanggal: { siswaId: Number(item.siswaId), tanggal: new Date(item.tanggal) } },
          create: {
            siswaId: Number(item.siswaId),
            kelasId: item.kelasId ? Number(item.kelasId) : null,
            tanggal: new Date(item.tanggal),
            status: item.status,
            keterangan: item.keterangan || null,
          },
          update: {
            kelasId: item.kelasId != null ? Number(item.kelasId) : undefined,
            status: item.status,
            keterangan: item.keterangan || null,
          },
        })
      )
    );
    return NextResponse.json({ saved: results.length });
  } catch (e) {
    console.error("POST absensi-siswa error:", e);
    return NextResponse.json({ error: "Gagal menyimpan absensi siswa" }, { status: 500 });
  }
}
