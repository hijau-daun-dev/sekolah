import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";
import { getAllowedSiswaIds, getCurrentSekolahId } from "@/lib/auth-helpers";
import { absensiSiswaSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sekolahId = await getCurrentSekolahId().catch(() => null);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) {
      return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    }

    // Per-siswa isolation for ORTU/SISWA
    const allowedSiswaIds = await getAllowedSiswaIds().catch(() => null);

    const url = new URL(req.url);
    const kelasId = url.searchParams.get("kelasId");
    const tanggal = url.searchParams.get("tanggal");

    const siswaFilter: Record<string, unknown> = {};
    if (sekolahId) siswaFilter.sekolahId = sekolahId;
    if (allowedSiswaIds && allowedSiswaIds.length >= 0) {
      if (allowedSiswaIds.length === 0) {
        return NextResponse.json([]);
      }
      siswaFilter.id = { in: allowedSiswaIds };
    }

    const where: Record<string, unknown> = {};
    if (kelasId) where.kelasId = Number(kelasId);
    if (tanggal) {
      const start = new Date(tanggal);
      start.setHours(0, 0, 0, 0);
      const end = new Date(tanggal);
      end.setHours(23, 59, 59, 999);
      where.tanggal = { gte: start, lte: end };
    }
    if (Object.keys(siswaFilter).length > 0) where.siswa = siswaFilter;

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

    // Role check: only SUPER_ADMIN/TU/GURU may input absensi siswa
    const allowedRoles = ["SUPER_ADMIN", "TU", "GURU"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden: hanya TU/Guru/Admin yang dapat input absensi" }, { status: 403 });
    }

    const sekolahId = await getCurrentSekolahId().catch(() => null);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) {
      return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    }

    const body = await req.json();
    // Normalize body to array (accepts both array and { items: [...] })
    const rawArr: Array<Record<string, unknown>> = Array.isArray(body)
      ? body
      : Array.isArray(body?.items)
        ? body.items
        : null as unknown as Array<Record<string, unknown>>;

    if (!rawArr) return NextResponse.json({ error: "Body harus array atau { items: [] }" }, { status: 400 });

    // Zod validation (PRD §3)
    const parsed = absensiSiswaSchema.safeParse(
      rawArr.map((item) => ({
        siswaId: Number(item.siswaId),
        kelasId: item.kelasId != null ? Number(item.kelasId) : null,
        tanggal: item.tanggal,
        status: item.status,
        keterangan: item.keterangan ?? null,
      }))
    );
    if (!parsed.success) {
      return NextResponse.json({
        error: "Validasi gagal",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      }, { status: 400 });
    }
    const validated = parsed.data;

    const results = await db.$transaction(
      validated.map((item) =>
        db.absensiSiswa.upsert({
          where: { siswaId_tanggal: { siswaId: item.siswaId, tanggal: new Date(item.tanggal) } },
          create: {
            siswaId: item.siswaId,
            kelasId: item.kelasId ?? null,
            tanggal: new Date(item.tanggal),
            status: item.status,
            keterangan: item.keterangan || null,
          },
          update: {
            kelasId: item.kelasId != null ? item.kelasId : undefined,
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
