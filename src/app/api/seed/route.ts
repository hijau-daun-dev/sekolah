import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

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

    // 2. Create default school
    const sekolah = await db.sekolah.create({
      data: {
        nama: "SD-SMP Nusantara Jaya",
        npsn: "20100123",
        alamat: "Jl. Pendidikan No. 1, Kel. Maju, Kec. Jaya, Kota Nusantara",
        telepon: "(021) 1234567",
        email: "info@nusantarajaya.sch.id",
        website: "https://nusantarajaya.sch.id",
        kepalaSekolah: "Dr. Bambang Sutrisno, M.Pd.",
        nipKepala: "196505121990031001",
        description: "Sekolah unggulan jenjang SD-SMP berbasis karakter",
      },
    });

    // 3. Create super admin user
    const passwordHash = await bcrypt.hash("admin123", 10);
    await db.user.create({
      data: {
        email: "admin@nusantarajaya.sch.id",
        password: passwordHash,
        name: "Super Admin",
        roleId: roles[0].id, // SUPER_ADMIN
        sekolahId: sekolah.id,
      },
    });

    // 4. Create demo users for each role
    const tuHash = await bcrypt.hash("tu123", 10);
    const keuanganHash = await bcrypt.hash("keuangan123", 10);
    const guruHash = await bcrypt.hash("guru123", 10);

    await db.user.create({
      data: { email: "tu@nusantarajaya.sch.id", password: tuHash, name: "Admin TU", roleId: roles[1].id, sekolahId: sekolah.id },
    });
    await db.user.create({
      data: { email: "keuangan@nusantarajaya.sch.id", password: keuanganHash, name: "Admin Keuangan", roleId: roles[2].id, sekolahId: sekolah.id },
    });

    // 5. Create Kepala Sekolah pegawai + Guru pegawai, link to user
    const kepala = await db.pegawai.create({
      data: {
        sekolahId: sekolah.id,
        nip: "196505121990031001",
        nama: "Dr. Bambang Sutrisno, M.Pd.",
        gender: "L",
        jabatan: "Kepala Sekolah",
        bidangStudi: "Kepemimpinan",
        telepon: "081234567890",
        email: "bambang@nusantarajaya.sch.id",
        orgLevel: 0,
        orgOrder: 0,
      },
    });
    const wakasek = await db.pegawai.create({
      data: {
        sekolahId: sekolah.id,
        nip: "197003151995122001",
        nama: "Siti Aminah, S.Pd.",
        gender: "P",
        jabatan: "Wakil Kepala Sekolah",
        bidangStudi: "Kurikulum",
        telepon: "081234567891",
        email: "siti@nusantarajaya.sch.id",
        orgLevel: 1,
        orgOrder: 0,
        parentId: kepala.id,
      },
    });
    const guruKelas = await db.pegawai.create({
      data: {
        sekolahId: sekolah.id,
        nip: "198005202005011002",
        nama: "Ahmad Fauzi, S.Pd.",
        gender: "L",
        jabatan: "Guru Kelas",
        bidangStudi: "Matematika",
        telepon: "081234567892",
        email: "fauzi@nusantarajaya.sch.id",
        orgLevel: 2,
        orgOrder: 0,
        parentId: wakasek.id,
      },
    });
    await db.user.create({
      data: { email: "guru@nusantarajaya.sch.id", password: guruHash, name: "Ahmad Fauzi, S.Pd.", roleId: roles[3].id, sekolahId: sekolah.id, pegawaiId: guruKelas.id },
    });

    // 6. Master Data Akademik
    const ta = await db.tahunAjaran.create({
      data: {
        sekolahId: sekolah.id,
        nama: "2025/2026",
        tanggalMulai: new Date("2025-07-14"),
        tanggalSelesai: new Date("2026-06-13"),
        statusAktif: true,
      },
    });
    await db.semester.create({
      data: {
        sekolahId: sekolah.id,
        tahunAjaranId: ta.id,
        nama: "Ganjil",
        statusAktif: true,
        tanggalMulai: new Date("2025-07-14"),
        tanggalSelesai: new Date("2025-12-20"),
      },
    });
    await db.semester.create({
      data: {
        sekolahId: sekolah.id,
        tahunAjaranId: ta.id,
        nama: "Genap",
        statusAktif: false,
        tanggalMulai: new Date("2026-01-08"),
        tanggalSelesai: new Date("2026-06-13"),
      },
    });

    // Tingkat SD (1-6) & SMP (7-9)
    const tingkatNames = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const tingkats: { id: number }[] = [];
    for (let i = 0; i < tingkatNames.length; i++) {
      const t = await db.tingkat.create({
        data: {
          sekolahId: sekolah.id,
          nama: tingkatNames[i],
          jenjang: i < 6 ? "SD" : "SMP",
          urutan: i,
        },
      });
      tingkats.push(t);
    }

    // Sample kelas
    const kelas6A = await db.kelas.create({
      data: {
        sekolahId: sekolah.id,
        nama: "6A",
        tingkatId: tingkats[5].id,
        tahunAjaranId: ta.id,
        walikelasId: guruKelas.id,
        ruangan: "R. 201 Lt. 2",
        kapasitas: 36,
      },
    });

    // Sample siswa
    const siswa1 = await db.siswa.create({
      data: {
        sekolahId: sekolah.id,
        nis: "2021001",
        nisn: "0012345678",
        nama: "Andi Pratama",
        gender: "L",
        tempatLahir: "Jakarta",
        tanggalLahir: new Date("2014-03-15"),
        alamat: "Jl. Melati No. 5",
        telepon: "081234500001",
        status: "Aktif",
      },
    });
    const siswa2 = await db.siswa.create({
      data: {
        sekolahId: sekolah.id,
        nis: "2021002",
        nisn: "0012345679",
        nama: "Bunga Lestari",
        gender: "P",
        tempatLahir: "Bandung",
        tanggalLahir: new Date("2014-05-22"),
        alamat: "Jl. Mawar No. 12",
        telepon: "081234500002",
        status: "Aktif",
      },
    });
    // Daftarkan ke kelas
    await db.kelasSiswa.createMany({
      data: [
        { kelasId: kelas6A.id, siswaId: siswa1.id, tahunAjaranId: ta.id },
        { kelasId: kelas6A.id, siswaId: siswa2.id, tahunAjaranId: ta.id },
      ],
    });

    // Master Akademik lainnya
    const katMapel = await db.kategoriMapel.create({
      data: { sekolahId: sekolah.id, nama: "Wajib (A)", keterangan: "Mata pelajaran wajib nasional" },
    });
    const mapelMat = await db.mapel.create({
      data: { sekolahId: sekolah.id, kode: "MAT-06", nama: "Matematika", kategoriMapelId: katMapel.id, jpPerMinggu: 5 },
    });
    const mapelBindo = await db.mapel.create({
      data: { sekolahId: sekolah.id, kode: "BIN-06", nama: "Bahasa Indonesia", kategoriMapelId: katMapel.id, jpPerMinggu: 6 },
    });
    await db.komponenNilai.createMany({
      data: [
        { sekolahId: sekolah.id, nama: "Tugas", bobot: 25 },
        { sekolahId: sekolah.id, nama: "Harian", bobot: 25 },
        { sekolahId: sekolah.id, nama: "UTS", bobot: 20 },
        { sekolahId: sekolah.id, nama: "UAS", bobot: 30 },
      ],
    });
    await db.guruMapel.create({
      data: { pegawaiId: guruKelas.id, mapelId: mapelMat.id, kelasId: kelas6A.id },
    });

    // Sample jadwal
    await db.jadwalPelajaran.create({
      data: {
        kelasId: kelas6A.id,
        mapelId: mapelMat.id,
        pegawaiId: guruKelas.id,
        tahunAjaranId: ta.id,
        hari: "Senin",
        jamKe: 1,
        jamMulai: "07:00",
        jamSelesai: "07:40",
      },
    });
    await db.jadwalPelajaran.create({
      data: {
        kelasId: kelas6A.id,
        mapelId: mapelBindo.id,
        pegawaiId: guruKelas.id,
        tahunAjaranId: ta.id,
        hari: "Senin",
        jamKe: 2,
        jamMulai: "07:40",
        jamSelesai: "08:20",
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
    await db.tarifPembayaran.createMany({
      data: [
        { sekolahId: sekolah.id, jenisPembayaranId: jenisSPP.id, tahunAjaranId: ta.id, tingkatId: tingkats[5].id, nominal: 250000, frekuensi: "Bulanan" },
        { sekolahId: sekolah.id, jenisPembayaranId: jenisSPP.id, tahunAjaranId: ta.id, tingkatId: tingkats[6].id, nominal: 300000, frekuensi: "Bulanan" },
        { sekolahId: sekolah.id, jenisPembayaranId: jenisSPP.id, tahunAjaranId: ta.id, tingkatId: tingkats[7].id, nominal: 300000, frekuensi: "Bulanan" },
        { sekolahId: sekolah.id, jenisPembayaranId: jenisSPP.id, tahunAjaranId: ta.id, tingkatId: tingkats[8].id, nominal: 350000, frekuensi: "Bulanan" },
      ],
    });
    await db.posAnggaran.createMany({
      data: [
        { sekolahId: sekolah.id, kode: "EXP-ATK", nama: "Belanja ATK", jenis: "Pengeluaran" },
        { sekolahId: sekolah.id, kode: "EXP-LISTRIK", nama: "Pembayaran Listrik", jenis: "Pengeluaran" },
        { sekolahId: sekolah.id, kode: "EXP-GAJI", nama: "Pembayaran Gaji", jenis: "Pengeluaran" },
        { sekolahId: sekolah.id, kode: "INC-SPP", nama: "Penerimaan SPP", jenis: "Pemasukan" },
      ],
    });

    // Ortu + link ke siswa
    const ortu1 = await db.ortu.create({
      data: { sekolahId: sekolah.id, nama: "Bapak Pratama", telepon: "081234500003", pekerjaan: "Wiraswasta", alamat: "Jl. Melati No. 5" },
    });
    await db.ortuSiswa.create({ data: { ortuId: ortu1.id, siswaId: siswa1.id, hubungan: "Ayah" } });

    // Pengumuman sample
    await db.pengumuman.create({
      data: {
        sekolahId: sekolah.id,
        pegawaiId: kepala.id,
        judul: "Selamat Datang Tahun Ajaran 2025/2026",
        isi: "Kepada seluruh warga sekolah, kami mengucapkan selamat datang di tahun ajaran baru 2025/2026. Semoga tahun ini membawa kemajuan dan keberkahan untuk kita semua.",
        target: "Semua",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Seed berhasil! Login dengan admin@nusantarajaya.sch.id / admin123",
      credentials: {
        super_admin: "admin@nusantarajaya.sch.id / admin123",
        tu: "tu@nusantarajaya.sch.id / tu123",
        keuangan: "keuangan@nusantarajaya.sch.id / keuangan123",
        guru: "guru@nusantarajaya.sch.id / guru123",
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
