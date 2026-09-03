import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getCurrentSekolahId } from "@/lib/auth-helpers";
import { generateKelasSchema } from "@/lib/schemas";

/**
 * POST /api/generate-kelas
 * PRD Alur 1 (Awal Tahun Ajaran — Kenaikan Kelas)
 *
 * Body: { tahunAjaranIdLama: number, tahunAjaranIdBaru: number }
 *
 * For each KelasSiswa in tahunAjaranIdLama:
 *  - Resolve old kelas.tingkat (jenjang + urutan)
 *  - Find next tingkat (same jenjang, urutan = current + 1)
 *  - If next tingkat exists:
 *      - Find a Kelas in tahunAjaranIdBaru whose tingkatId = nextTingkat.id
 *        and nama = nextTingkat.nama + suffix (suffix derived from old kelas nama minus the old tingkat prefix)
 *      - If no matching kelas exists → skip (warning)
 *      - If exists → create KelasSiswa in tahunAjaranIdBaru (dedup by [kelasId, siswaId])
 *  - If no next tingkat (siswa in kelas akhir) → update Siswa.status = "Lulus"
 *
 * Auth: SUPER_ADMIN/TU only.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowedRoles = ["SUPER_ADMIN", "TU"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden: hanya TU/Super Admin yang dapat generate kelas" }, { status: 403 });
    }

    const sekolahId = await getCurrentSekolahId().catch(() => null);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) {
      return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    }

    const body = await req.json();
    // Zod validation (PRD §3)
    const parsed = generateKelasSchema.safeParse({
      tahunAjaranIdLama: Number(body?.tahunAjaranIdLama),
      tahunAjaranIdBaru: Number(body?.tahunAjaranIdBaru),
    });
    if (!parsed.success) {
      return NextResponse.json({
        error: "Validasi gagal",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      }, { status: 400 });
    }
    const { tahunAjaranIdLama, tahunAjaranIdBaru } = parsed.data;

    // Additional business rule: TAs must differ
    if (tahunAjaranIdLama === tahunAjaranIdBaru) {
      return NextResponse.json({ error: "Tahun ajaran lama dan baru tidak boleh sama" }, { status: 400 });
    }

    const taLamaId = tahunAjaranIdLama;
    const taBaruId = tahunAjaranIdBaru;

    // Verify both TAs belong to sekolah (if non-superadmin)
    const taFilter = sekolahId ? { sekolahId } : {};
    const [taLama, taBaru] = await Promise.all([
      db.tahunAjaran.findFirst({ where: { id: taLamaId, ...taFilter } }),
      db.tahunAjaran.findFirst({ where: { id: taBaruId, ...taFilter } }),
    ]);
    if (!taLama) return NextResponse.json({ error: "Tahun ajaran lama tidak ditemukan" }, { status: 404 });
    if (!taBaru) return NextResponse.json({ error: "Tahun ajaran baru tidak ditemukan" }, { status: 404 });

    // Load all kelas in TA lama with their tingkat
    const oldKelasList = await db.kelas.findMany({
      where: { tahunAjaranId: taLamaId, ...taFilter },
      include: { tingkat: true },
    });

    // Load all kelas in TA baru with their tingkat — indexed by (tingkatId, nama)
    const newKelasList = await db.kelas.findMany({
      where: { tahunAjaranId: taBaruId, ...taFilter },
      include: { tingkat: true },
    });
    const newKelasMap = new Map<string, (typeof newKelasList)[number]>();
    for (const k of newKelasList) {
      newKelasMap.set(`${k.tingkatId}::${k.nama}`, k);
    }

    // All tingkat in sekolah, indexed by (jenjang, urutan)
    const allTingkat = await db.tingkat.findMany({ where: taFilter });
    const tingkatByJenjangUrutan = new Map<string, (typeof allTingkat)[number]>();
    for (const t of allTingkat) {
      if (t.jenjang) tingkatByJenjangUrutan.set(`${t.jenjang}::${t.urutan}`, t);
    }

    // Load all kelasSiswa in TA lama, including siswa + kelas.tingkat
    const oldKelasSiswa = await db.kelasSiswa.findMany({
      where: { tahunAjaranId: taLamaId },
      include: {
        siswa: { select: { id: true, nama: true, status: true, sekolahId: true } },
        kelas: { include: { tingkat: true } },
      },
    });

    // Filter by sekolah if non-superadmin (via siswa.sekolahId)
    const visibleOldKelasSiswa = sekolahId
      ? oldKelasSiswa.filter((ks) => ks.siswa.sekolahId === sekolahId)
      : oldKelasSiswa;

    type Detail = {
      siswaId: number;
      siswaNama: string;
      oldKelasNama: string;
      oldTingkatNama: string;
      action: "promoted" | "graduated" | "skipped";
      newKelasNama?: string;
      newTingkatNama?: string;
      reason?: string;
    };

    const details: Detail[] = [];
    let promoted = 0;
    let graduated = 0;
    let skipped = 0;

    // Helper: derive suffix from old kelas nama minus old tingkat prefix
    const deriveSuffix = (kelasNama: string, tingkatNama: string): string => {
      if (kelasNama.startsWith(tingkatNama)) {
        return kelasNama.slice(tingkatNama.length);
      }
      // fallback: take trailing alphabetic chars
      const m = kelasNama.match(/[A-Za-z]+$/);
      return m ? m[0] : "";
    };

    await db.$transaction(async (tx) => {
      for (const ks of visibleOldKelasSiswa) {
        const oldTingkat = ks.kelas?.tingkat;
        if (!oldTingkat || !oldTingkat.jenjang) {
          skipped++;
          details.push({
            siswaId: ks.siswaId,
            siswaNama: ks.siswa.nama,
            oldKelasNama: ks.kelas?.nama || "-",
            oldTingkatNama: oldTingkat?.nama || "-",
            action: "skipped",
            reason: "Tingkat kelas tidak lengkap (jenjang/urutan kosong)",
          });
          continue;
        }

        const nextTingkat = tingkatByJenjangUrutan.get(
          `${oldTingkat.jenjang}::${oldTingkat.urutan + 1}`
        );

        if (!nextTingkat) {
          // Siswa in kelas akhir → graduate
          await tx.siswa.update({
            where: { id: ks.siswaId },
            data: { status: "Lulus" },
          });
          graduated++;
          details.push({
            siswaId: ks.siswaId,
            siswaNama: ks.siswa.nama,
            oldKelasNama: ks.kelas?.nama || "-",
            oldTingkatNama: oldTingkat.nama,
            action: "graduated",
          });
          continue;
        }

        // Build new kelas nama = nextTingkat.nama + suffix
        const suffix = deriveSuffix(ks.kelas?.nama || "", oldTingkat.nama);
        const newKelasNama = `${nextTingkat.nama}${suffix}`;
        const newKelas = newKelasMap.get(`${nextTingkat.id}::${newKelasNama}`);

        if (!newKelas) {
          skipped++;
          details.push({
            siswaId: ks.siswaId,
            siswaNama: ks.siswa.nama,
            oldKelasNama: ks.kelas?.nama || "-",
            oldTingkatNama: oldTingkat.nama,
            action: "skipped",
            reason: `Tidak ada kelas "${newKelasNama}" (tingkat ${nextTingkat.nama}) di tahun ajaran baru`,
          });
          continue;
        }

        // Dedup: skip if siswa already in this new kelas for the new TA
        const existing = await tx.kelasSiswa.findFirst({
          where: { kelasId: newKelas.id, siswaId: ks.siswaId },
          select: { id: true },
        });
        if (existing) {
          skipped++;
          details.push({
            siswaId: ks.siswaId,
            siswaNama: ks.siswa.nama,
            oldKelasNama: ks.kelas?.nama || "-",
            oldTingkatNama: oldTingkat.nama,
            action: "skipped",
            newKelasNama: newKelas.nama,
            newTingkatNama: nextTingkat.nama,
            reason: "Siswa sudah terdaftar di kelas tujuan",
          });
          continue;
        }

        await tx.kelasSiswa.create({
          data: {
            kelasId: newKelas.id,
            siswaId: ks.siswaId,
            tahunAjaranId: taBaruId,
          },
        });
        promoted++;
        details.push({
          siswaId: ks.siswaId,
          siswaNama: ks.siswa.nama,
          oldKelasNama: ks.kelas?.nama || "-",
          oldTingkatNama: oldTingkat.nama,
          action: "promoted",
          newKelasNama: newKelas.nama,
          newTingkatNama: nextTingkat.nama,
        });
      }
    });

    return NextResponse.json({
      promoted,
      graduated,
      skipped,
      total: visibleOldKelasSiswa.length,
      details,
    });
  } catch (e) {
    console.error("POST generate-kelas error:", e);
    return NextResponse.json({ error: "Gagal generate kelas kenaikan" }, { status: 500 });
  }
}
