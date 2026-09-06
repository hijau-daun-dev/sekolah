import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";
import { getAllowedSiswaIds, getCurrentSekolahId, getCurrentPegawaiId } from "@/lib/auth-helpers";
import { penilaianSchema } from "@/lib/schemas";

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
    const mapelId = url.searchParams.get("mapelId");
    const komponenNilaiId = url.searchParams.get("komponenNilaiId");
    const semesterId = url.searchParams.get("semesterId");
    const tanggal = url.searchParams.get("tanggal");

    // GURU: restrict to their mapels (via GuruMapel)
    const guruPegawaiId = await getCurrentPegawaiId();
    let restrictedMapelIds: number[] | null = null;
    if (session.user.role === "GURU" && guruPegawaiId) {
      const gms = await db.guruMapel.findMany({
        where: { pegawaiId: guruPegawaiId, statusAktif: true },
        select: { mapelId: true },
      });
      restrictedMapelIds = gms.map((g) => g.mapelId);
    }

    const siswaFilter: Record<string, unknown> = {};
    if (sekolahId) siswaFilter.sekolahId = sekolahId;
    if (allowedSiswaIds && allowedSiswaIds.length >= 0) {
      if (allowedSiswaIds.length === 0) {
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
    if (semesterId) where.semesterId = Number(semesterId);
    if (tanggal) where.tanggal = new Date(tanggal);
    if (restrictedMapelIds) where.mapelId = { in: restrictedMapelIds };
    if (Object.keys(siswaFilter).length > 0) where.siswa = siswaFilter;

    const data = await db.penilaian.findMany({
      where,
      include: {
        siswa: { select: { id: true, nama: true, nis: true } },
        mapel: { select: { id: true, nama: true, kode: true } },
        komponenNilai: { select: { id: true, nama: true, bobot: true } },
        semester: { select: { id: true, nama: true, tahunAjaranId: true } },
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

    const allowedRoles = ["SUPER_ADMIN", "TU", "GURU"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden: hanya TU/Guru/Admin yang dapat input nilai" }, { status: 403 });
    }

    const sekolahId = await getCurrentSekolahId().catch(() => null);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) {
      return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    }

    const body = await req.json();
    const rawArr: Array<Record<string, unknown>> = Array.isArray(body)
      ? body
      : Array.isArray(body?.items)
        ? body.items
        : null as unknown as Array<Record<string, unknown>>;

    if (!rawArr) return NextResponse.json({ error: "Body harus array atau { items: [] }" }, { status: 400 });

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

    // Default semesterId: if not provided, use active semester for the sekolah
    let activeSemesterId: number | null = null;
    if (sekolahId) {
      const aktif = await db.semester.findFirst({ where: { sekolahId, statusAktif: true }, select: { id: true } });
      activeSemesterId = aktif?.id ?? null;
    } else {
      const aktif = await db.semester.findFirst({ where: { statusAktif: true }, select: { id: true } });
      activeSemesterId = aktif?.id ?? null;
    }

    // Resolve semesterId for each item: body's value, else active. If still null → reject (need semester for unique key).
    const finalItems = validated.map((item, idx) => {
      const raw = rawArr[idx];
      const tahunAjaranId = raw.tahunAjaranId != null ? Number(raw.tahunAjaranId) : null;
      const semesterId = raw.semesterId != null ? Number(raw.semesterId) : activeSemesterId;
      const tanggal = raw.tanggal ? new Date(String(raw.tanggal)) : new Date();
      return { item, tahunAjaranId, semesterId, tanggal };
    });
    const missingSem = finalItems.find((f) => f.semesterId == null);
    if (missingSem) {
      return NextResponse.json({ error: "semesterId wajib (tidak ada semester aktif ditemukan)" }, { status: 400 });
    }

    const results = await db.$transaction(
      finalItems.map(({ item, tahunAjaranId, semesterId, tanggal }) => {
        return db.penilaian.upsert({
          where: {
            siswaId_mapelId_komponenNilaiId_semesterId: {
              siswaId: item.siswaId,
              mapelId: item.mapelId,
              komponenNilaiId: item.komponenNilaiId,
              semesterId: semesterId as number,
            },
          },
          create: {
            siswaId: item.siswaId,
            mapelId: item.mapelId,
            komponenNilaiId: item.komponenNilaiId,
            tahunAjaranId,
            semesterId,
            nilai: item.nilai,
            tanggal,
            keterangan: item.keterangan || null,
          },
          update: {
            nilai: item.nilai,
            tahunAjaranId: tahunAjaranId != null ? tahunAjaranId : undefined,
            semesterId: semesterId !== undefined ? semesterId : undefined,
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
