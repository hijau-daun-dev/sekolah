# Worklog — SIMSEKOLAH PRD Rebuild

## Task ID: ROOT
Agent: main (orchestrator)
Task: Rebuild aplikasi SIMSEKOLAH sesuai PRD v1.0 (PostgreSQL→SQLite constraint, Int IDs, full RBAC 6 role, semua modul master+trx, tema formal slate).

Work Log:
- Membaca PRD lengkap dari /home/z/my-project/upload/prd.md
- Klarifikasi user via AskUserQuestion: rebuild total, full RBAC, semua modul, tema formal, Int IDs
- PostgreSQL tidak bisa diinstall (no root) → tetap SQLite dengan Int autoincrement IDs
- Install deps: bcryptjs, next-auth@beta, zod, @auth/prisma-adapter, @types/bcryptjs
- Reset DB lama (cuid) → tulis schema baru sesuai PRD (Int IDs, sekolah_id di semua tabel)
- Schema: Role, Sekolah, User, Siswa, Pegawai (self-relation org), Ortu, OrtuSiswa, TahunAjaran, Semester, Tingkat, Jurusan, Kelas, KelasSiswa, KategoriMapel, Mapel, KomponenNilai, GuruMapel, Ruangan, KategoriBarang, Barang, JenisPembayaran, TarifPembayaran, PosAnggaran, JadwalPelajaran, AbsensiSiswa, Penilaian, AbsensiPegawai, TagihanSiswa, Pembayaran, Pengeluaran, PeminjamanBarang, Pengumuman, GaleriBerita
- Setup NextAuth v5 beta dengan Credentials Provider + bcrypt + JWT + custom session (role, sekolahId, pegawaiId, ortuId, siswaId)
- Middleware withAuth proteksi halaman (API handle auth sendiri via auth-guard)
- Seed endpoint /api/seed (POST) — idempotent, bikin 6 roles, 1 sekolah, 4 demo users (admin/tu/keuangan/guru), pegawai contoh, master akademik+sarana+keuangan, siswa+ortu sample
- Tema diupdate ke slate/gray formal korporat
- Halaman /login dibuat (auto-trigger seed di mount, form login, info akun demo)
- Layout.tsx + Providers (SessionProvider)
- page.tsx (Home) — sidebar role-aware dengan 19 menu dikelompokkan (Utama/Master Data/Akademik/Keuangan/Sarana/Komunikasi/Sistem), topbar info user+role, dropdown logout
- Komponen reusable: ImageUpload, DataTableShell+EmptyState+SearchInput
- Dashboard API + komponen: hero sekolah, 6 stat cards (role-aware), cash flow cards (pemasukan/pengeluaran/pengumuman)

Stage Summary:
- Auth infrastructure (NextAuth + bcrypt + JWT + middleware + RBAC guards) — DONE
- Schema database (32 tabel sesuai PRD dengan Int IDs) — DONE
- Seed data (roles, sekolah, 4 users, pegawai, akademik, sarana, keuangan, siswa, ortu, pengumuman) — DONE
- Layout & login page — DONE
- Dashboard — DONE
- TODO berikutnya (akan dikerjakan paralel oleh sub-agents):
  - API + UI untuk 19 modul: sekolah, pegawai, siswa, ortu, akademik (TA/semester/tingkat/jurusan/kelas/kelas-siswa/kategori-mapel/mapel/komponen-nilai/guru-mapel), sarana (ruangan/kategori-barang/barang), keuangan-master (jenis-pembayaran/tarif/pos-anggaran), jadwal, absensi-siswa, penilaian, absensi-pegawai, tagihan (generate massal), pembayaran (kwitansi PDF), pengeluaran (upload nota), peminjaman, pengumuman, galeri, struktur-org, user-management
  - Endpoint /api/upload perlu proteksi auth
  - Endpoint /api/generate-tagihan untuk Alur 1 PRD

## Task ID: A-master-data
Agent: code-agent (master data modules)
Task: Build API routes + UI section components for 7 master data modules of SIMSEKOLAH (sekolah, pegawai, siswa, ortu, akademik, sarana, keuangan-master).

Work Log:
- Read worklog.md, prisma/schema.prisma, auth-guard.ts, existing dashboard.tsx, image-upload.tsx, data-table-shell.tsx, page.tsx to confirm conventions
- Built 24 API route files under src/app/api/ covering: sekolah, pegawai (+cycle detection on PUT, +block delete if has children), siswa, ortu (+add-anak/remove-anak sub-routes), tahun-ajaran (+single-active via transaction), semester, tingkat, jurusan, kelas (+block delete if has siswa), kelas-siswa, kategori-mapel, mapel, komponen-nilai (bobot 0-100 validation), guru-mapel (unique [pegawaiId,mapelId,kelasId]), ruangan, kategori-barang, barang, jenis-pembayaran, tarif-pembayaran, pos-anggaran
- All APIs check auth + filter by sekolahId for non-SUPER_ADMIN + ownership check on [id] routes
- All delete operations on parent records return HTTP 400 with message instead of cascade
- Built 7 UI section components in src/components/_common/: sekolah-section, pegawai-section, siswa-section, ortu-section, akademik-section (5 Tabs), sarana-section (3 Tabs), keuangan-master-section (3 Tabs)
- Built 2 helper modules: _crud-table.tsx (generic CrudTable<T> with search + dialog form + delete confirm) used by 9 tabs; _format.ts (fmtIDR, fmtDate, fmtDateDisplay, toDateISO)
- All UI: 'use client', slate theme, responsive, useToast for notifications, useCallback for load, loading/error states handled, ImageUpload reused
- AkademikSection Kelas tab has custom SiswaManager dialog for adding/removing siswa from a kelas
- OrtuSection edit dialog has inline anak (siswa) management with add/remove via /api/ortu/[id]/add-anak and /remove-anak/[siswaId]
- PegawaiSection parent select excludes self (cycle impossible from UI side too); PUT cycle-check also server-side
- Fixed pre-existing lint error in page.tsx (window.location.href mutation in render) by extracting to LoginRedirector component using useEffect
- Final lint: 0 errors, 5 warnings (all pre-existing in legacy src/components/school/* files)

Files Created:
API routes (24):
  src/app/api/sekolah/route.ts
  src/app/api/pegawai/route.ts + [id]/route.ts
  src/app/api/siswa/route.ts + [id]/route.ts
  src/app/api/ortu/route.ts + [id]/route.ts + [id]/add-anak/route.ts + [id]/remove-anak/[siswaId]/route.ts
  src/app/api/tahun-ajaran/route.ts + [id]/route.ts
  src/app/api/semester/route.ts + [id]/route.ts
  src/app/api/tingkat/route.ts + [id]/route.ts
  src/app/api/jurusan/route.ts + [id]/route.ts
  src/app/api/kelas/route.ts + [id]/route.ts
  src/app/api/kelas-siswa/route.ts + [id]/route.ts
  src/app/api/kategori-mapel/route.ts + [id]/route.ts
  src/app/api/mapel/route.ts + [id]/route.ts
  src/app/api/komponen-nilai/route.ts + [id]/route.ts
  src/app/api/guru-mapel/route.ts + [id]/route.ts
  src/app/api/ruangan/route.ts + [id]/route.ts
  src/app/api/kategori-barang/route.ts + [id]/route.ts
  src/app/api/barang/route.ts + [id]/route.ts
  src/app/api/jenis-pembayaran/route.ts + [id]/route.ts
  src/app/api/tarif-pembayaran/route.ts + [id]/route.ts
  src/app/api/pos-anggaran/route.ts + [id]/route.ts

UI components (7 + 2 helpers):
  src/components/_common/sekolah-section.tsx
  src/components/_common/pegawai-section.tsx
  src/components/_common/siswa-section.tsx
  src/components/_common/ortu-section.tsx
  src/components/_common/akademik-section.tsx
  src/components/_common/sarana-section.tsx
  src/components/_common/keuangan-master-section.tsx
  src/components/_common/_crud-table.tsx (reusable generic CRUD)
  src/components/_common/_format.ts (IDR/date formatters)

Issues/Notes:
- Legacy src/app/api/{school,students,teachers,subjects,classrooms}/* and src/components/school/* reference old schema (cuid + name/address fields) and will fail at runtime — should be deleted by orchestrator
- page.tsx still imports many section components not yet built (tagihan, pembayaran, pengeluaran, jadwal, absensi-siswa, penilaian, absensi-pegawai, peminjaman, pengumuman, galeri, struktur-org, user-management). Dev server will show Module not found until sibling agents create them.
- Reusable CrudTable<T> available at src/components/_common/_crud-table.tsx — sibling agents building transactional sections are welcome to import { CrudTable, ColumnDef, FieldDef } to reduce boilerplate.

## Task ID: B-transactions
Agent: code-agent (transactional modules)
Task: Build API routes + UI section components for 12 TRANSACTION modules of SIMSEKOLAH (jadwal, absensi-siswa, penilaian, absensi-pegawai, tagihan+generate-tagihan, pembayaran+kwitansi, pengeluaran, peminjaman, pengumuman, galeri, struktur-org, user-management).

Work Log:
- Read worklog.md (Task A summary), prisma/schema.prisma, auth-guard.ts, _crud-table.tsx, _format.ts, data-table-shell.tsx, image-upload.tsx, page.tsx, pegawai route (for API pattern reference), auth.ts, sekolah route
- Built 28 API route files under src/app/api/ covering: jadwal, absensi-siswa, penilaian, absensi-pegawai, tagihan (+generate-tagihan), pembayaran (+kwitansi HTML), pengeluaran, peminjaman, pengumuman, galeri, role (new), user
- Critical endpoints implemented:
  * /api/generate-tagihan POST (Alur 1 PRD): finds all Siswa status="Aktif", matches TarifPembayaran by tahunAjaran+tingkat via kelasSiswa→kelas→tingkatId, skips existing (siswaId+tarifPembayaranId+bulanTagihan), supports "Sekali" frekuensi dedup, sets tanggalJatuhTempo = end of bulan (auto-detect year from tahun ajaran nama like "2025/2026"), returns {created, skipped, total, message}
  * /api/pembayaran POST: $transaction, generates unique kodeKwitansi "KWT-YYYYMMDD-XXXX" with retry on collision, auto-updates TagihanSiswa.statusLunas=true when jumlahBayar>=nominal, pegawaiId from session with fallback
  * /api/pembayaran/[id]/kwitansi GET: returns full HTML page with @media print CSS, kop sekolah (logo+nama+alamat), title band "KWITANSI PEMBAYARAN", info grid (siswa, NIS, tanggal, tahun ajaran, petugas, metode), items table with nominal+jumlah bayar, total row, terbilang, signature blocks (siswa & petugas), status stamp (Lunas/Belum Lunas), meta bar with kepala sekolah, print button (window.print())
  * /api/peminjaman POST: $transaction validates barang.status="Tersedia" → creates peminjaman + sets barang.status="Dipinjam"
  * /api/peminjaman/[id] PUT with action="return": sets tanggalKembaliAktual=now, kondisiKembali, status="Dikembalikan" → restores barang.status="Tersedia" (and bumps kondisi to "Rusak Ringan" if returned broken)
  * Array upsert patterns (absensi-siswa, absensi-penilaian, absensi-pegawai): POST accepts array or {items:[]}, uses $transaction of upserts with compound unique keys (siswaId_tanggal, siswaId_mapelId_komponenNilaiId, pegawaiId_tanggal)
  * /api/user (SUPER_ADMIN only): bcrypt.hash(password, 10) on POST, optional hash on PUT (only if password non-empty), block self-delete by comparing session.user.id
- Built 12 UI section components in src/components/_common/: jadwal-section, absensi-siswa-section, penilaian-section, absensi-pegawai-section, tagihan-section, pembayaran-section, pengeluaran-section, peminjaman-section, pengumuman-section, galeri-section, org-structure-section, user-management-section
- All UI: 'use client', slate theme (no emerald/blue primary), responsive (mobile-first), useToast for notifications, useCallback for loaders, loading/error/empty states handled
- UI specifics:
  * JadwalSection: filter by kelas + hari, grouped display by hari (Senin→Minggu), summary card per kelas, dropdowns fetched from /api/kelas, /api/mapel, /api/pegawai, /api/tahun-ajaran
  * AbsensiSiswaSection: kelas + date selectors, table with status buttons (Hadir/Sakit/Izin/Alpa) per siswa, keterangan input, Save All button, summary badges per status
  * PenilaianSection: kelas + mapel + komponenNilai selectors, editable nilai input (0-100) per siswa, statistics (avg/min/max/count), Save All
  * AbsensiPegawaiSection: date selector loads all pegawai with attendance, status dropdown + jamMasuk/jamPulang time inputs + keterangan, Save All
  * TagihanSection: 3 summary cards (outstanding/lunas/total), filter by status + search by siswa, Generate Massal dialog (tahun ajaran + bulan dropdown Januari-Desember + jenis pembayaran optional), badge Lunas=green/Belum=red
  * PembayaranSection: 3 summary cards (today/total transactions/total nominal), search by kode/siswa, Input Pembayaran dialog (searchable dropdown of unpaid tagihans showing siswa+jenis+bulan+nominal, auto-fills jumlahBayar with nominal, metode Tunai/Transfer/Debit/QRIS), Cetak Kwitansi button per row (window.open to /api/pembayaran/[id]/kwitansi)
  * PengeluaranSection: 3 summary cards (this month/this year/by pos anggaran breakdown), search + filter by pos anggaran, Tambah dialog with ImageUpload for bukti nota, thumbnail clickable in table
  * PeminjamanSection: 3 stat cards (dipinjam/dikembalikan/total), filter by status, Pinjam Barang dialog (only Tersedia barang), Kembalikan button per row with kondisi (Baik/Rusak) dialog
  * PengumumanSection: card grid layout (2 col on md), target badge (Semua/Siswa/Ortu/Guru), search by judul/isi, edit/delete actions, line-clamp-3 preview
  * GaleriSection: card grid (3 col on lg) with gambar thumbnail + kategori badge + tanggal + konten preview, filter by kategori, ImageUpload for gambar
  * OrgStructureSection: school banner (logo+nama+kepalaSekolah+alamat), stats (total personil/titik puncak/kedalaman maks), tree built from flat list using parentId, recursive render with connector lines (border-l + border-t), node card with foto/icon + nama + L{n} level badge + jabatan + NIP + bidangStudi + children count, Expand All/Collapse All/Print buttons (window.print()), auto-expand on first load, empty state
  * UserManagementSection: SUPER_ADMIN only (per API), table with name/email/role badge/sekolah/status/last login, search, Tambah/Edit dialog with email/password/name/role dropdown (from /api/role)/sekolah select (from /api/sekolah?all=true)/optional pegawai/siswa/ortu linkage based on role (GURU→pegawai, SISWA→siswa, ORTU→ortu)/isActive toggle, self-delete blocked at API level (UI also disables via currentUserId heuristic)
- Infrastructure fixes (pre-existing bugs from agent A that blocked everything):
  * Fixed src/middleware.ts: NextAuth v5 deprecated `next-auth/middleware`'s withAuth. Replaced with custom middleware that checks for authjs.session-token cookie and redirects to /login if missing (same matcher as before)
  * Fixed src/app/api/auth/[...nextauth]/route.ts: was `export { GET, POST } from "@/lib/auth"` (NextAuth v4 pattern, breaks in v5). Changed to `import { handlers } from "@/lib/auth"; export const { GET, POST } = handlers;` (v5 pattern)
  * Added AUTH_SECRET to .env (was missing, caused "MissingSecret" runtime error on /api/auth/session)
  * Fixed org-structure-section.tsx: replaced invalid lucide-react imports `Expand`/`Collapse` with `Maximize2`/`Minimize2` (the originals don't exist in lucide-react; suggestions were ListCollapse/ChevronRight)
  * Enhanced /api/sekolah GET to support `?all=true` query param: returns array of all sekolahs for SUPER_ADMIN (used by user-management-section dropdown to assign user to any sekolah)
- Final lint: 0 errors, 5 warnings (all pre-existing in legacy src/components/school/* files — same as Task A)

Files Created:
API routes (28):
  src/app/api/jadwal/route.ts + [id]/route.ts
  src/app/api/absensi-siswa/route.ts + [id]/route.ts
  src/app/api/penilaian/route.ts + [id]/route.ts
  src/app/api/absensi-pegawai/route.ts + [id]/route.ts
  src/app/api/tagihan/route.ts + [id]/route.ts
  src/app/api/generate-tagihan/route.ts
  src/app/api/pembayaran/route.ts + [id]/route.ts + [id]/kwitansi/route.ts
  src/app/api/pengeluaran/route.ts + [id]/route.ts
  src/app/api/peminjaman/route.ts + [id]/route.ts
  src/app/api/pengumuman/route.ts + [id]/route.ts
  src/app/api/galeri/route.ts + [id]/route.ts
  src/app/api/role/route.ts
  src/app/api/user/route.ts + [id]/route.ts

UI components (12):
  src/components/_common/jadwal-section.tsx
  src/components/_common/absensi-siswa-section.tsx
  src/components/_common/penilaian-section.tsx
  src/components/_common/absensi-pegawai-section.tsx
  src/components/_common/tagihan-section.tsx
  src/components/_common/pembayaran-section.tsx
  src/components/_common/pengeluaran-section.tsx
  src/components/_common/peminjaman-section.tsx
  src/components/_common/pengumuman-section.tsx
  src/components/_common/galeri-section.tsx
  src/components/_common/org-structure-section.tsx
  src/components/_common/user-management-section.tsx

Files Modified (infrastructure fixes):
  src/middleware.ts (replaced deprecated next-auth v4 withAuth with custom cookie-check middleware)
  src/app/api/auth/[...nextauth]/route.ts (v5 handlers pattern)
  src/app/api/sekolah/route.ts (added ?all=true param for SUPER_ADMIN user-management)
  .env (added AUTH_SECRET)

Issues/Notes:
- Legacy src/app/api/{school,students,teachers,subjects,classrooms}/* and src/components/school/* reference old schema (cuid + name/address fields) and will fail at runtime — should be deleted by orchestrator (same note as Task A; not in B-transactions scope)
- The dev server now successfully loads /login (HTTP 200), /api/auth/session (HTTP 200 returning null), and / (HTTP 307 redirect to /login for unauthenticated users)
- All 12 new UI section components match the exact names expected by src/app/page.tsx imports (JadwalSection, AbsensiSiswaSection, PenilaianSection, AbsensiPegawaiSection, TagihanSection, PembayaranSection, PengeluaranSection, PeminjamanSection, PengumumanSection, GaleriSection, OrgStructureSection, UserManagementSection)
- Kwitansi PDF approach: returns full HTML page with print-friendly CSS (@media print rules, @page A4 margin). User clicks "Cetak / Simpan PDF" button (or browser print shortcut) → browser "Save as PDF" option. This avoids extra dependencies like puppeteer/pdfkit while satisfying the requirement
- generate-tagihan logic handles edge cases: siswa without kelasSiswa for tahun ajaran are skipped; tarif with tingkatId=null applies to all siswa (umum); "Sekali" frekuensi deduped across all bulan
