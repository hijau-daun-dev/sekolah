import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { autoGenerateTingkat } from "@/lib/tingkat";

export async function POST() {
  try {
    // Idempotent: check if roles already exist
    const existingRoles = await db.role.count();
    if (existingRoles > 0) {
      return NextResponse.json({
        ok: true,
        message: "Seed sudah pernah dijalankan. Dilewati.",
      });
    }

    // 1. Create roles
    const roles = await Promise.all(
      [
        { name: "SUPER_ADMIN", label: "Super Admin", description: "Akses penuh seluruh sistem & yayasan" },
        { name: "TU", label: "Admin TU", description: "Master data siswa, pegawai, kelas, kenaikan kelas" },
        { name: "KEUANGAN", label: "Admin Keuangan", description: "Tarif, tagihan, pembayaran, pengeluaran kas" },
        { name: "GURU", label: "Guru", description: "Jadwal, absensi siswa, nilai, peminjaman barang" },
        { name: "SISWA", label: "Siswa", description: "Melihat tagihan, nilai, absensi (PWA)" },
        { name: "ORTU", label: "Orang Tua/Wali", description: "Melihat tagihan anak, nilai, pengumuman (PWA)" },
      ].map((r) => db.role.create({ data: r }))
    );
    const superAdminRoleId = roles[0].id;
    const tuRoleId = roles[1].id;
    const keuanganRoleId = roles[2].id;
    const guruRoleId = roles[3].id;

    const passwordHash = await bcrypt.hash("admin123", 10);
    const tuHash = await bcrypt.hash("tu123", 10);
    const keuanganHash = await bcrypt.hash("keuangan123", 10);
    const guruHash = await bcrypt.hash("guru123", 10);

    const YAYASAN = "Yayasan Pendidikan Al-Hidayah";

    // 2. Create the two sekolahs (MI + MTs, same yayasan)
    const mi = await db.sekolah.create({
      data: {
        nama: "MI Al-Hidayah",
        npsn: "10512345",
        jenjang: "MI",
        yayasan: YAYASAN,
        alamat: "Jl. Pondok Aren No. 1, Kota Tangerang Selatan",
        telepon: "(021) 7456789",
        email: "info@mialhidayah.sch.id",
        website: "https://mialhidayah.sch.id",
        kepalaSekolah: "H. Abdullah, S.Pd.I.",
        nipKepala: "196801011995031002",
        description: "Madrasah Ibtidaiyah (setara SD) bawah Yayasan Al-Hidayah",
      },
    });
    const mts = await db.sekolah.create({
      data: {
        nama: "MTs Al-Hidayah",
        npsn: "10512346",
        jenjang: "MTs",
        yayasan: YAYASAN,
        alamat: "Jl. Pondok Aren No. 2, Kota Tangerang Selatan",
        telepon: "(021) 7456790",
        email: "info@mtsalhidayah.sch.id",
        website: "https://mtsalhidayah.sch.id",
        kepalaSekolah: "Drs. H. Miftahul Huda, M.Pd.",
        nipKepala: "196505121990031001",
        description: "Madrasah Tsanawiyah (setara SMP) bawah Yayasan Al-Hidayah",
      },
    });

    // 3. Create super admin user (linked to MI — first sekolah)
    await db.user.create({
      data: {
        email: "admin@alhidayah.sch.id",
        password: passwordHash,
        name: "Super Admin Yayasan",
        roleId: superAdminRoleId,
        sekolahId: mi.id,
      },
    });

    // 4. Helper to seed a single sekolah
    async function seedSekolah(
      sekolah: typeof mi,
      domain: string,
      kepalaNama: string,
      kepalaNip: string,
      kepalaBidangStudi: string,
      wakasekNama: string,
      wakasekNip: string,
      guruNama: string,
      guruNip: string,
      guruBidangStudi: string,
      akhirTingkatIndex: number // last index of tingkat list (highest grade)
    ) {
      // Auto-generate tingkat by jenjang
      const genResult = await autoGenerateTingkat(sekolah.id, sekolah.jenjang);
      const tingkats = await db.tingkat.findMany({
        where: { sekolahId: sekolah.id },
        orderBy: { urutan: "asc" },
      });

      // Create Tahun Ajaran + 2 Semesters
      const ta = await db.tahunAjaran.create({
        data: {
          sekolahId: sekolah.id,
          nama: "2025/2026",
          tanggalMulai: new Date("2025-07-14"),
          tanggalSelesai: new Date("2026-06-13"),
          statusAktif: true,
        },
      });
      const semGanjil = await db.semester.create({
        data: {
          sekolahId: sekolah.id,
          tahunAjaranId: ta.id,
          nama: "Ganjil",
          statusAktif: true,
          tanggalMulai: new Date("2025-07-14"),
          tanggalSelesai: new Date("2025-12-20"),
        },
      });
      const semGenap = await db.semester.create({
        data: {
          sekolahId: sekolah.id,
          tahunAjaranId: ta.id,
          nama: "Genap",
          statusAktif: false,
          tanggalMulai: new Date("2026-01-08"),
          tanggalSelesai: new Date("2026-06-13"),
        },
      });

      // KategoriMapel + 4 Mapels
      const katMapel = await db.kategoriMapel.create({
        data: { sekolahId: sekolah.id, nama: "Wajib (A)", keterangan: "Mata pelajaran wajib nasional" },
      });
      const mapels = await Promise.all(
        [
          { kode: "MAT", nama: "Matematika", jpPerMinggu: 5 },
          { kode: "BIN", nama: "Bahasa Indonesia", jpPerMinggu: 6 },
          { kode: "BIG", nama: "Bahasa Inggris", jpPerMinggu: 4 },
          { kode: "IPA", nama: "Ilmu Pengetahuan Alam", jpPerMinggu: 4 },
        ].map((m) =>
          db.mapel.create({
            data: {
              sekolahId: sekolah.id,
              kode: m.kode,
              nama: m.nama,
              kategoriMapelId: katMapel.id,
              jpPerMinggu: m.jpPerMinggu,
            },
          })
        )
      );

      // KomponenNilai for sekolah
      const komponenList = await Promise.all(
        [
          { nama: "Tugas", bobot: 25 },
          { nama: "Harian", bobot: 25 },
          { nama: "UTS", bobot: 20 },
          { nama: "UAS", bobot: 30 },
        ].map((k) =>
          db.komponenNilai.create({
            data: { sekolahId: sekolah.id, nama: k.nama, bobot: k.bobot },
          })
        )
      );

      // Pegawai: kepala, wakasek, guru
      const kepala = await db.pegawai.create({
        data: {
          sekolahId: sekolah.id,
          nip: kepalaNip,
          nama: kepalaNama,
          gender: "L",
          jabatan: "Kepala Sekolah",
          bidangStudi: kepalaBidangStudi,
          telepon: "081234567890",
          email: `kepala@${domain}`,
          orgLevel: 0,
          orgOrder: 0,
        },
      });
      const wakasek = await db.pegawai.create({
        data: {
          sekolahId: sekolah.id,
          nip: wakasekNip,
          nama: wakasekNama,
          gender: "P",
          jabatan: "Wakil Kepala Sekolah",
          bidangStudi: "Kurikulum",
          telepon: "081234567891",
          email: `wakasek@${domain}`,
          orgLevel: 1,
          orgOrder: 0,
          parentId: kepala.id,
        },
      });
      const guru = await db.pegawai.create({
        data: {
          sekolahId: sekolah.id,
          nip: guruNip,
          nama: guruNama,
          gender: "L",
          jabatan: "Guru Mapel",
          bidangStudi: guruBidangStudi,
          telepon: "081234567892",
          email: `guru@${domain}`,
          orgLevel: 2,
          orgOrder: 0,
          parentId: wakasek.id,
        },
      });

      // RiwayatKepalaSekolah (SCD Type 2) — link to kepala pegawai, status="Aktif"
      await db.riwayatKepalaSekolah.create({
        data: {
          sekolahId: sekolah.id,
          pegawaiId: kepala.id,
          namaSnapshot: kepalaNama,
          nipSnapshot: kepalaNip,
          tanggalMulai: new Date("2024-07-15"),
          tanggalSelesai: null,
          status: "Aktif",
          keterangan: "Periode kepemimpinan tahun ajaran 2024/2025 - sekarang",
        },
      });

      // TingkatMapel: assign all 4 mapels to the highest tingkat (kelas akhir sample)
      const tingkatAkhir = tingkats[akhirTingkatIndex];
      const tingkatMapels = await Promise.all(
        mapels.map((m) =>
          db.tingkatMapel.create({
            data: {
              tingkatId: tingkatAkhir.id,
              mapelId: m.id,
              jpPerMinggu: m.jpPerMinggu,
              statusAktif: true,
            },
          })
        )
      );

      // GuruMapel: guru teaches all 4 mapels at the akhir tingkat
      await Promise.all(
        mapels.map((m) =>
          db.guruMapel.create({
            data: {
              pegawaiId: guru.id,
              mapelId: m.id,
              tingkatId: tingkatAkhir.id,
              statusAktif: true,
            },
          })
        )
      );

      // 3 Ekstrakurikuler
      const ekskuls = await Promise.all(
        [
          { nama: "Pramuka", deskripsi: "Ekstrakurikuler kepramukaan wajib", hari: "Jumat", jamMulai: "14:00", jamSelesai: "16:00", tempat: "Lapangan Utama" },
          { nama: "Tahfidz Quran", deskripsi: "Menghafal Al-Qur'an", hari: "Senin", jamMulai: "14:00", jamSelesai: "15:30", tempat: "Musholla" },
          { nama: "Drumband", deskripsi: "Latihan drumband sekolah", hari: "Rabu", jamMulai: "14:00", jamSelesai: "16:00", tempat: "Aula" },
        ].map((e) =>
          db.ekstrakurikuler.create({
            data: {
              sekolahId: sekolah.id,
              nama: e.nama,
              deskripsi: e.deskripsi,
              pembinaId: wakasek.id,
              hari: e.hari,
              jamMulai: e.jamMulai,
              jamSelesai: e.jamSelesai,
              tempat: e.tempat,
              statusAktif: true,
            },
          })
        )
      );

      // 1 Kelas sample (kelas akhir)
      const kelasAkhir = await db.kelas.create({
        data: {
          sekolahId: sekolah.id,
          nama: `${tingkatAkhir.nama}A`,
          tingkatId: tingkatAkhir.id,
          tahunAjaranId: ta.id,
          walikelasId: guru.id,
          ruangan: "R. 201 Lt. 2",
          kapasitas: 36,
        },
      });

      // 2 Siswa sample
      const siswa1 = await db.siswa.create({
        data: {
          sekolahId: sekolah.id,
          nis: `${sekolah.id}001`,
          nisn: `00${sekolah.id}12345`,
          nama: `${sekolah.nama.split(" ")[0]} Siswa 1`,
          gender: "L",
          tempatLahir: "Tangerang",
          tanggalLahir: new Date("2014-03-15"),
          alamat: "Jl. Melati No. 5",
          telepon: "081234500001",
          status: "Aktif",
        },
      });
      const siswa2 = await db.siswa.create({
        data: {
          sekolahId: sekolah.id,
          nis: `${sekolah.id}002`,
          nisn: `00${sekolah.id}12346`,
          nama: `${sekolah.nama.split(" ")[0]} Siswa 2`,
          gender: "P",
          tempatLahir: "Bandung",
          tanggalLahir: new Date("2014-05-22"),
          alamat: "Jl. Mawar No. 12",
          telepon: "081234500002",
          status: "Aktif",
        },
      });
      await db.kelasSiswa.createMany({
        data: [
          { kelasId: kelasAkhir.id, siswaId: siswa1.id, tahunAjaranId: ta.id },
          { kelasId: kelasAkhir.id, siswaId: siswa2.id, tahunAjaranId: ta.id },
        ],
      });

      // Ortu + link ke siswa1
      const ortu1 = await db.ortu.create({
        data: {
          sekolahId: sekolah.id,
          nama: "Bapak Pratama",
          nik: `3201${sekolah.id}0101800001`,
          telepon: "081234500003",
          pekerjaan: "Wiraswasta",
          alamat: "Jl. Melati No. 5",
        },
      });
      await db.ortuSiswa.create({ data: { ortuId: ortu1.id, siswaId: siswa1.id, hubungan: "Ayah" } });

      // Jadwal: 1 pelajaran + 1 ekskul + 1 khusus
      await db.jadwalPelajaran.create({
        data: {
          kelasId: kelasAkhir.id,
          mapelId: mapels[0].id, // Matematika
          pegawaiId: guru.id,
          tahunAjaranId: ta.id,
          tipeJadwal: "pelajaran",
          hari: "Senin",
          jamKe: 1,
          jamMulai: "07:00",
          jamSelesai: "07:40",
        },
      });
      await db.jadwalPelajaran.create({
        data: {
          kelasId: kelasAkhir.id,
          ekstrakurikulerId: ekskuls[0].id, // Pramuka
          pegawaiId: wakasek.id,
          tahunAjaranId: ta.id,
          tipeJadwal: "ekskul",
          hari: "Jumat",
          jamKe: 8,
          jamMulai: "14:00",
          jamSelesai: "16:00",
        },
      });
      await db.jadwalPelajaran.create({
        data: {
          kelasId: kelasAkhir.id,
          pegawaiId: kepala.id,
          tahunAjaranId: ta.id,
          tipeJadwal: "khusus",
          judulKhusus: "Upacara Bendera",
          hari: "Senin",
          jamKe: 0,
          jamMulai: "06:30",
          jamSelesai: "07:00",
        },
      });

      // Master Sarana
      const lab = await db.ruangan.create({
        data: { sekolahId: sekolah.id, kode: "LAB-01", nama: "Lab Komputer", lokasi: "Lt. 1", kapasitas: 30 },
      });
      const katBarang = await db.kategoriBarang.create({
        data: { sekolahId: sekolah.id, nama: "Elektronik" },
      });
      await db.barang.create({
        data: {
          sekolahId: sekolah.id,
          kode: "LP-001",
          nama: "Laptop ASUS",
          kategoriBarangId: katBarang.id,
          ruanganId: lab.id,
          jumlah: 20,
          kondisi: "Baik",
          status: "Tersedia",
          hargaBeli: 8000000,
        },
      });

      // Master Keuangan
      const jenisSPP = await db.jenisPembayaran.create({
        data: { sekolahId: sekolah.id, nama: "SPP", keterangan: "Sumbangan Pembinaan Pendidikan bulanan" },
      });
      await db.tarifPembayaran.create({
        data: {
          sekolahId: sekolah.id,
          jenisPembayaranId: jenisSPP.id,
          tahunAjaranId: ta.id,
          tingkatId: tingkatAkhir.id,
          nominal: sekolah.jenjang === "MI" ? 200000 : 250000,
          frekuensi: "Bulanan",
        },
      });
      await db.posAnggaran.createMany({
        data: [
          { sekolahId: sekolah.id, kode: "EXP-ATK", nama: "Belanja ATK", jenis: "Pengeluaran" },
          { sekolahId: sekolah.id, kode: "EXP-LISTRIK", nama: "Pembayaran Listrik", jenis: "Pengeluaran" },
          { sekolahId: sekolah.id, kode: "EXP-GAJI", nama: "Pembayaran Gaji", jenis: "Pengeluaran" },
          { sekolahId: sekolah.id, kode: "INC-SPP", nama: "Penerimaan SPP", jenis: "Pemasukan" },
        ],
      });

      // Pengumuman sample
      await db.pengumuman.create({
        data: {
          sekolahId: sekolah.id,
          pegawaiId: kepala.id,
          judul: `Selamat Datang Tahun Ajaran 2025/2026 - ${sekolah.nama}`,
          isi: `Kepada seluruh warga sekolah ${sekolah.nama}, kami mengucapkan selamat datang di tahun ajaran baru 2025/2026. Semoga tahun ini membawa kemajuan dan keberkahan untuk kita semua.`,
          target: "Semua",
        },
      });

      // Demo users per sekolah
      const prefix = sekolah.jenjang === "MI" ? "" : "mts-";
      await db.user.create({
        data: { email: `${prefix}tu@${domain}`, password: tuHash, name: `Admin TU ${sekolah.nama}`, roleId: tuRoleId, sekolahId: sekolah.id },
      });
      await db.user.create({
        data: { email: `${prefix}keuangan@${domain}`, password: keuanganHash, name: `Admin Keuangan ${sekolah.nama}`, roleId: keuanganRoleId, sekolahId: sekolah.id },
      });
      await db.user.create({
        data: { email: `${prefix}guru@${domain}`, password: guruHash, name: guruNama, roleId: guruRoleId, sekolahId: sekolah.id, pegawaiId: guru.id },
      });

      return { ta, semGanjil, semGenap, kelasAkhir, siswa1, siswa2, tingkatAkhir, mapels, komponenList, tingkatMapels };
    }

    // 5. Seed MI Al-Hidayah (MI has 6 tingkat: index 5 = kelas 6)
    const miSeed = await seedSekolah(
      mi,
      "mialhidayah.sch.id",
      "H. Abdullah, S.Pd.I.",
      "196801011995031002",
      "Kepemimpinan",
      "Hj. Siti Khodijah, S.Pd.",
      "197203151998032003",
      "Ustadz Ahmad Fauzi, S.Pd.",
      "198005202005011002",
      "Matematika",
      5 // kelas akhir MI = kelas 6 (index 5)
    );

    // 6. Seed MTs Al-Hidayah (MTs has 3 tingkat: index 2 = kelas 9)
    const mtsSeed = await seedSekolah(
      mts,
      "mtsalhidayah.sch.id",
      "Drs. H. Miftahul Huda, M.Pd.",
      "196505121990031001",
      "Kepemimpinan",
      "Hj. Nur Aini, M.Pd.",
      "197506152002122004",
      "Ustadz Burhanudin, S.Pd.",
      "198208252008011005",
      "Matematika",
      2 // kelas akhir MTs = kelas 9 (index 2)
    );

    return NextResponse.json({
      ok: true,
      message: "Seed berhasil! Dibuat 2 sekolah (MI + MTs Al-Hidayah), tingkat auto-generated, master+transaksi lengkap. Login dengan admin@alhidayah.sch.id / admin123",
      credentials: {
        super_admin: "admin@alhidayah.sch.id / admin123",
        mi_tu: "tu@mialhidayah.sch.id / tu123",
        mi_keuangan: "keuangan@mialhidayah.sch.id / keuangan123",
        mi_guru: "guru@mialhidayah.sch.id / guru123",
        mts_tu: "mts-tu@mtsalhidayah.sch.id / tu123",
        mts_keuangan: "mts-keuangan@mtsalhidayah.sch.id / keuangan123",
        mts_guru: "mts-guru@mtsalhidayah.sch.id / guru123",
      },
      summary: {
        sekolahs: [mi.nama, mts.nama],
        mi: { tingkat: 6, mapel: miSeed.mapels.length, kelas: 1, siswa: 2 },
        mts: { tingkat: 3, mapel: mtsSeed.mapels.length, kelas: 1, siswa: 2 },
      },
    });
  } catch (e) {
    console.error("Seed error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Gagal seed" },
      { status: 500 }
    );
  }
}
