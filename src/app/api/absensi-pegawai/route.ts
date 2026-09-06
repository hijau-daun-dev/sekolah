import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const url = new URL(req.url);
    const tanggal = url.searchParams.get("tanggal");
    const pegawaiId = url.searchParams.get("pegawaiId");

    const where: Record<string, unknown> = {};
    if (pegawaiId) where.pegawaiId = Number(pegawaiId);
    if (tanggal) {
      const start = new Date(tanggal);
      start.setHours(0, 0, 0, 0);
      const end = new Date(tanggal);
      end.setHours(23, 59, 59, 999);
      where.tanggal = { gte: start, lte: end };
    }
    if (sekolahId) where.pegawai = { sekolahId };

    const data = await db.absensiPegawai.findMany({
      where,
      include: {
        pegawai: { select: { id: true, nama: true, nip: true, jabatan: true } },
      },
      orderBy: { pegawai: { nama: "asc" } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET absensi-pegawai error:", e);
    return NextResponse.json({ error: "Gagal memuat absensi pegawai" }, { status: 500 });
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
      pegawaiId: number; tanggal: string; jamMasuk?: string | null;
      jamPulang?: string | null; status: string; keterangan?: string | null;
    }> = Array.isArray(body) ? body : (Array.isArray(body?.items) ? body.items : null);

    if (!arr) return NextResponse.json({ error: "Body harus array atau { items: [] }" }, { status: 400 });

    const validStatus = ["Hadir", "Sakit", "Izin", "Alpa", "Cuti"];
    for (const item of arr) {
      if (!item.pegawaiId || !item.tanggal || !item.status) {
        return NextResponse.json({ error: "Field wajib: pegawaiId, tanggal, status" }, { status: 400 });
      }
      if (!validStatus.includes(item.status)) {
        return NextResponse.json({ error: `Status tidak valid: ${item.status}` }, { status: 400 });
      }
    }

    const results = await db.$transaction(
      arr.map((item) =>
        db.absensiPegawai.upsert({
          where: { pegawaiId_tanggal: { pegawaiId: Number(item.pegawaiId), tanggal: new Date(item.tanggal) } },
          create: {
            pegawaiId: Number(item.pegawaiId),
            tanggal: new Date(item.tanggal),
            jamMasuk: item.jamMasuk ? new Date(item.jamMasuk) : null,
            jamPulang: item.jamPulang ? new Date(item.jamPulang) : null,
            status: item.status,
            keterangan: item.keterangan || null,
          },
          update: {
            jamMasuk: item.jamMasuk != null ? (item.jamMasuk ? new Date(item.jamMasuk) : null) : undefined,
            jamPulang: item.jamPulang != null ? (item.jamPulang ? new Date(item.jamPulang) : null) : undefined,
            status: item.status,
            keterangan: item.keterangan || null,
          },
        })
      )
    );
    return NextResponse.json({ saved: results.length });
  } catch (e) {
    console.error("POST absensi-pegawai error:", e);
    return NextResponse.json({ error: "Gagal menyimpan absensi pegawai" }, { status: 500 });
  }
}
