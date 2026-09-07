/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * seed-jadwal-demo.js
 *
 * Populate jadwal pelajaran lengkap untuk kelas 6A (MI Al-Hidayah) dan 9A (MTs Al-Hidayah)
 * sebagai data demo untuk fitur cetak jadwal matriks.
 *
 * Format: Senin-Jumat, jam 1-8 (dengan slot istirahat di jam 4 dan jam 7)
 * Mapel yang dipakai: Matematika, B.Indonesia, B.Inggris, IPA (sesuai seed /api/seed)
 * Tambah: Upacara (Senin jam 0), Apel Pagi (Selasa-Kamis jam 1), Jumat Bersih (Jumat jam 1)
 */

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

// Slot waktu: jamKe, jamMulai, jamSelesai, isBreak, label
const SLOTS = [
  { jamKe: 0, jamMulai: "06:30", jamSelesai: "07:00", isBreak: false, label: "Upacara/Apel Pagi" },
  { jamKe: 1, jamMulai: "07:00", jamSelesai: "07:40", isBreak: false },
  { jamKe: 2, jamMulai: "07:40", jamSelesai: "08:20", isBreak: false },
  { jamKe: 3, jamMulai: "08:20", jamSelesai: "09:00", isBreak: false },
  { jamKe: 4, jamMulai: "09:00", jamSelesai: "09:15", isBreak: true, label: "ISTIRAHAT" },
  { jamKe: 5, jamMulai: "09:15", jamSelesai: "09:55", isBreak: false },
  { jamKe: 6, jamMulai: "09:55", jamSelesai: "10:35", isBreak: false },
  { jamKe: 7, jamMulai: "10:35", jamSelesai: "10:45", isBreak: true, label: "ISTIRAHAT" },
  { jamKe: 8, jamMulai: "10:45", jamSelesai: "11:25", isBreak: false },
  { jamKe: 9, jamMulai: "11:25", jamSelesai: "12:05", isBreak: false },
];

// Jadwal per kelas (key = hari, value = array of { jamKe, tipeJadwal, mapelKode?, judulKhusus?, ekskulNama? })
const JADWAL_MI_6A = {
  Senin: [
    { jamKe: 0, tipeJadwal: "khusus", judulKhusus: "Upacara Bendera" },
    { jamKe: 1, tipeJadwal: "pelajaran", mapelKode: "MAT" },
    { jamKe: 2, tipeJadwal: "pelajaran", mapelKode: "MAT" },
    { jamKe: 3, tipeJadwal: "pelajaran", mapelKode: "BIN" },
    { jamKe: 5, tipeJadwal: "pelajaran", mapelKode: "BIN" },
    { jamKe: 6, tipeJadwal: "pelajaran", mapelKode: "PAI" }, // PAI akan di-skip kalau tidak ada
    { jamKe: 8, tipeJadwal: "pelajaran", mapelKode: "IPA" },
    { jamKe: 9, tipeJadwal: "pelajaran", mapelKode: "BIG" },
  ],
  Selasa: [
    { jamKe: 0, tipeJadwal: "khusus", judulKhusus: "Apel Pagi" },
    { jamKe: 1, tipeJadwal: "pelajaran", mapelKode: "BIN" },
    { jamKe: 2, tipeJadwal: "pelajaran", mapelKode: "BIN" },
    { jamKe: 3, tipeJadwal: "pelajaran", mapelKode: "MAT" },
    { jamKe: 5, tipeJadwal: "pelajaran", mapelKode: "IPA" },
    { jamKe: 6, tipeJadwal: "pelajaran", mapelKode: "IPA" },
    { jamKe: 8, tipeJadwal: "pelajaran", mapelKode: "BIG" },
    { jamKe: 9, tipeJadwal: "pelajaran", mapelKode: "BIG" },
  ],
  Rabu: [
    { jamKe: 0, tipeJadwal: "khusus", judulKhusus: "Apel Pagi" },
    { jamKe: 1, tipeJadwal: "pelajaran", mapelKode: "IPA" },
    { jamKe: 2, tipeJadwal: "pelajaran", mapelKode: "IPA" },
    { jamKe: 3, tipeJadwal: "pelajaran", mapelKode: "MAT" },
    { jamKe: 5, tipeJadwal: "pelajaran", mapelKode: "BIG" },
    { jamKe: 6, tipeJadwal: "pelajaran", mapelKode: "BIG" },
    { jamKe: 8, tipeJadwal: "pelajaran", mapelKode: "BIN" },
    { jamKe: 9, tipeJadwal: "pelajaran", mapelKode: "BIN" },
  ],
  Kamis: [
    { jamKe: 0, tipeJadwal: "khusus", judulKhusus: "Apel/Senam Pagi" },
    { jamKe: 1, tipeJadwal: "pelajaran", mapelKode: "MAT" },
    { jamKe: 2, tipeJadwal: "pelajaran", mapelKode: "MAT" },
    { jamKe: 3, tipeJadwal: "pelajaran", mapelKode: "BIN" },
    { jamKe: 5, tipeJadwal: "pelajaran", mapelKode: "BIN" },
    { jamKe: 6, tipeJadwal: "pelajaran", mapelKode: "IPA" },
    { jamKe: 8, tipeJadwal: "pelajaran", mapelKode: "IPA" },
    { jamKe: 9, tipeJadwal: "pelajaran", mapelKode: "BIG" },
  ],
  Jumat: [
    { jamKe: 0, tipeJadwal: "khusus", judulKhusus: "Jumat Bersih" },
    { jamKe: 1, tipeJadwal: "pelajaran", mapelKode: "BIN" },
    { jamKe: 2, tipeJadwal: "pelajaran", mapelKode: "BIN" },
    { jamKe: 3, tipeJadwal: "pelajaran", mapelKode: "MAT" },
    { jamKe: 5, tipeJadwal: "ekskul", ekskulNama: "Pramuka" },
    { jamKe: 6, tipeJadwal: "ekskul", ekskulNama: "Pramuka" },
  ],
};

async function populateJadwal(sekolahId, kelasId, kelasNama, jadwalMap) {
  const ta = await db.tahunAjaran.findFirst({
    where: { sekolahId, statusAktif: true },
  });
  if (!ta) {
    console.warn(`  Tidak ada TA aktif untuk sekolah ${sekolahId}`);
    return 0;
  }

  // Get mapels indexed by kode
  const mapels = await db.mapel.findMany({
    where: { sekolahId, statusAktif: true },
  });
  const mapelByKode = {};
  mapels.forEach((m) => { mapelByKode[m.kode] = m; });

  // Get ekskul indexed by nama
  const ekskuls = await db.ekstrakurikuler.findMany({
    where: { sekolahId, statusAktif: true },
  });
  const ekskulByNama = {};
  ekskuls.forEach((e) => { ekskulByNama[e.nama] = e; });

  // Get pegawai (guru mapel + kepala + wakasek)
  const pegawais = await db.pegawai.findMany({
    where: { sekolahId, status: "Aktif" },
  });
  const guruMapel = pegawais.find((p) => p.jabatan === "Guru Mapel") || pegawais[0];
  const kepala = pegawais.find((p) => p.jabatan === "Kepala Sekolah") || pegawais[0];
  const wakasek = pegawais.find((p) => p.jabatan === "Wakil Kepala Sekolah") || pegawais[0];

  // Delete existing jadwal for this kelas
  await db.jadwalPelajaran.deleteMany({ where: { kelasId } });
  console.log(`  Cleared existing jadwal for ${kelasNama}`);

  let created = 0;

  // ===== Add ISTIRAHAT entries (one per day, at break slots) =====
  const breakSlots = SLOTS.filter((s) => s.isBreak);
  for (const hari of HARI) {
    for (const bs of breakSlots) {
      await db.jadwalPelajaran.create({
        data: {
          kelasId,
          tahunAjaranId: ta.id,
          tipeJadwal: "khusus",
          judulKhusus: bs.label, // "ISTIRAHAT"
          pegawaiId: kepala.id,
          pegawaiNamaSnapshot: kepala.nama,
          hari,
          jamKe: bs.jamKe,
          jamMulai: bs.jamMulai,
          jamSelesai: bs.jamSelesai,
          statusAktif: true,
        },
      });
      created++;
    }
  }
  console.log(`  ✓ Added ${breakSlots.length * HARI.length} ISTIRAHAT entries`);

  // ===== Add regular jadwal entries =====
  for (const hari of HARI) {
    const items = jadwalMap[hari] || [];
    for (const item of items) {
      const slot = SLOTS.find((s) => s.jamKe === item.jamKe);
      if (!slot) continue;

      // Resolve entities
      let mapelId = null;
      let pegawaiId = null;
      let pegawaiNamaSnapshot = null;
      let mapelNamaSnapshot = null;
      let ekstrakurikulerId = null;
      let judulKhusus = null;

      if (item.tipeJadwal === "pelajaran") {
        const m = mapelByKode[item.mapelKode];
        if (!m) {
          console.warn(`    Mapel kode ${item.mapelKode} tidak ditemukan, skip ${hari} jam${item.jamKe}`);
          continue;
        }
        mapelId = m.id;
        mapelNamaSnapshot = m.nama;
        // Find guru who teaches this mapel
        const gm = await db.guruMapel.findFirst({
          where: { mapelId: m.id, statusAktif: true },
          include: { pegawai: true },
        });
        if (gm) {
          pegawaiId = gm.pegawaiId;
          pegawaiNamaSnapshot = gm.pegawai.nama;
        } else {
          pegawaiId = guruMapel.id;
          pegawaiNamaSnapshot = guruMapel.nama;
        }
      } else if (item.tipeJadwal === "ekskul") {
        const e = ekskulByNama[item.ekskulNama];
        if (!e) {
          console.warn(`    Ekskul ${item.ekskulNama} tidak ditemukan, skip ${hari} jam${item.jamKe}`);
          continue;
        }
        ekstrakurikulerId = e.id;
        pegawaiId = e.pembinaId || wakasek.id;
        pegawaiNamaSnapshot = wakasek.nama;
      } else if (item.tipeJadwal === "khusus") {
        judulKhusus = item.judulKhusus;
        pegawaiId = kepala.id;
        pegawaiNamaSnapshot = kepala.nama;
      }

      await db.jadwalPelajaran.create({
        data: {
          kelasId,
          mapelId,
          pegawaiId,
          ekstrakurikulerId,
          tahunAjaranId: ta.id,
          tipeJadwal: item.tipeJadwal,
          judulKhusus,
          pegawaiNamaSnapshot,
          mapelNamaSnapshot,
          hari,
          jamKe: slot.jamKe,
          jamMulai: slot.jamMulai,
          jamSelesai: slot.jamSelesai,
          statusAktif: true,
        },
      });
      created++;
    }
  }
  console.log(`  ✓ Created ${created} jadwal entries for ${kelasNama}`);
  return created;
}

async function main() {
  console.log("=== seed-jadwal-demo.js START ===\n");

  // Find kelas 6A (MI) and 9A (MTs)
  const kelas6A = await db.kelas.findFirst({
    where: { nama: "6A" },
    include: { sekolah: true },
  });
  const kelas9A = await db.kelas.findFirst({
    where: { nama: "9A" },
    include: { sekolah: true },
  });

  let totalCreated = 0;

  if (kelas6A) {
    console.log(`Memproses kelas 6A (MI Al-Hidayah, id=${kelas6A.id})...`);
    totalCreated += await populateJadwal(kelas6A.sekolahId, kelas6A.id, "6A MI", JADWAL_MI_6A);
  } else {
    console.warn("Kelas 6A tidak ditemukan");
  }

  if (kelas9A) {
    console.log(`\nMemproses kelas 9A (MTs Al-Hidayah, id=${kelas9A.id})...`);
    totalCreated += await populateJadwal(kelas9A.sekolahId, kelas9A.id, "9A MTs", JADWAL_MI_6A); // pakai template yang sama
  } else {
    console.warn("Kelas 9A tidak ditemukan");
  }

  console.log(`\n=== SELESAI. Total jadwal dibuat: ${totalCreated} ===`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
