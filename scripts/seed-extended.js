/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * seed-extended.js
 *
 * Usage: bun scripts/seed-extended.js
 *
 * Extends the base /api/seed output with comprehensive transactional data:
 *  - Tambah kelas A di setiap tingkat (MI: 6 kelas, MTs: 3 kelas)
 *  - 15-20 siswa per kelas dengan NIS/NISN unik, ortu, KelasSiswa
 *  - Pegawai tambahan (guru mapel, TU, keuangan, staf) dengan org structure
 *  - TingkatMapel & GuruMapel untuk semua tingkat
 *  - TagihanSiswa SPP untuk 3 bulan (Juli, Agustus, September 2025)
 *  - Pembayaran untuk ~60% tagihan Juli & ~40% tagihan Agustus (lunas)
 *  - AbsensiSiswa untuk 5 hari kerja terakhir
 *  - AbsensiPegawai untuk 5 hari kerja terakhir
 *  - Pengeluaran (5-10 per sekolah bulan ini)
 *  - PeminjamanBarang (2-3 per sekolah, campuran Dipinjam/Dikembalikan)
 *  - GaleriBerita (3-5 per sekolah)
 *  - EkstrakurikulerSiswa (5-10 siswa per ekskul)
 *
 * IDEMPOTENT: cek existing data sebelum create. Aman dijalankan berulang.
 */

const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

// ---------- helpers ----------
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pad(num, len) {
  return String(num).padStart(len, "0");
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function isWeekday(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0=Sun, 6=Sat
}

// ---------- data pools ----------
const NAMA_DEPAN_L = ["Ahmad", "Muhammad", "Abdul", "Fauzan", "Rizki", "Hafidz", "Yusuf", "Ibrahim", "Hamzah", "Umar", "Ali", "Hasan", "Husein", "Zaki", "Farhan", "Naufal", "Ridho", "Faiz", "Bayu", "Dimas"];
const NAMA_DEPAN_P = ["Siti", "Aisyah", "Khadijah", "Fatimah", "Zahra", "Nabila", "Hana", "Aulia", "Rahma", "Salwa", "Najwa", "Hanifah", "Maryam", "Asma", "Lubna", "Zahidah", "Rifqah", "Husna", "Maysa", "Qonita"];
const NAMA_BELAKANG = ["Pratama", "Saputra", "Wijaya", "Hidayat", "Maulana", "Fauzi", "Rahman", "Kurniawan", "Setiawan", "Hakim", "Najib", "Ramadhan", "Mubarok", "Latif", "Anwar", "Solihin", "Mahmud", "Syukur", "Amin", "Yusuf"];
const TEMPAT_LAHIR = ["Tangerang", "Bandung", "Jakarta", "Bekasi", "Bogor", "Depok", "Serang", "Cilegon", "Cirebon", "Sukabumi"];
const NAMA_ORTU_L = ["Bapak", "H. ", "H. ", ""];
const PEKERJAAN = ["Wiraswasta", "PNS", "Guru", "Pedagang", "Karyawan Swasta", "TNI/Polri", "Petani", "Buruh", "Pensiunan", "Dokter"];
const JABATAN_GURU = ["Guru Mapel", "Guru Kelas", "Guru BK", "Wali Kelas"];
const BIDANG_STUDI = ["Matematika", "Bahasa Indonesia", "Bahasa Inggris", "IPA", "IPS", "PAI", "PKn", "Olahraga", "Seni Budaya", "Informatika"];

const BULAN_TAGIHAN = ["Juli", "Agustus", "September"];
const STATUS_ABS = ["Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Sakit", "Izin", "Alpa"]; // 5/8 Hadir
const STATUS_ABS_PEGAWAI = ["Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Sakit", "Izin", "Dinas Luar"]; // 6/9 Hadir

const KATEGORI_GALERI = ["Kegiatan", "Prestasi", "Event", "Akademik", "Ekstrakurikuler"];
const JUDUL_GALERI = [
  "Semarak Hut RI ke-80",
  "Lomba Tahfidz Tingkat Sekolah",
  "Kegiatan Pramuka Akhir Pekan",
  "Pentas Seni Akhir Tahun",
  "Kunjungan Edukasi Museum",
  "Penyerahan Penghargaan Siswa Berprestasi",
  "Bakti Sosial Ramadhan",
  "Festival Sains Pelajar",
];

const KETERANGAN_PENGELUARAN = [
  "Pembelian ATK untuk kantor",
  "Pembayaran token listrik bulanan",
  "Honor pembina ekstrakurikuler",
  "Biaya perawatan AC ruang kelas",
  "Pembelian buku perpustakaan",
  "Konsumsi rapat dewan guru",
  "Biaya cetak ujian tengah semester",
  "Pembelian alat olahraga baru",
  "Service printer ruang TU",
  "Pembelian galon air mineral",
];

// ---------- main ----------
async function main() {
  console.log("=== seed-extended.js START ===\n");

  const sekolahs = await db.sekolah.findMany({
    include: {
      tahunAjarans: { where: { statusAktif: true }, take: 1 },
      tingkats: { orderBy: { urutan: "asc" }, include: { kelases: true } },
    },
  });

  if (sekolahs.length === 0) {
    console.error("Tidak ada sekolah. Jalankan POST /api/seed terlebih dahulu.");
    process.exit(1);
  }

  const totals = {
    kelasBaru: 0,
    siswaBaru: 0,
    ortuBaru: 0,
    pegawaiBaru: 0,
    tingkatMapelBaru: 0,
    guruMapelBaru: 0,
    tagihanBaru: 0,
    pembayaranBaru: 0,
    absensiSiswaBaru: 0,
    absensiPegawaiBaru: 0,
    pengeluaranBaru: 0,
    peminjamanBaru: 0,
    galeriBaru: 0,
    ekskulSiswaBaru: 0,
  };

  // Script-global counter for kwitansi (must NOT reset per sekolah)
  let kwitansiCounter = 0;

  for (const sekolah of sekolahs) {
    console.log(`\n--- Proses sekolah: ${sekolah.nama} (id=${sekolah.id}) ---`);
    const ta = sekolah.tahunAjarans[0];
    if (!ta) {
      console.warn(`  Tidak ada TA aktif, skip`);
      continue;
    }
    console.log(`  TA aktif: ${ta.nama} (id=${ta.id})`);

    // ===== 1. Tambah pegawai baru (jika kurang dari 6) =====
    console.log(`  [1/9] Cek pegawai...`);
    const existingPegawai = await db.pegawai.findMany({
      where: { sekolahId: sekolah.id },
      orderBy: { id: "asc" },
    });
    const kepala = existingPegawai.find((p) => p.jabatan === "Kepala Sekolah");
    const wakasek = existingPegawai.find((p) => p.jabatan === "Wakil Kepala Sekolah");

    // Tambah 4 guru mapel baru + 1 TU + 1 keuangan + 1 staf sarana
    const pegawaiBaruList = [];
    const pegawaiToAdd = [
      { idx: 1, nama: "Ustadz Ridho Mubarok, S.Pd.", gender: "L", jabatan: "Guru Mapel", bidangStudi: "Bahasa Indonesia", nip: `${sekolah.id}-GURU-BIN-01` },
      { idx: 2, nama: "Asma Hakim, S.Pd.", gender: "P", jabatan: "Guru Mapel", bidangStudi: "Bahasa Inggris", nip: `${sekolah.id}-GURU-BIG-01` },
      { idx: 3, nama: "Hafidz Maulana, M.Pd.", gender: "L", jabatan: "Guru Mapel", bidangStudi: "IPA", nip: `${sekolah.id}-GURU-IPA-01` },
      { idx: 4, nama: "Aisyah Latif, S.Pd.", gender: "P", jabatan: "Guru Kelas", bidangStudi: "PGSD", nip: `${sekolah.id}-GURU-PGSD-01` },
      { idx: 5, nama: "Fatimah Anwar", gender: "P", jabatan: "Staf TU", bidangStudi: "Administrasi", nip: `${sekolah.id}-TU-01` },
      { idx: 6, nama: "Ali Syukur", gender: "L", jabatan: "Staf Keuangan", bidangStudi: "Akuntansi", nip: `${sekolah.id}-KEU-01` },
    ];

    for (const pn of pegawaiToAdd) {
      // Cek duplikat NIP (deterministic — idempotent across runs)
      const exists = await db.pegawai.findFirst({ where: { sekolahId: sekolah.id, nip: pn.nip } });
      if (exists) {
        pegawaiBaruList.push(exists);
        continue;
      }
      const created = await db.pegawai.create({
        data: {
          sekolahId: sekolah.id,
          nip: pn.nip,
          nama: pn.nama,
          gender: pn.gender,
          tempatLahir: pick(TEMPAT_LAHIR),
          tanggalLahir: new Date(`${randInt(1980, 1995)}-${pad(randInt(1, 12), 2)}-${pad(randInt(1, 28), 2)}`),
          jabatan: pn.jabatan,
          bidangStudi: pn.bidangStudi,
          telepon: `0812${pad(randInt(10000000, 99999999), 8)}`,
          email: `pegawai${pn.idx}@${sekolah.email?.split("@")[1] || "sekolah.sch.id"}`,
          orgLevel: pn.jabatan.includes("Guru") ? 2 : 1,
          orgOrder: pegawaiBaruList.length,
          parentId: pn.jabatan.includes("Guru") ? wakasek?.id : kepala?.id,
        },
      });
      pegawaiBaruList.push(created);
      totals.pegawaiBaru++;
    }
    const allPegawai = [...existingPegawai, ...pegawaiBaruList];
    const guruPegawai = allPegawai.filter((p) => p.jabatan?.includes("Guru") || p.jabatan === "Wakil Kepala Sekolah");
    console.log(`  → Total pegawai sekarang: ${allPegawai.length} (${totals.pegawaiBaru} baru ditambahkan di run ini)`);

    // ===== 2. Pastikan kelas A ada di setiap tingkat =====
    console.log(`  [2/9] Generate kelas A per tingkat...`);
    const allTingkat = sekolah.tingkats;
    const kelasByTingkat = {}; // {tingkatId: kelasObj}
    for (const t of allTingkat) {
      let kelasA = t.kelases.find((k) => k.nama === `${t.nama}A`);
      if (!kelasA) {
        // cari ulang di DB
        kelasA = await db.kelas.findFirst({ where: { sekolahId: sekolah.id, nama: `${t.nama}A`, tingkatId: t.id } });
      }
      if (!kelasA) {
        // walikelas: pegawai pertama yang jabatannya Guru Kelas atau Guru Mapel
        const walikelas = guruPegawai[allTingkat.indexOf(t) % guruPegawai.length];
        kelasA = await db.kelas.create({
          data: {
            sekolahId: sekolah.id,
            nama: `${t.nama}A`,
            tingkatId: t.id,
            tahunAjaranId: ta.id,
            walikelasId: walikelas?.id ?? null,
            ruangan: `R. ${t.nama}01`,
            kapasitas: 36,
          },
        });
        totals.kelasBaru++;
        console.log(`    + Dibuat kelas ${kelasA.nama} (walikelas: ${walikelas?.nama ?? "-"})`);
      }
      kelasByTingkat[t.id] = kelasA;
    }
    const allKelas = Object.values(kelasByTingkat);
    console.log(`  → Total kelas sekarang: ${allKelas.length}`);

    // ===== 3. TingkatMapel & GuruMapel untuk semua tingkat =====
    console.log(`  [3/9] Pastikan TingkatMapel & GuruMapel untuk semua tingkat...`);
    const mapels = await db.mapel.findMany({ where: { sekolahId: sekolah.id, statusAktif: true } });
    for (const t of allTingkat) {
      for (const m of mapels) {
        let tm = await db.tingkatMapel.findUnique({
          where: { tingkatId_mapelId: { tingkatId: t.id, mapelId: m.id } },
        });
        if (!tm) {
          tm = await db.tingkatMapel.create({
            data: { tingkatId: t.id, mapelId: m.id, jpPerMinggu: m.jpPerMinggu ?? 4, statusAktif: true },
          });
          totals.tingkatMapelBaru++;
        }
        // Assign 1 guru per mapel per tingkat (round-robin)
        const guru = guruPegawai[allTingkat.indexOf(t) % guruPegawai.length];
        if (guru) {
          const existingGm = await db.guruMapel.findUnique({
            where: { pegawaiId_mapelId_tingkatId: { pegawaiId: guru.id, mapelId: m.id, tingkatId: t.id } },
          });
          if (!existingGm) {
            await db.guruMapel.create({
              data: { pegawaiId: guru.id, mapelId: m.id, tingkatId: t.id, statusAktif: true },
            });
            totals.guruMapelBaru++;
          }
        }
      }
    }
    console.log(`  → +${totals.tingkatMapelBaru} TingkatMapel, +${totals.guruMapelBaru} GuruMapel`);

    // ===== 4. Siswa per kelas (15-20 per kelas A) =====
    console.log(`  [4/9] Generate siswa per kelas A...`);
    const existingSiswaCount = await db.siswa.count({ where: { sekolahId: sekolah.id } });
    const TARGET_SISWA_PER_KELAS = sekolah.jenjang === "MI" ? 18 : 22;
    let siswaCounter = existingSiswaCount;

    for (const t of allTingkat) {
      const kelasA = kelasByTingkat[t.id];
      // Hitung siswa yang sudah ada di kelas ini
      const existingInKelas = await db.kelasSiswa.count({ where: { kelasId: kelasA.id, tahunAjaranId: ta.id } });
      const needed = Math.max(0, TARGET_SISWA_PER_KELAS - existingInKelas);

      for (let i = 0; i < needed; i++) {
        siswaCounter++;
        const gender = Math.random() > 0.5 ? "L" : "P";
        const namaDepan = gender === "L" ? pick(NAMA_DEPAN_L) : pick(NAMA_DEPAN_P);
        const nama = `${namaDepan} ${pick(NAMA_BELAKANG)}`;
        const nis = `${sekolah.id}${pad(t.urutan + 1, 2)}${pad(siswaCounter, 3)}`;
        const nisn = `0${randInt(100, 999)}${pad(randInt(10000000, 99999999), 8)}`;

        const tglLahirYear = sekolah.jenjang === "MI" ? 2019 - t.urutan : 2019 - (t.urutan + 6);
        const siswa = await db.siswa.create({
          data: {
            sekolahId: sekolah.id,
            nis,
            nisn,
            nama,
            gender,
            tempatLahir: pick(TEMPAT_LAHIR),
            tanggalLahir: new Date(`${tglLahirYear}-${pad(randInt(1, 12), 2)}-${pad(randInt(1, 28), 2)}`),
            alamat: `Jl. ${pick(["Melati", "Mawar", "Kenanga", "Cempaka", "Anggrek", "Dahlia", "Tulip", "Lavender"])} No. ${randInt(1, 200)}`,
            telepon: `0813${pad(randInt(10000000, 99999999), 8)}`,
            status: "Aktif",
          },
        });
        await db.kelasSiswa.create({
          data: { kelasId: kelasA.id, siswaId: siswa.id, tahunAjaranId: ta.id },
        });

        // Ortu (ayah) untuk siswa ini
        const ortu = await db.ortu.create({
          data: {
            sekolahId: sekolah.id,
            nama: `${pick(NAMA_ORTU_L)} ${pick(NAMA_DEPAN_L)} ${pick(NAMA_BELAKANG)}`,
            nik: `3201${sekolah.id}${pad(siswaCounter, 6)}${randInt(10, 99)}`,
            telepon: `0812${pad(randInt(10000000, 99999999), 8)}`,
            pekerjaan: pick(PEKERJAAN),
            alamat: siswa.alamat,
            statusAktif: true,
          },
        });
        await db.ortuSiswa.create({ data: { ortuId: ortu.id, siswaId: siswa.id, hubungan: "Ayah" } });
        totals.siswaBaru++;
        totals.ortuBaru++;
      }
    }
    console.log(`  → +${totals.siswaBaru} siswa, +${totals.ortuBaru} ortu`);

    // ===== 5. TagihanSiswa SPP untuk 3 bulan =====
    console.log(`  [5/9] Generate TagihanSiswa SPP (Juli/Agustus/September)...`);
    const tarifs = await db.tarifPembayaran.findMany({
      where: { sekolahId: sekolah.id, tahunAjaranId: ta.id, statusAktif: true },
      include: { jenisPembayaran: true },
    });
    const allSiswa = await db.siswa.findMany({
      where: { sekolahId: sekolah.id, status: "Aktif" },
      include: { kelasSiswas: { include: { kelas: { select: { tingkatId: true } } }, orderBy: { id: "desc" }, take: 1 } },
    });

    for (const tarif of tarifs) {
      for (const siswa of allSiswa) {
        // Cek apakah tarif ini berlaku untuk siswa ini (matching tingkat or null)
        const siswaTingkatId = siswa.kelasSiswas[0]?.kelas.tingkatId;
        if (tarif.tingkatId !== null && tarif.tingkatId !== siswaTingkatId) continue;

        for (const bulan of BULAN_TAGIHAN) {
          // Cek duplikat
          const exists = await db.tagihanSiswa.findFirst({
            where: { siswaId: siswa.id, tarifPembayaranId: tarif.id, bulanTagihan: bulan },
          });
          if (exists) continue;

          // Tanggal jatuh tempo: akhir bulan tersebut
          const year = 2025;
          const monthIdx = BULAN_TAGIHAN.indexOf(bulan) + 6; // Juli=6
          const lastDay = new Date(year, monthIdx + 1, 0).getDate();
          const jatuhTempo = new Date(year, monthIdx, lastDay);

          await db.tagihanSiswa.create({
            data: {
              siswaId: siswa.id,
              tarifPembayaranId: tarif.id,
              tahunAjaranId: ta.id,
              bulanTagihan: bulan,
              nominal: tarif.nominal,
              statusLunas: false,
              tanggalJatuhTempo: jatuhTempo,
            },
          });
          totals.tagihanBaru++;
        }
      }
    }
    console.log(`  → +${totals.tagihanBaru} tagihan SPP`);

    // ===== 6. Pembayaran untuk ~60% Juli + ~40% Agustus =====
    console.log(`  [6/9] Generate Pembayaran...`);
    const petugasKeuangan = allPegawai.find((p) => p.jabatan === "Staf Keuangan") || allPegawai[0];
    const tagihanByBulan = {
      Juli: await db.tagihanSiswa.findMany({ where: { tahunAjaranId: ta.id, bulanTagihan: "Juli" }, include: { siswa: true } }),
      Agustus: await db.tagihanSiswa.findMany({ where: { tahunAjaranId: ta.id, bulanTagihan: "Agustus" }, include: { siswa: true } }),
      September: await db.tagihanSiswa.findMany({ where: { tahunAjaranId: ta.id, bulanTagihan: "September" }, include: { siswa: true } }),
    };

    const METODE_LIST = ["Tunai", "Transfer", "Debit", "QRIS"];
    async function bayar(tagihan, tanggalBayar) {
      // Cek apakah sudah ada pembayaran untuk tagihan ini
      const existing = await db.pembayaran.findFirst({ where: { tagihanSiswaId: tagihan.id } });
      if (existing) return false;

      // Retry on kodeKwitansi collision (rare but possible)
      let created = false;
      for (let attempt = 0; attempt < 3 && !created; attempt++) {
        const kode = `KWT-${tanggalBayar.toISOString().slice(0, 10).replace(/-/g, "")}-${pad(++kwitansiCounter, 5)}`;
        try {
          await db.$transaction([
            db.pembayaran.create({
              data: {
                tagihanSiswaId: tagihan.id,
                pegawaiId: petugasKeuangan.id,
                tanggalBayar,
                jumlahBayar: tagihan.nominal,
                metodePembayaran: pick(METODE_LIST),
                kodeKwitansi: kode,
                keterangan: `Pembayaran ${tagihan.bulanTagihan} - ${tagihan.siswa.nama}`,
              },
            }),
            db.tagihanSiswa.update({ where: { id: tagihan.id }, data: { statusLunas: true } }),
          ]);
          created = true;
        } catch (e) {
          if (e?.code === "P2002" && attempt < 2) {
            // Collision on kodeKwitansi — retry with next counter
            continue;
          }
          throw e;
        }
      }
      return created;
    }

    // 60% Juli
    const juliCount = Math.floor(tagihanByBulan.Juli.length * 0.6);
    const juliSample = [...tagihanByBulan.Juli].sort(() => Math.random() - 0.5).slice(0, juliCount);
    for (const t of juliSample) {
      if (await bayar(t, new Date(2025, 6, randInt(5, 28)))) totals.pembayaranBaru++;
    }
    // 40% Agustus
    const agustusCount = Math.floor(tagihanByBulan.Agustus.length * 0.4);
    const agustusSample = [...tagihanByBulan.Agustus].sort(() => Math.random() - 0.5).slice(0, agustusCount);
    for (const t of agustusSample) {
      if (await bayar(t, new Date(2025, 7, randInt(5, 28)))) totals.pembayaranBaru++;
    }
    // 15% September
    const septCount = Math.floor(tagihanByBulan.September.length * 0.15);
    const septSample = [...tagihanByBulan.September].sort(() => Math.random() - 0.5).slice(0, septCount);
    for (const t of septSample) {
      if (await bayar(t, new Date(2025, 8, randInt(1, 5)))) totals.pembayaranBaru++;
    }
    console.log(`  → +${totals.pembayaranBaru} pembayaran (kwitansi)`);

    // ===== 7. AbsensiSiswa untuk 5 hari kerja terakhir =====
    console.log(`  [7/9] Generate AbsensiSiswa (5 hari kerja terakhir)...`);
    const hariKerja = [];
    let cursor = startOfDay(new Date());
    while (hariKerja.length < 5) {
      if (isWeekday(cursor)) hariKerja.push(new Date(cursor));
      cursor = addDays(cursor, -1);
    }

    // Ambil siswa di kelas A per tingkat (sample: kelas akhir + 1 kelas lain untuk variasi)
    const kelasUntukAbsen = allKelas.slice(0, Math.min(3, allKelas.length));
    for (const kelas of kelasUntukAbsen) {
      const siswaDiKelas = await db.kelasSiswa.findMany({
        where: { kelasId: kelas.id, tahunAjaranId: ta.id },
        include: { siswa: true },
      });
      for (const ks of siswaDiKelas) {
        for (const tgl of hariKerja) {
          const exists = await db.absensiSiswa.findUnique({
            where: { siswaId_tanggal: { siswaId: ks.siswaId, tanggal: tgl } },
          });
          if (exists) continue;
          const status = pick(STATUS_ABS);
          await db.absensiSiswa.create({
            data: {
              siswaId: ks.siswaId,
              kelasId: kelas.id,
              tanggal: tgl,
              status,
              keterangan: status === "Hadir" ? null : `${status} - ${pick(["Sakit demam", "Izin keluarga", "Acara keluarga", "Kurang sehat"])}`,
            },
          });
          totals.absensiSiswaBaru++;
        }
      }
    }
    console.log(`  → +${totals.absensiSiswaBaru} absensi siswa (3 kelas × 5 hari)`);

    // ===== 8. AbsensiPegawai untuk 5 hari kerja terakhir =====
    console.log(`  [8/9] Generate AbsensiPegawai...`);
    for (const pgw of allPegawai) {
      for (const tglOriginal of hariKerja) {
        // Use a fresh Date copy for each iteration to avoid mutation leaks
        const tgl = startOfDay(tglOriginal);
        const exists = await db.absensiPegawai.findUnique({
          where: { pegawaiId_tanggal: { pegawaiId: pgw.id, tanggal: tgl } },
        });
        if (exists) continue;
        const status = pick(STATUS_ABS_PEGAWAI);
        const jamMasuk = status === "Hadir" ? new Date(tgl.getFullYear(), tgl.getMonth(), tgl.getDate(), 7, randInt(0, 30), 0, 0) : null;
        const jamPulang = status === "Hadir" ? new Date(tgl.getFullYear(), tgl.getMonth(), tgl.getDate(), 15, randInt(0, 30), 0, 0) : null;
        await db.absensiPegawai.create({
          data: {
            pegawaiId: pgw.id,
            tanggal: tgl,
            jamMasuk,
            jamPulang,
            status,
            keterangan: status === "Hadir" ? null : `${status} - ${pick(["Sakit", "Izin", "Dinas luar kota", "Rapat dinas"])}`,
          },
        });
        totals.absensiPegawaiBaru++;
      }
    }
    console.log(`  → +${totals.absensiPegawaiBaru} absensi pegawai`);

    // ===== 9. Pengeluaran, PeminjamanBarang, GaleriBerita, EkstrakurikulerSiswa =====
    console.log(`  [9/9] Generate Pengeluaran, Peminjaman, Galeri, EkskulSiswa...`);
    const posAnggarans = await db.posAnggaran.findMany({ where: { sekolahId: sekolah.id, jenis: "Pengeluaran" } });
    const barangs = await db.barang.findMany({ where: { sekolahId: sekolah.id, status: "Tersedia" } });

    // Pengeluaran: 8 records bulan ini
    const pengeluaranCount = await db.pengeluaran.count({ where: { posAnggaran: { sekolahId: sekolah.id } } });
    if (pengeluaranCount < 5) {
      for (let i = 0; i < 8; i++) {
        const pos = pick(posAnggarans);
        if (!pos) break;
        await db.pengeluaran.create({
          data: {
            pegawaiId: petugasKeuangan.id,
            posAnggaranId: pos.id,
            tanggal: new Date(2025, 8, randInt(1, 5)),
            nominal: randInt(1, 20) * 100000,
            keterangan: pick(KETERANGAN_PENGELUARAN),
          },
        });
        totals.pengeluaranBaru++;
      }
    }
    console.log(`    +${totals.pengeluaranBaru} pengeluaran`);

    // PeminjamanBarang: 3 records (1 masih dipinjam, 2 sudah dikembalikan)
    const peminjamanCount = await db.peminjamanBarang.count();
    if (peminjamanCount < 2 && barangs.length > 0) {
      const peminjam = allPegawai.filter((p) => p.jabatan?.includes("Guru"));
      for (let i = 0; i < 3; i++) {
        const barang = barangs[i % barangs.length];
        const pgw = peminjam[i % peminjam.length];
        if (!barang || !pgw) break;
        const tglPinjam = new Date(2025, 8, randInt(1, 5));
        const tglKembaliRencana = addDays(tglPinjam, 3);
        const isReturned = i >= 1;
        await db.peminjamanBarang.create({
          data: {
            barangId: barang.id,
            peminjamPegawaiId: pgw.id,
            tanggalPinjam: tglPinjam,
            tanggalKembaliRencana: tglKembaliRencana,
            tanggalKembaliAktual: isReturned ? addDays(tglPinjam, randInt(1, 3)) : null,
            kondisiKembali: isReturned ? "Baik" : null,
            status: isReturned ? "Dikembalikan" : "Dipinjam",
            keterangan: pick(["Untuk pembelajaran di kelas", "Untuk kegiatan ekstrakurikuler", "Untuk rapat presentasi"]),
          },
        });
        // Update status barang
        if (!isReturned) {
          await db.barang.update({ where: { id: barang.id }, data: { status: "Dipinjam" } });
        }
        totals.peminjamanBaru++;
      }
    }
    console.log(`    +${totals.peminjamanBaru} peminjaman barang`);

    // GaleriBerita: 5 records
    const galeriCount = await db.galeriBerita.count({ where: { sekolahId: sekolah.id } });
    if (galeriCount < 3) {
      for (let i = 0; i < 5; i++) {
        await db.galeriBerita.create({
          data: {
            sekolahId: sekolah.id,
            judul: pick(JUDUL_GALERI),
            konten: `Kegiatan ini dilaksanakan pada bulan ${pick(["Juli", "Agustus", "September"])} 2025 di ${pick(["Aula Sekolah", "Lapangan Utama", "Ruang Kelas", "Halaman Sekolah"])}. Kegiatan diikuti oleh seluruh siswa dan dimentori oleh dewan guru. Tujuan kegiatan ini adalah untuk meningkatkan kebersamaan, kreativitas, dan prestasi siswa ${sekolah.nama}.`,
            kategori: pick(KATEGORI_GALERI),
            tanggalPosting: new Date(2025, randInt(6, 8), randInt(1, 28)),
            statusAktif: true,
          },
        });
        totals.galeriBaru++;
      }
    }
    console.log(`    +${totals.galeriBaru} galeri berita`);

    // EkstrakurikulerSiswa: 5-10 siswa per ekskul
    const ekskuls = await db.ekstrakurikuler.findMany({ where: { sekolahId: sekolah.id, statusAktif: true } });
    const allSiswaForEkskul = await db.siswa.findMany({ where: { sekolahId: sekolah.id, status: "Aktif" } });
    for (const eks of ekskuls) {
      const pesertaCount = randInt(5, Math.min(10, allSiswaForEkskul.length));
      const peserta = [...allSiswaForEkskul].sort(() => Math.random() - 0.5).slice(0, pesertaCount);
      for (const s of peserta) {
        const exists = await db.ekstrakurikulerSiswa.findUnique({
          where: { ekstrakurikulerId_siswaId: { ekstrakurikulerId: eks.id, siswaId: s.id } },
        });
        if (exists) continue;
        await db.ekstrakurikulerSiswa.create({
          data: { ekstrakurikulerId: eks.id, siswaId: s.id, status: "Aktif" },
        });
        totals.ekskulSiswaBaru++;
      }
    }
    console.log(`    +${totals.ekskulSiswaBaru} peserta ekskul`);

    console.log(`  --- Sekolah ${sekolah.nama} selesai ---`);
  }

  console.log("\n=== RINGKASAN TOTAL ===");
  console.table(totals);
  console.log("=== seed-extended.js DONE ===");
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
