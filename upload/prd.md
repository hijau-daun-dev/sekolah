PRODUCT REQUIREMENTS DOCUMENT (PRD)
Aplikasi Manajemen Sekolah (SD - SMP)

Versi: 1.0 Final
Status: Approved for Development
Tech Stack: Next.js (App Router), PostgreSQL, Prisma ORM, NextAuth.js, TailwindCSS.
1. PENDAHULUAN

Aplikasi Manajemen Sekolah adalah sistem informasi terpadu yang dirancang untuk mengotomatisasi proses administrasi, akademik, dan keuangan di sekolah jenjang SD hingga SMP. Sistem ini dirancang dengan arsitektur yang siap untuk Multi-Tenancy (Yayasan/Multi-Sekolah) dan akan diimplementasikan secara bertahap, diakhiri dengan ekstensi berupa PWA (Progressive Web App) agar dapat diakses oleh Orang Tua/Siswa melalui smartphone.
2. TARGET PENGGUNA (USER ROLES)

    Super Admin: Mengelola pengaturan sistem, hak akses, dan data yayasan.
    Admin TU: Mengelola master data siswa, pegawai, kelas, dan kenaikan kelas.
    Admin Keuangan: Mengelola tarif, tagihan, penerimaan pembayaran, dan pengeluaran kas.
    Guru: Menginput jadwal, absensi siswa, nilai, dan meminjam barang inventaris.
    Siswa & Orang Tua: Melihat tagihan, melihat nilai/absensi, dan menerima pengumuman (via PWA).

3. RANCANGAN KEAMANAN SISTEM (SECURITY DESIGN)

Keamanan sistem dirancang berlapis (Defense in Depth) mulai dari jaringan, aplikasi, hingga level database.

    Autentikasi (Authentication):
         Menggunakan NextAuth.js (Auth.js) dengan strategi Credentials Provider.
         Password di-hash menggunakan algoritma bcrypt sebelum disimpan ke database.
         Penerapan sesi berbasis JWT (JSON Web Token) dengan httpOnly cookies untuk mencegah serangan XSS (Cross-Site Scripting).
    Otorisasi (Authorization / RBAC):
         Sistem memvalidasi role pengguna (Super Admin, TU, Keuangan, Guru, Siswa, Ortu) di dua tingkat:
             Middleware Next.js: Memblokir akses rute (URL) yang tidak sesuai dengan role (misal: Guru mencoba mengakses URL /admin/keuangan).
             API Level: Memastikan bahwa request API yang masuk benar-benar memiliki hak akses untuk mengeksekusi perintah tersebut.
    Keamanan Data & Database:
         SQL Injection Prevention: Semua interaksi database wajib menggunakan Prisma ORM. Prisma menggunakan parameterized queries yang otomatis men-sanitize input berbahaya.
         Validasi Input: Semua data yang masuk melalui API (terutama nominal uang dan nilai siswa) divalidasi secara ketat menggunakan library Zod.
         Isolasi Multi-Tenancy (Yayasan): Setiap tabel master dan transaksional memiliki kolom sekolah_id. Pada level query Prisma, sistem wajib melakukan filter WHERE sekolah_id = user.sekolah_id agar Sekolah A tidak dapat melihat/mengubah data Sekolah B.
    Keamanan PWA (Mobile App):
         API hanya mengirimkan data yang relevan (misal: Orang Tua hanya bisa memanggil API tagihan milik siswa_id anaknya sendiri, bukan anak orang lain).

4. KEBUTUHAN FUNGSIONAL (DATA MASTER & TRANSAKSIONAL)
I. KELOMPOK MASTER DATA (Data Induk/Statis)

(Semua tabel memiliki kolom sekolah_id untuk antisipasi multi-sekolah).

    Master Data Personalia: Master Siswa, Master Pegawai (Guru & Staf), Master Orang Tua/Wali. Termasuk Tabel Jembatan ortu_siswa (1 ortu bisa punya banyak anak).
    Master Data Akademik: Master Tahun Ajaran, Semester, Tingkat/Jenjang, Jurusan (NULL untuk SD/SMP), Kelas/Ruang, Kategori Mapel, Mata Pelajaran, Komponen Nilai. Termasuk Tabel Jembatan kelas_siswa dan guru_mapel.
    Master Data Sarana & Prasarana: Master Ruangan, Master Kategori Barang, Master Barang/Inventaris.
    Master Data Keuangan: Master Jenis Pembayaran, Master Tarif Pembayaran (per Jenis, per Tingkat, per Tahun Ajaran), Master Pos Anggaran.
    Master Data Sistem: Master Role, Master Pengaturan Sekolah.

II. KELOMPOK DATA TRANSAKSIONAL (Dinamis/Harian)

    Transaksi Akademik: Trx Jadwal Pelajaran, Trx Absensi Siswa (Harian/Jam), Trx Penilaian (per komponen), Trx Absensi Pegawai.
    Transaksi Keuangan: Trx Tagihan Siswa, Trx Pembayaran (Kwitansi), Trx Pengeluaran Kas.
    Transaksi Sarana: Trx Peminjaman Barang.
    Transaksi Komunikasi: Trx Pengumuman, Trx Galeri/Berita.

5. ALUR LENGKAP SISTEM (DETAILED WORKFLOWS)

Berikut adalah detail interaksi data pada setiap alur proses:

ALUR 1: Awal Tahun Ajaran Baru (Kenaikan Kelas)

    Admin TU menginput data baru ke Master Tahun Ajaran (misal: 2024/2025) dan men-set status_aktif = true. Sistem otomatis mengubah status_aktif tahun ajaran sebelumnya menjadi false.
    Admin TU menjalankan fitur "Generate Kelas". Sistem membuat baris baru di tabel jembatan kelas_siswa untuk mendafarkan siswa kelas 5 ke kelas 6 di tahun ajaran baru.
    Untuk siswa kelas 6 (kelas akhir) tahun lalu, sistem mengubah field status pada Master Siswa dari "Aktif" menjadi "Lulus".
    Admin Keuangan membuat Master Tarif Pembayaran baru (misal: SPP kelas 6 nominal Rp 500.000) terkait tahun ajaran baru.
    Sistem menjalankan fitur "Generate Tagihan". Sistem membaca semua siswa dengan status "Aktif", mencocokkan tarif berdasarkan tingkat kelasnya, lalu melakukan insert data ke Trx Tagihan Siswa dengan status status_lunas = false.

ALUR 2: Kegiatan Belajar Mengajar (Harian)

    Guru melakukan login. Sistem mengecek Master Role memastakan user tersebut adalah "Guru".
    Guru melihat Trx Jadwal Pelajaran hari ini. Sistem menampilkan jadwal: Mengajar Matematika di kelas 6A jam ke-2.
    Guru membuka menu Absensi. Sistem mengambil daftar siswa dari tabel kelas_siswa yang terdaftar di kelas 6A tahun ajaran aktif.
    Guru memberi tanda (Sakit/Hadir) dan submit. Sistem menyimpan data tanggal dan status ke Trx Absensi Siswa.
    Saat input nilai, sistem kembali memanggil data siswa dari kelas_siswa. Guru menginput nilai UTS. Sistem menyimpan angka ke Trx Penilaian dengan mereferensikan mapel_id, siswa_id (via kelas_siswa), dan komponen_nilai_id (UTS).

ALUR 3: Pembayaran SPP oleh Orang Tua / Siswa

    Orang Tua login via Web/PWA. Sistem mengecek Master Role (Ortu).
    Sistem mengecek tabel ortu_siswa, menemukan Orang Tua ini memiliki anak dengan siswa_id = 123 (Andi).
    Sistem melakukan query ke Trx Tagihan Siswa dengan filter siswa_id = 123 dan status_lunas = false, lalu menampilkannya di layar Ortu.
    Orang Tua melakukan pembayaranTransfer ke rekening sekolah.
    Admin Keuangan mencocokkan bukti transfer, lalu membuka menu Input Pembayaran. Admin memilih tagihan tersebut dan sistem membuat record baru di Trx Pembayaran (mencatat pegawai_id si penerima, jumlah_bayar, metode, dan generate kode_kwitansi).
    Sistem otomatis meng-update field status_lunas di Trx Tagihan Siswa menjadi true.
    Admin/Orang Tua dapat mencetak Kwitansi (PDF) berdasarkan data Trx Pembayaran.

ALUR 4: Kas Sekolah Keluar (Pengeluaran)

    Admin Keuangan membuka menu Pengeluaran dan membuat Trx Pengeluaran baru.
    Admin memilih Master Pos Anggaran (misal: Pos Belanja ATK).
    Admin mengisi nominal pengeluaran (Rp 500.000) dan mengunggah foto nota belanja ke server.
    Sistem menyimpan record pengeluaran. Saldo kas sekolah (total pemasukan - total Trx Pengeluaran) otomatis berkurang sesuai nominal.

ALUR 5: Peminjaman Barang di Lab Komputer

    Guru Lab ingin meminjam 5 unit Laptop. Guru membuka modul Sarana dan memilih Master Barang (Laptop).
    Sistem mengecek field status pada Master Barang apakah masih "Tersedia" (atau menghitung jumlah barang tersedia).
    Jika tersedia, Guru membuat Trx Peminjaman Barang. Sistem menyimpan tanggal pinjam dan rencana tanggal kembali.
    (Opsional) Sistem meng-update status di Master Barang menjadi "Dipinjam".
    Saat laptop dikembalikan, Guru mengubah status transaksi menjadi "Dikembalikan", mencatat kondisi barang (Baik/Rusak). Status di Master Barang kembali menjadi "Tersedia".

ALUR 6: Komunikasi Sekolah - Orang Tua

    Admin/Kepala Sekolah membuat Trx Pengumuman baru dengan judul "Libur Banjir" dan menentukan target (misal: Semua Siswa).
    Sistem menyimpan pengumuman ke database.
    Saat Orang Tua / Siswa login ke Web/PWA, sistem mengecek apakah ada pengumuman baru yang belum dibaca, lalu menampilkannya di Dashboard mereka.

6. DESAIN DATABASE (POSTGRESQL VIA PRISMA ORM)

Berikut adalah struktur skema database menggunakan Prisma ORM yang mendukung seluruh Master Data, Transaksi, dan Alur di atas:

(Catatan: Foreign Key dan Relasi sudah diatur sedemikian rupa untuk menjaga integritas data / Referential Integrity).
prisma
 
  
 
 

model AbsensiPegawai {
  id          Int      @id @default(autoincrement())
  pegawaiId   Int
  pegawai     Pegawai  @relation(fields: [pegawaiId], references: [id])
  tanggal     DateTime
  jam_masuk   DateTime?
  jam_pulang  DateTime?
  status      String   
}

// 2. Transaksi Keuangan
model TagihanSiswa {
  id               Int      @id @default(autoincrement())
  siswaId          Int
  siswa            Siswa    @relation(fields: [siswaId], references: [id])
  tarifPembayaranId Int
  tarifPembayaran  TarifPembayaran @relation(fields: [tarifPembayaranId], references: [id])
  tahunAjaranId    Int
  tahunAjaran      TahunAjaran @relation(fields: [tahunAjaranId], references: [id])
  bulan_tagihan    String   
  nominal          Int
  status_lunas     Boolean  @default(false)
  tanggal_jatuh_tempo DateTime
  
  pembayaran       Pembayaran[]
}

model Pembayaran {
  id               Int      @id @default(autoincrement())
  tagihanSiswaId   Int
  tagihanSiswa     TagihanSiswa @relation(fields: [tagihanSiswaId], references: [id])
  pegawaiId        Int      
  pegawai          Pegawai  @relation(fields: [pegawaiId], references: [id])
  tanggal_bayar    DateTime @default(now())
  jumlah_bayar     Int
  metode_pembayaran String  
  kode_kwitansi    String   @unique
}

model Pengeluaran {
  id             Int      @id @default(autoincrement())
  pegawaiId      Int
  pegawai        Pegawai  @relation(fields: [pegawaiId], references: [id])
  posAnggaranId  Int
  posAnggaran    PosAnggaran @relation(fields: [posAnggaranId], references: [id])
  tanggal        DateTime @default(now())
  nominal        Int
  keterangan     String
  bukti_nota_url String?
}

// 3. Transaksi Sarana
model PeminjamanBarang {
  id                  Int      @id @default(autoincrement())
  barangId            Int
  barang              Barang   @relation(fields: [barangId], references: [id])
  peminjamPegawaiId   Int?
  pegawai             Pegawai? @relation(fields: [peminjamPegawaiId], references: [id])
  tanggal_pinjam      DateTime @default(now())
  tanggal_kembali_rencana DateTime
  tanggal_kembali_aktual DateTime?
  kondisi_kembali     String?  
  status              String   @default("Dipinjam") 
}

// 4. Transaksi Komunikasi
model Pengumuman {
  id             Int      @id @default(autoincrement())
  pegawaiId      Int
  pegawai        Pegawai  @relation(fields: [pegawaiId], references: [id])
  judul          String
  isi            String
  target         String   @default("Semua") 
  tanggal_posting DateTime @default(now())
}

model GaleriBerita {
  id             Int      @id @default(autoincrement())
  judul          String
  konten         String
  gambar_url     String?
  tanggal_posting DateTime @default(now())
}