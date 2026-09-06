import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

/**
 * GET /api/sekolah/list
 * Always returns an array. SUPER_ADMIN gets all sekolahs with _count; non-super gets their own as single-item array.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.role === "SUPER_ADMIN") {
      const list = await db.sekolah.findMany({
        orderBy: { nama: "asc" },
        select: {
          id: true,
          nama: true,
          jenjang: true,
          yayasan: true,
          alamat: true,
          logoUrl: true,
          kepalaSekolah: true,
          statusAktif: true,
          _count: {
            select: {
              siswas: true,
              pegawais: true,
              users: true,
              kelases: true,
              tahunAjarans: true,
              mapels: true,
            },
          },
        },
      });
      return NextResponse.json(list);
    }

    const sid = Number(session.user.sekolahId);
    if (!sid) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const own = await db.sekolah.findUnique({
      where: { id: sid },
      select: {
        id: true,
        nama: true,
        jenjang: true,
        yayasan: true,
        alamat: true,
        logoUrl: true,
        kepalaSekolah: true,
        statusAktif: true,
        _count: {
          select: {
            siswas: true,
            pegawais: true,
            users: true,
            kelases: true,
            tahunAjarans: true,
            mapels: true,
          },
        },
      },
    });
    return NextResponse.json(own ? [own] : []);
  } catch (e) {
    console.error("GET sekolah/list error:", e);
    return NextResponse.json({ error: "Gagal memuat daftar sekolah" }, { status: 500 });
  }
}
