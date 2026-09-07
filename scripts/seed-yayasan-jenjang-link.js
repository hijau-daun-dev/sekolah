/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * seed-yayasan-jenjang-link.js
 *
 * One-off script: link sekolah yang sudah ada ke yayasan + jenjang yang baru.
 * Idempotent: cek dulu sebelum update.
 *
 * Logic:
 *   1. Pastikan 7 jenjang default sudah ada di DB (auto-seeded via /api/jenjang GET)
 *   2. Cari/create Yayasan "Yayasan Pendidikan Al-Hidayah" (sesuai data seed awal)
 *   3. Update sekolah MI Al-Hidayah → set jenjangId=MI.id, yayasanId=yayasan.id
 *   4. Update sekolah MTs Al-Hidayah → set jenjangId=MTs.id, yayasanId=yayasan.id
 */

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const DEFAULT_JENJANG = [
  { kode: "SD", nama: "Sekolah Dasar", urutan: 1, keterangan: "Sekolah Dasar (negeri/swasta)" },
  { kode: "MI", nama: "Madrasah Ibtidaiyah", urutan: 1, keterangan: "Setara SD, bawah Kemenag" },
  { kode: "SMP", nama: "Sekolah Menengah Pertama", urutan: 2, keterangan: "Sekolah Menengah Pertama (negeri/swasta)" },
  { kode: "MTs", nama: "Madrasah Tsanawiyah", urutan: 2, keterangan: "Setara SMP, bawah Kemenag" },
  { kode: "MA", nama: "Madrasah Aliyah", urutan: 3, keterangan: "Setara SMA, bawah Kemenag" },
  { kode: "SMA", nama: "Sekolah Menengah Atas", urutan: 3, keterangan: "Sekolah Menengah Atas (negeri/swasta)" },
  { kode: "SMK", nama: "Sekolah Menengah Kejuruan", urutan: 3, keterangan: "Sekolah Menengah Kejuruan (negeri/swasta)" },
];

async function main() {
  console.log("=== seed-yayasan-jenjang-link.js START ===\n");

  // 1. Ensure default jenjang exists
  console.log("[1/3] Memastikan 7 jenjang default ada di DB...");
  for (const j of DEFAULT_JENJANG) {
    const existing = await db.jenjang.findUnique({ where: { kode: j.kode } });
    if (!existing) {
      await db.jenjang.create({ data: { ...j, statusAktif: true } });
      console.log(`  + Created jenjang: ${j.kode} - ${j.nama}`);
    } else {
      console.log(`  ✓ Jenjang ${j.kode} sudah ada`);
    }
  }

  // 2. Create Yayasan Al-Hidayah kalau belum ada
  console.log("\n[2/3] Memastikan Yayasan Al-Hidayah ada...");
  let yayasan = await db.yayasan.findFirst({ where: { nama: "Yayasan Pendidikan Al-Hidayah" } });
  if (!yayasan) {
    yayasan = await db.yayasan.create({
      data: {
        nama: "Yayasan Pendidikan Al-Hidayah",
        alamat: "Jl. Pondok Aren No. 1, Kota Tangerang Selatan",
        telepon: "(021) 7456789",
        email: "info@alhidayah.yayasan.id",
        website: "https://alhidayah.yayasan.id",
        ketuaYayasan: "H. Abdullah, S.Pd.I.",
        description: "Yayasan pembina MI Al-Hidayah dan MTs Al-Hidayah",
        statusAktif: true,
      },
    });
    console.log(`  + Created yayasan: ${yayasan.nama} (id=${yayasan.id})`);
  } else {
    console.log(`  ✓ Yayasan ${yayasan.nama} sudah ada (id=${yayasan.id})`);
  }

  // 3. Link sekolah ke jenjang + yayasan
  console.log("\n[3/3] Linking sekolah ke jenjang + yayasan...");
  const sekolahs = await db.sekolah.findMany();
  for (const s of sekolahs) {
    const jenjangKode = s.jenjang; // "MI" atau "MTs" dari seed awal
    const jenjang = await db.jenjang.findUnique({ where: { kode: jenjangKode } });
    if (!jenjang) {
      console.warn(`  ⚠️  Jenjang "${jenjangKode}" tidak ditemukan untuk sekolah ${s.nama}, skip`);
      continue;
    }
    if (s.jenjangId === jenjang.id && s.yayasanId === yayasan.id) {
      console.log(`  ✓ ${s.nama} sudah ter-link ke jenjang ${jenjang.kode} + yayasan`);
      continue;
    }
    await db.sekolah.update({
      where: { id: s.id },
      data: { jenjangId: jenjang.id, yayasanId: yayasan.id },
    });
    console.log(`  + ${s.nama} → jenjang=${jenjang.kode}, yayasan=${yayasan.nama}`);
  }

  // Summary
  const totalYayasan = await db.yayasan.count();
  const totalJenjang = await db.jenjang.count();
  const totalSekolahLinked = await db.sekolah.count({ where: { yayasanId: { not: null } } });
  console.log("\n=== RINGKASAN ===");
  console.log(`  Total Yayasan: ${totalYayasan}`);
  console.log(`  Total Jenjang: ${totalJenjang}`);
  console.log(`  Sekolah ter-link ke yayasan: ${totalSekolahLinked}`);
  console.log("=== DONE ===");

  await db.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
