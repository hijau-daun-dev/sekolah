/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * generate-dummy-nilai.js
 *
 * Usage: bun scripts/generate-dummy-nilai.js
 *
 * Generates dummy Penilaian records for every Siswa × TingkatMapel × KomponenNilai
 * for BOTH semesters (Ganjil & Genap) of the active Tahun Ajaran in every sekolah.
 *
 * - Iterates each sekolah, finds the active Tahun Ajaran, finds both semesters.
 * - For each siswa (status="Aktif"), resolves their current kelas → tingkat.
 * - For each TingkatMapel at that tingkat (statusAktif=true) × each KomponenNilai of the sekolah,
 *   upserts a Penilaian record with a random nilai between 60–95.
 * - Uses semesterId on every record (required for the @@unique constraint).
 */

const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateForSekolah(sekolahId) {
  const sekolah = await db.sekolah.findUnique({ where: { id: sekolahId }, select: { id: true, nama: true } });
  if (!sekolah) {
    console.warn(`Sekolah ${sekolahId} tidak ditemukan, skip`);
    return { sekolah: `#${sekolahId}`, created: 0, skipped: 0 };
  }

  // Find active TA + all semesters
  const ta = await db.tahunAjaran.findFirst({
    where: { sekolahId, statusAktif: true },
    include: { semesters: true },
  });
  if (!ta) {
    console.warn(`Tidak ada TA aktif untuk ${sekolah.nama}, skip`);
    return { sekolah: sekolah.nama, created: 0, skipped: 0 };
  }
  const semesters = ta.semesters;
  if (semesters.length === 0) {
    console.warn(`Tidak ada semester di TA ${ta.nama} (${sekolah.nama}), skip`);
    return { sekolah: sekolah.nama, created: 0, skipped: 0 };
  }

  // KomponenNilai for sekolah
  const komponenList = await db.komponenNilai.findMany({ where: { sekolahId, statusAktif: true } });
  if (komponenList.length === 0) {
    console.warn(`Tidak ada komponen nilai untuk ${sekolah.nama}, skip`);
    return { sekolah: sekolah.nama, created: 0, skipped: 0 };
  }

  // All siswa status="Aktif"
  const siswaList = await db.siswa.findMany({
    where: { sekolahId, status: "Aktif" },
    include: {
      kelasSiswas: { include: { kelas: { select: { id: true, nama: true, tingkatId: true } } } },
    },
  });
  if (siswaList.length === 0) {
    console.warn(`Tidak ada siswa aktif untuk ${sekolah.nama}, skip`);
    return { sekolah: sekolah.nama, created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;

  for (const siswa of siswaList) {
    // Find most recent kelas to determine tingkat
    const kelasAktif = siswa.kelasSiswas[siswa.kelasSiswas.length - 1]?.kelas;
    if (!kelasAktif) {
      console.warn(`Siswa ${siswa.nama} (${sekolah.nama}) tidak punya kelas, skip`);
      skipped++;
      continue;
    }

    // TingkatMapel for this tingkat
    const tingkatMapels = await db.tingkatMapel.findMany({
      where: { tingkatId: kelasAktif.tingkatId, statusAktif: true },
    });
    if (tingkatMapels.length === 0) {
      console.warn(`Siswa ${siswa.nama} (${sekolah.nama}) tidak ada TingkatMapel di tingkat ${kelasAktif.tingkatId}`);
      skipped++;
      continue;
    }

    for (const sem of semesters) {
      for (const tm of tingkatMapels) {
        for (const k of komponenList) {
          const nilai = randInt(60, 95);
          try {
            await db.penilaian.upsert({
              where: {
                siswaId_mapelId_komponenNilaiId_semesterId: {
                  siswaId: siswa.id,
                  mapelId: tm.mapelId,
                  komponenNilaiId: k.id,
                  semesterId: sem.id,
                },
              },
              create: {
                siswaId: siswa.id,
                mapelId: tm.mapelId,
                komponenNilaiId: k.id,
                tahunAjaranId: ta.id,
                semesterId: sem.id,
                nilai,
                tanggal: new Date(),
                keterangan: "Generated oleh script dummy",
              },
              update: {
                nilai,
                tahunAjaranId: ta.id,
                keterangan: "Regenerated oleh script dummy",
              },
            });
            created++;
          } catch (e) {
            console.error(`Upsert gagal: siswa=${siswa.id} mapel=${tm.mapelId} komponen=${k.id} sem=${sem.id}:`, e.message);
            skipped++;
          }
        }
      }
    }
  }

  return { sekolah: sekolah.nama, created, skipped, semesters: semesters.length, siswa: siswaList.length };
}

async function main() {
  console.log("=== generate-dummy-nilai.js START ===");
  const sekolahs = await db.sekolah.findMany({ select: { id: true, nama: true } });
  if (sekolahs.length === 0) {
    console.error("Tidak ada sekolah. Jalankan /api/seed terlebih dahulu.");
    process.exit(1);
  }

  const results = [];
  for (const s of sekolahs) {
    console.log(`\nMemproses sekolah: ${s.nama} (id=${s.id})`);
    const r = await generateForSekolah(s.id);
    results.push(r);
    console.log(`  → created: ${r.created}, skipped: ${r.skipped}, semesters: ${r.semesters || 0}, siswa: ${r.siswa || 0}`);
  }

  console.log("\n=== RINGKASAN ===");
  console.table(results);
  console.log("=== generate-dummy-nilai.js DONE ===");
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
