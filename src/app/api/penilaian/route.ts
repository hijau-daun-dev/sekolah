import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";
import { getAllowedSiswaIds, getCurrentSekolahId } from "@/lib/auth-helpers";
import { penilaianSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sekolahId = await getCurrentSekolahId().catch(() => null);
    // SUPER_ADMIN has no sekolahId; others must have one
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) {
      return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    }

    // Per-siswa isolation for ORTU/SISWA
    const allowedSiswaIds = await getAllowedSiswaIds().catch(() => null);

    const url = new URL(req.url);
    const kelasId = url.searchParams.get("kelasId");
    const mapelId = url.searchParams.get("mapelId");
    const komponenNilaiId = url.searchParams.get("komponenNilaiId");

    const siswaFilter: Record<string, unknown> = {};
    if (sekolahId) siswaFilter.sekolahId = sekolahId;
    if (allowedSiswaIds && allowedSiswaIds.length >= 0) {
      // null => no filter (admin/guru); array => restrict to those siswa IDs
      if (allowedSiswaIds.length === 0) {
        // ORTU with no children or unknown role → return nothing
        return NextResponse.json([]);
      }
      siswaFilter.id = { in: allowedSiswaIds };
    }
    if (kelasId) {
      siswaFilter.kelasSiswas = { some: { kelasId: Number(kelasId) } };
    }

    const where: Record<string, unknown> = {};
    if (mapelId) where.mapelId = Number(mapelId);
    if (komponenNilaiId) where.komponenNilaiId = Number(komponenNilaiId);
    if (Object.keys(siswaFilter).length > 0) where.siswa = siswaFilter;

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

    // Role check: only SUPER_ADMIN/TU/GURU may input penilaian
    const allowedRoles = ["SUPER_ADMIN", "TU", "GURU"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden: hanya TU/Guru/Admin yang dapat input nilai" }, { status: 403 });
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

    // Zod validation (PRD §3). Schema only covers core fields (siswaId, mapelId,
    // komponenNilaiId, nilai, keterangan); tahunAjaranId & tanggal are read from
    // rawArr below for the upsert (not part of the schema).
    const parsed = penilaianSchema.safeParse(
      rawArr.map((item) => ({
        siswaId: Number(item.siswaId),
        mapelId: Number(item.mapelId),
        komponenNilaiId: Number(item.komponenNilaiId),
        nilai: Number(item.nilai),
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
      validated.map((item, idx) => {
        const raw = rawArr[idx];
        const tahunAjaranId = raw.tahunAjaranId != null ? Number(raw.tahunAjaranId) : null;
        const tanggal = raw.tanggal ? new Date(String(raw.tanggal)) : new Date();
        return db.penilaian.upsert({
          where: {
            siswaId_mapelId_komponenNilaiId: {
              siswaId: item.siswaId,
              mapelId: item.mapelId,
              komponenNilaiId: item.komponenNilaiId,
            },
          },
          create: {
            siswaId: item.siswaId,
            mapelId: item.mapelId,
            komponenNilaiId: item.komponenNilaiId,
            tahunAjaranId,
            nilai: item.nilai,
            tanggal,
            keterangan: item.keterangan || null,
          },
          update: {
            nilai: item.nilai,
            tahunAjaranId: tahunAjaranId != null ? tahunAjaranId : undefined,
            tanggal,
            keterangan: item.keterangan || null,
          },
        });
      })
    );
    return NextResponse.json({ saved: results.length });
  } catch (e) {
    console.error("POST penilaian error:", e);
    return NextResponse.json({ error: "Gagal menyimpan penilaian" }, { status: 500 });
  }
}
