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

---

## Task ID: AUDIT-1
Agent: general-purpose (audit)
Task: Comprehensive cross-check of every PRD requirement vs actual implementation. NO code changes — audit only.

### Audit Methodology
- Read PRD v1.0 final + worklog (Tasks ROOT, A-master-data, B-transactions)
- Static review: prisma/schema.prisma, src/lib/auth.ts, src/lib/auth-guard.ts, src/middleware.ts, src/app/page.tsx, src/app/login/page.tsx, src/components/_common/dashboard.tsx, src/components/_common/tagihan-section.tsx, src/components/_common/pembayaran-section.tsx
- Static review of 11 critical API routes: tahun-ajaran (POST + PUT), generate-tagihan, tagihan, pembayaran (POST + kwitansi), pengeluaran, peminjaman (POST + PUT), pengumuman, absensi-siswa, penilaian, jadwal, guru-mapel, user, upload, dashboard
- Runtime checks: `bun run lint` (exit 0), dev.log error scan, agent-browser end-to-end smoke tests as 3 roles (admin/guru/keuangan)
- Live API smoke test: 33 endpoints via authenticated fetch (all 200 as admin)
- Live flow tests: Generate Tagihan Massal ✓, Input Pembayaran ✓, Cetak Kwitansi ✓, Struktur Organisasi ✓

### Summary Table

| # | PRD Requirement | Status | Notes |
|---|---|---|---|
| 2.1 | 6 User Roles (Super Admin, TU, Keuangan, Guru, Siswa, Ortu) | ✅ COMPLIANT | All 6 in `/api/role` (verified), all 6 mapped in `page.tsx` allNav[].roles |
| 2.2 | Role-based menu visibility (page.tsx navItems) | ✅ COMPLIANT | Guru sees 7 menus, Keuangan sees 5, Super Admin sees 20 — verified via agent-browser |
| 3.1 | bcrypt password hashing | ✅ COMPLIANT | `bcrypt.hash(pw, 10)` in user POST, seed; `bcrypt.compare` in auth.ts |
| 3.2 | JWT httpOnly session cookies | ✅ COMPLIANT | NextAuth v5 `session:{strategy:"jwt"}`; session cookie set HttpOnly + SameSite=Lax (verified via curl) |
| 3.3 | Middleware RBAC | ⚠️ PARTIAL | `src/middleware.ts` only checks for cookie presence — does NOT enforce role-based URL routing. PRD says "Middleware Next.js: Memblokir akses rute (URL) yang tidak sesuai dengan role". Currently any logged-in user can hit any URL (RBAC enforced only at page.tsx render time + API sekolahId filter). Page-level RBAC works because section components are rendered conditionally; security relies on UI hiding, not URL protection. |
| 3.4 | Zod input validation | ❌ MISSING | `zod` is installed (^4.5.4) but NEVER imported in any src file. All API routes use ad-hoc manual validation (METODE_LIST.includes, Number(x) > 0, etc.). PRD §3 explicitly: "divalidasi secara ketat menggunakan library Zod". |
| 3.5 | Multi-tenancy sekolahId filter | ⚠️ PARTIAL | All sekolah-bearing master tables filtered by sekolahId in GET. BUT: (a) many transactional tables (Pembayaran, PeminjamanBarang, Pengeluaran, Pengumuman) do NOT have their own `sekolahId` column in schema — they filter via relation joins (e.g. `tagihanSiswa.siswa.sekolahId`), which works but is fragile; (b) ORTU/SISWA can read any record in their own sekolah rather than only their own child's data — see 3.6. |
| 3.6 | PWA-level data isolation (Ortu only sees own child's tagihan) | ❌ MISSING (CRITICAL) | `/api/tagihan` GET filters by sekolahId only. NO logic resolves `ortuId → ortuSiswa → siswaId[]` and restricts results to those siswaIds. An Ortu user sees ALL tagihan in the sekolah. PRD Alur 3 explicitly requires "filter siswa_id = 123 dan status_lunas = false". Same issue for `/api/pembayaran` (ortu could create pembayaran for any tagihan), `/api/penilaian` (siswa sees other students' grades), `/api/absensi-siswa`. |
| 4.1 | Master Personalia: Siswa, Pegawai, Ortu, OrtuSiswa | ✅ COMPLIANT | All 4 models in schema with sekolahId + relations |
| 4.2 | Master Akademik: TahunAjaran, Semester, Tingkat, Jurusan, Kelas, KelasSiswa, KategoriMapel, Mapel, KomponenNilai, GuruMapel | ✅ COMPLIANT | All 10 models exist with proper relations |
| 4.3 | Master Sarana: Ruangan, KategoriBarang, Barang | ✅ COMPLIANT | All 3 models with status+kondisi fields on Barang |
| 4.4 | Master Keuangan: JenisPembayaran, TarifPembayaran, PosAnggaran | ✅ COMPLIANT | All 3 models with tingkat/tahunAjaran relation |
| 4.5 | Master Sistem: Role, Sekolah, User | ✅ COMPLIANT | All 3 models; User has role/sekolah/pegawai/ortu/siswa linkages |
| 5.1a | Set TA statusAktif=true auto-unsets others | ✅ COMPLIANT | `/api/tahun-ajaran` POST and PUT/[id] both wrap in `$transaction` with `updateMany({statusAktif:false})` before setting new active |
| 5.1b | "Generate Kelas" feature (kenaikan kelas) | ❌ MISSING (HIGH) | No `/api/generate-kelas` endpoint. No "kenaikan"/"naikKelas"/"Lulus" logic outside seed. PRD Alur 1 step 2-3: "sistem membuat baris baru di tabel jembatan kelas_siswa untuk mendaftarkan siswa kelas 5 ke kelas 6 di tahun ajaran baru. Untuk siswa kelas 6 (kelas akhir) tahun lalu, sistem mengubah field status pada Master Siswa dari Aktif menjadi Lulus". Completely unimplemented. |
| 5.1c | "Generate Tagihan" feature | ✅ COMPLIANT | `/api/generate-tagihan` POST reads siswa status="Aktif", matches TarifPembayaran by tingkat via kelasSiswa→kelas→tingkatId, dedups existing (siswaId+tarifId+bulan), handles frekuensi="Sekali", sets tanggalJatuhTempo=end of bulan, returns {created, skipped, total, message}. Live-tested: created 2 tagihan for September, skipped 6 (dedup) |
| 5.2a | Guru sees jadwal today (?hari= filter) | ✅ COMPLIANT | `/api/jadwal` GET supports `?hari=`, `?kelasId=`, `?pegawaiId=` filters |
| 5.2b | Absensi siswa per kelas via kelas_siswa | ✅ COMPLIANT | `/api/absensi-siswa` GET supports `?kelasId&tanggal`, POST accepts array+upsert by (siswaId, tanggal) |
| 5.2c | Penilaian per komponen (UTS/UAS/Tugas/Harian) referencing mapel_id, siswa_id, komponen_nilai_id | ✅ COMPLIANT | `/api/penilaian` POST upsert by (siswaId, mapelId, komponenNilaiId), validates nilai 0-100 |
| 5.3a | Ortu sees only their child's tagihan | ❌ MISSING (CRITICAL) | See 3.6 — `/api/tagihan` returns all sekolah's tagihan for any authenticated user. UI in tagihan-section.tsx does NOT pass siswaId filter either. |
| 5.3b | Input pembayaran generates kodeKwitansi unique | ✅ COMPLIANT | `/api/pembayaran` POST generates `KWT-YYYYMMDD-XXXX` with 10-attempt collision retry. Live-tested: created KWT-20260903-5402 |
| 5.3c | Auto-set tagihan.statusLunas=true when paid | ✅ COMPLIANT | In `$transaction`, if `jumlahBayar >= tagihan.nominal` then `tagihanSiswa.update({statusLunas:true})`. Live-tested: Bunga's tagihan marked Lunas after payment |
| 5.3d | Cetak Kwitansi PDF | ✅ COMPLIANT | `/api/pembayaran/[id]/kwitansi` GET returns full HTML page (200, ~6.8KB) with kop sekolah, info grid, items table, terbilang, signatures, status stamp, `@media print` CSS + print button. Live-tested returns 200 with "Kwitansi Pembayaran" + siswa name. (PDF via browser "Save as PDF" — no puppeteer dep needed, satisfies PRD intent) |
| 5.4a | Pengeluaran with pos anggaran + buktiNotaUrl upload | ✅ COMPLIANT | `/api/pengeluaran` POST accepts `buktiNotaUrl`, validates `nominal>0` & posAnggaran ownership |
| 5.4b | Dashboard saldo kas = pemasukan - pengeluaran | ✅ COMPLIANT | `/api/dashboard` GET computes `saldoKas = pembayaranSum - pengeluaranSum`. Dashboard.tsx displays 3 cards: Total Pemasukan, Total Pengeluaran, Pengumuman Aktif (for SUPER_ADMIN/KEUANGAN) |
| 5.5a | Check barang.status="Tersedia" before pinjam | ✅ COMPLIANT | `/api/peminjaman` POST rejects if `barang.status !== "Tersedia"` with 400 |
| 5.5b | Update barang.status="Dipinjam" on pinjam, "Tersedia" on return | ✅ COMPLIANT | Both wrapped in `$transaction`. POST sets Dipinjam; PUT action=return sets Tersedia + bumps kondisi to "Rusak Ringan" if returned broken. DELETE also restores to Tersedia if still Dipinjam. |
| 5.5c | kondisi_kembali (Baik/Rusak) | ✅ COMPLIANT | PUT validates `kondisiKembali ∈ ["Baik","Rusak"]` |
| 5.6a | Pengumuman with target (Semua/Siswa/Ortu/Guru) | ⚠️ PARTIAL | POST validates target list. BUT GET `/api/pengumuman` does NOT filter by target × user role. A Siswa sees pengumuman with target="Guru". PRD Alur 6 implies role-targeted visibility. |
| 5.6b | Dashboard for ortu/siswa shows pengumuman | ❌ MISSING (HIGH) | `dashboard.tsx` only renders Pengumuman card for SUPER_ADMIN/KEUANGAN. SISWA & ORTU see ONLY the hero card — no stats cards, no pengumuman card. PRD Alur 6 explicitly: "Saat Orang Tua / Siswa login ke Web/PWA, sistem mengecek apakah ada pengumuman baru yang belum dibaca, lalu menampilkannya di Dashboard mereka". |
| 6 | Database field naming consistency | ✅ COMPLIANT | PRD §6 mixes snake_case (tanggal_jatuh_tempo, status_lunas) and camelCase (pegawaiId). Implementation consistently uses Prisma camelCase convention: `pegawaiId`, `statusLunas`, `tanggalJatuhTempo`, `kodeKwitansi`, `buktiNotaUrl`, `tanggalPosting`, `gambarUrl`, etc. — more consistent than PRD itself. |
| X1 | Lint: 0 errors | ✅ COMPLIANT | `bun run lint` exit 0 |
| X2 | All API endpoints return 200 | ✅ COMPLIANT | Live-tested 33 endpoints as admin (sekolah, pegawai, siswa, ortu, tahun-ajaran, semester, tingkat, jurusan, kelas, kelas-siswa, kategori-mapel, mapel, komponen-nilai, guru-mapel, ruangan, kategori-barang, barang, jenis-pembayaran, tarif-pembayaran, pos-anggaran, jadwal, absensi-siswa, penilaian, absensi-pegawai, tagihan, pembayaran, pengeluaran, peminjaman, pengumuman, galeri, role, user, dashboard) — all 200. Note: dev.log shows stale PrismaClientValidationError for `/api/guru-mapel` (`Unknown field 'kelas' for include statement`) from BEFORE the file was fixed at 06:27:13; current route.ts has the `kelas` include removed and returns 200. |
| X3 | Login flow (admin/guru/keuangan) | ✅ COMPLIANT | All 3 logins succeed (verified via curl + agent-browser). Sidebar menus filter correctly per role. (Minor UX issue: agent-browser's signIn({redirect:false}) sometimes fails to call router.push on first attempt — needs manual navigation. Does NOT affect production users using real browsers.) |
| X4 | Generate Tagihan Massal flow | ✅ COMPLIANT | Live-tested: dialog opens, TA + bulan selectable, generate creates 2 new tagihan (1 per active siswa), shows toast "Berhasil generate 2 tagihan (created: 2, skipped: 6)" |
| X5 | Input Pembayaran flow | ✅ COMPLIANT | Live-tested: dialog opens, tagihan dropdown shows unpaid tagihans, jumlahBayar auto-fills with nominal, Simpan creates pembayaran with kode KWT-20260903-5402, tagihan auto-marked Lunas |
| X6 | Cetak Kwitansi flow | ✅ COMPLIANT | `/api/pembayaran/2/kwitansi` returns 200 HTML 6788 bytes containing "Kwitansi Pembayaran" + siswa name + window.print() |
| X7 | Struktur Organisasi tree | ✅ COMPLIANT | Live-tested: 3 pegawai in hierarchy (Dr. Bambang Sutrisno L0 → Siti Aminah L1 → Ahmad Fauzi L2), stats (Total Personil=3, Titik Puncak=1, Kedalaman Maks=3 level), Expand/Collapse/Cetak buttons present |

### MISSING Features (must be built)

1. **❌ Generate Kelas (Kenaikan Kelas)** — PRD Alur 1 step 2-3. No endpoint exists. Needs:
   - `/api/generate-kelas` POST accepting `{ fromTahunAjaranId, toTahunAjaranId }`
   - For each KelasSiswa in from-TA: if kelas.tingkat is NOT the highest (e.g. < 6 for SD, < 9 for SMP), find or create matching Kelas in to-TA (same nama kelas, next tingkat) and create new KelasSiswa row
   - For siswa in highest tingkat (kelas 6 SD / kelas 9 SMP): set `Siswa.status = "Lulus"`
   - UI: button in AkademikSection → TahunAjaran tab or Kelas tab

2. **❌ Ortu/Siswa data isolation** — PRD §3.6 + Alur 3. Currently any authenticated user sees any sekolah-scoped record. Needs:
   - `/api/tagihan` GET: if role=ORTU, resolve `ortuId → ortuSiswa.siswaId[]` and filter `siswaId IN [...]`. If role=SISWA, filter `siswaId = session.siswaId`.
   - `/api/pembayaran` GET: same Ortu/Siswa filter via tagihanSiswa.siswaId.
   - `/api/pembayaran` POST: block role=SISWA/ORTU (only SUPER_ADMIN/KEUANGAN can input payment per PRD Alur 3 "Admin Keuangan... membuka menu Input Pembayaran")
   - `/api/penilaian` GET: if role=SISWA, filter siswaId = session.siswaId; if ORTU, filter by their children's siswaIds
   - `/api/absensi-siswa` GET: same
   - tagihan-section.tsx, pembayaran-section.tsx: pass siswaId when role=ORTU/SISWA

3. **❌ Dashboard pengumuman for Ortu/Siswa** — PRD Alur 6. dashboard.tsx gates Pengumuman card behind `role === "SUPER_ADMIN" || role === "KEUANGAN"`. Need:
   - For SISWA/ORTU roles, show a "Pengumuman Terbaru" card list (filtered by target matching role)
   - Optionally: track read status (PengumumanRead table) — PRD mentions "pengumuman baru yang belum dibaca"

4. **❌ Zod input validation** — PRD §3. zod is installed but unused. Needs:
   - Define Zod schemas for all POST/PUT bodies (especially money/nominal/nilai fields)
   - Replace ad-hoc `if (!field) return 400` checks with `schema.safeParse(body)` patterns
   - At minimum: pembayaran, pengeluaran, penilaian, tagihan, generate-tagihan

5. **⚠️ Middleware role-based URL protection** — PRD §3 "Middleware Next.js: Memblokir akses rute (URL) yang tidak sesuai dengan role". Currently middleware only checks cookie presence. Either:
   - Add role-to-path matcher in middleware (e.g. /admin/* requires SUPER_ADMIN, /keuangan/* requires KEUANGAN/SUPER_ADMIN), OR
   - Document that RBAC is enforced at API level only (page-level is cosmetic) — but that requires API-level role checks which are also currently missing for ORTU/SISWA flows (see #2)

### BUGS to fix

1. **🐛 Stale dev.log error: `/api/guru-mapel` Unknown field 'kelas'** — already fixed in source at `src/app/api/guru-mapel/route.ts:25-32` (kelas include removed). The error in `/home/z/my-project/dev.log` is from compile cache before 06:27:13. Live test confirms 200. **No action needed** unless dev.log is used for monitoring — recommend `rm -rf .next && bun run dev` to clear cache.

2. **🐛 `auth-guard.ts` helpers `requireRole` / `requireSekolahId` / `filterBySekolah` are DEAD CODE** — only `auth-guard.ts` itself imports them (self-reference). All 60+ API routes do inline `const session = await auth(); if (!session?.user) return 401` boilerplate. Not a runtime bug but a maintenance smell — promotes inconsistency (some routes use `sekolahId ? { sekolahId } : {}`, others use `filterBySekolah`-style). Recommend either deleting the helpers or migrating routes to use them.

3. **🐛 Pembayaran API allows ANY authenticated user to create payments** — `/api/pembayaran` POST does not check role. PRD Alur 3 says only Admin Keuangan inputs payments. Currently a SISWA or ORTU could POST and create a pembayaran for any tagihan in their sekolah. File: `src/app/api/pembayaran/route.ts:58-149`. Fix: add `if (!["SUPER_ADMIN","KEUANGAN"].includes(session.user.role)) return 403`.

4. **🐛 Pengeluaran API allows TU to create pengeluaran** — `/api/pengeluaran` POST has no role check. PRD Alur 4: "Admin Keuangan membuka menu Pengeluaran". page.tsx correctly gates UI to SUPER_ADMIN/KEUANGAN, but API is open to TU/GURU/SISWA/ORTU. File: `src/app/api/pengeluaran/route.ts:28-81`. Same fix pattern.

5. **🐛 Pengumuman API does not filter by target × role** — `/api/pengumuman` GET returns all sekolah's pengumuman regardless of caller role. A SISWA sees target="Guru" pengumuman. File: `src/app/api/pengumuman/route.ts:5-23`. Fix: if role=SISWA, `where.target IN ["Semua","Siswa"]`; if ORTU, `IN ["Semua","Siswa","Ortu"]`; if GURU, `IN ["Semua","Guru"]`.

6. **🐛 Keuangan cannot see Pengumuman menu** — `page.tsx:77` excludes KEUANGAN from pengumuman.roles. PRD doesn't strictly require it but Keuangan may miss broadcast info. Minor — design choice, not a bug per se.

### PARTIAL implementations with specific gaps

1. **⚠️ Multi-tenancy** — sekolahId filter works for SUPER_ADMIN cross-sekolah isolation. But within a sekolah, no per-user isolation (Ortu sees all sekolah's tagihan, Siswa sees all sekolah's grades, etc.). See MISSING #2.

2. **⚠️ Middleware RBAC** — only cookie presence check, no role-to-URL mapping. See MISSING #5.

3. **⚠️ Pengumuman target** — POST validates target enum, but GET doesn't apply target × role filter. See BUG #5.

4. **⚠️ Dashboard for non-admin roles** — Siswa/Ortu see only hero card, no useful info. PRD Alur 6 requires pengumuman display. See MISSING #3.

5. **⚠️ Keuangan role menu scope** — Keuangan doesn't see Pengumuman in sidebar. PRD doesn't explicitly require it, but Alur 6 implies all roles receive broadcasts. Minor.

6. **⚠️ `tahunAjaranId` is not on `KelasSiswa` schema relation** — KelasSiswa has `tahunAjaranId Int` field but no relation defined (schema.prisma:248). Code uses it for filtering (e.g. generate-tagihan line 66 `where: { tahunAjaranId: Number(tahunAjaranId) }`). Works but missing Prisma relation for type-safe includes.

### Overall Compliance Score: **78/100**

Breakdown:
- Section 2 (User Roles): 10/10
- Section 3 (Security): 13/20 (Zod 0/3, Multi-tenancy within sekolah 1/4, others 12/13)
- Section 4 (Master Data): 14/14 (all tables present)
- Section 5 Alur 1 (TA + Generate): 7/10 (Generate Kelas missing 0/3)
- Section 5 Alur 2 (KBM): 9/9
- Section 5 Alur 3 (Pembayaran): 6/9 (Ortu isolation missing 0/3)
- Section 5 Alur 4 (Kas Keluar): 5/5
- Section 5 Alur 5 (Peminjaman): 6/6
- Section 5 Alur 6 (Komunikasi): 3/6 (Dashboard for Ortu/Siswa missing 0/3)
- Section 6 (DB Design): 5/5
- Bonus (lint clean, all API 200, login flow, generate tagihan flow, pembayaran flow, kwitansi flow, struktur flow): 10/7

**Verdict**: Core architecture (auth, schema, master data CRUD, generate tagihan, pembayaran+kwitansi, peminjaman, struktur organisasi) is solid and PRODUCTION-READY for the SUPER_ADMIN/TU/KEUANGAN/GURU use cases. The Ortu/Siswa experience is BROKEN — they can see other students' data (privacy violation) and have an empty dashboard (UX failure). The "Generate Kelas" feature for Awal Tahun Ajaran is completely missing. Zod validation is absent throughout. Middleware RBAC is cosmetic only.

**Top 3 priorities for next iteration**:
1. Implement Ortu/Siswa data isolation in /api/tagihan, /api/pembayaran, /api/penilaian, /api/absensi-siswa (CRITICAL privacy)
2. Build "Generate Kelas" endpoint + UI button in AkademikSection (PRD Alur 1)
3. Add Zod schemas to all POST/PUT routes (PRD §3 security requirement)

## Task ID: FIX-1
Agent: main (PRD compliance fixer)
Task: Fix 7 PRD compliance issues identified in AUDIT-1 (Ortu/Siswa isolation, role checks, generate-kelas, dashboard pengumuman).

### Work Log
- Read worklog.md AUDIT-1 section, prisma/schema.prisma, src/lib/auth-helpers.ts, and the 4 target API files (penilaian, absensi-siswa, pengeluaran, pengumuman) + dashboard.tsx + dashboard/route.ts + akademik-section.tsx + _crud-table.tsx to understand structure and patterns.
- Read seed/route.ts to confirm tingkat/kelas naming convention (Tingkat nama="1".."9", urutan=0..8, jenjang SD for 1-6 / SMP for 7-9; kelas nama="6A" = tingkat.nama + suffix).

### Files Modified
1. **src/app/api/penilaian/route.ts** (Fix 1)
   - GET: refactored to use `getAllowedSiswaIds()` + `getCurrentSekolahId()` from auth-helpers. For ORTU/SISWA, builds `where.siswa.id = { in: allowedSiswaIds }` filter (returns [] if array empty). For SUPER_ADMIN/TU/KEUANGAN/GURU → no per-siswa filter (null).
   - POST: added role check `["SUPER_ADMIN", "TU", "GURU"]` only — others get 403.

2. **src/app/api/absensi-siswa/route.ts** (Fix 2)
   - GET: same isolation pattern as penilaian.
   - POST: added role check `["SUPER_ADMIN", "TU", "GURU"]` only.

3. **src/app/api/pengeluaran/route.ts** (Fix 3)
   - GET: restricted to `["SUPER_ADMIN", "KEUANGAN", "TU"]` (read-only).
   - POST: added role check `["SUPER_ADMIN", "KEUANGAN"]` only (PRD Alur 4).
   - Nominal validation: now requires positive integer (`Number.isFinite && > 0 && Number.isInteger`).

4. **src/app/api/pengumuman/route.ts** (Fix 4)
   - Added helper `allowedTargetsForRole(role)` returning target IN list per role (SUPER_ADMIN/TU/KEUANGAN → null=no filter; GURU → [Semua,Guru]; SISWA → [Semua,Siswa]; ORTU → [Semua,Ortu]).
   - GET: applies target filter on top of sekolahId filter.
   - POST: added role check `["SUPER_ADMIN", "TU", "GURU"]` only (PRD Alur 6: "Admin/Kepala Sekolah").

5. **src/app/api/generate-kelas/route.ts** (Fix 5 — NEW FILE)
   - POST endpoint with body `{ tahunAjaranIdLama, tahunAjaranIdBaru }`.
   - Auth: SUPER_ADMIN/TU only.
   - Logic (wrapped in `db.$transaction`):
     1. Verify both TAs belong to user's sekolah (or are visible to SUPER_ADMIN).
     2. Load all kelas in TA lama with tingkat; index kelas in TA baru by `${tingkatId}::${nama}`; index all tingkat by `${jenjang}::${urutan}`.
     3. For each KelasSiswa in TA lama (filtered by sekolah):
        - Resolve old kelas.tingkat (jenjang + urutan + nama).
        - Find next tingkat: same jenjang, urutan = old+1.
        - If no next tingkat → update `Siswa.status = "Lulus"` (graduate).
        - If next tingkat exists:
          - Derive suffix from old kelas nama (strip old tingkat nama prefix; fallback to trailing alphabetic chars).
          - Build new kelas nama = `${nextTingkat.nama}${suffix}` (e.g. "5A" → "6A").
          - Find kelas in TA baru with that nama + tingkatId. If not exists → skip with reason.
          - If exists but siswa already enrolled in target kelas → skip (dedup).
          - Otherwise → create new KelasSiswa with tahunAjaranIdBaru (promote).
     4. Returns `{ promoted, graduated, skipped, total, details: [...] }`.

6. **src/app/api/dashboard/route.ts** (Fix 6)
   - Added `allowedTargetsForRole()` helper (same logic as pengumuman).
   - Added `recentPengumuman` field to response: top 5 most recent pengumuman filtered by sekolah + target×role, returning `{id, judul, isi, target, tanggalPosting}`.
   - Pengumuman count now also applies target×role filter (was sekolah-only).

7. **src/components/_common/dashboard.tsx** (Fix 6)
   - Added `RecentPengumuman` interface and corresponding state type.
   - Added `showRecentPengumuman` flag = true for SISWA/ORTU/GURU roles.
   - Added a new "Pengumuman Terbaru" Card at bottom showing top 3 most recent pengumuman (judul + target badge + isi line-clamp-2 + tanggalPosting). Empty-state shows "Belum ada pengumuman untuk Anda."
   - Kept the existing cash-flow + pengumuman count card for SUPER_ADMIN/KEUANGAN unchanged.
   - Added `CalendarClock` icon import.

8. **src/components/_common/akademik-section.tsx** (Fix 7)
   - Imported `ArrowUpRight` from lucide-react.
   - Added new `GenerateKelasCard` component placed at top of "Tahun Ajaran & Semester" tab (before TahunAjaranTab).
   - Component renders a Card with title "Generate Kelas (Kenaikan Kelas)" + button "Generate Kelas".
   - Clicking opens a Dialog with two Select dropdowns (Tahun Ajaran Lama / Tahun Ajaran Baru) populated from /api/tahun-ajaran, helper text, and "Jalankan Generate" button.
   - Submit POSTs to /api/generate-kelas. On success: shows result panel (Total/Naik/Lulus/Skip counts) + toast with summary. On error: destructive toast.
   - Inserted `<GenerateKelasCard />` in `<TabsContent value="ta">`.

### Lint Result
- `bun run lint` exit 0 — no errors, no warnings.

### Verification Results
1. **Login as admin@nusantarajaya.sch.id / admin123** — SUCCESS. agent-browser navigated to /, saw all 20 sidebar menus + admin dashboard stats (Total Siswa=2, Total Pegawai=3, Jumlah Kelas=1, Mapel=2, Tagihan Belum Lunas=2, Saldo Kas=Rp500.000).
2. **`/api/generate-kelas` returns 400 on missing params** — verified: `POST {}` → `{"error":"Field wajib: tahunAjaranIdLama, tahunAjaranIdBaru"}`.
3. **`/api/generate-kelas` returns 200 on valid params** — verified: created test TA "2026/2027" (id=2), then POST `{tahunAjaranIdLama:1, tahunAjaranIdBaru:2}` → `{"promoted":0,"graduated":2,"skipped":0,"total":2}`. (Both seed siswa were in "6A" → tingkat 6 SD is kelas akhir → graduated correctly.)
4. **`/api/pengumuman` filters by role** — verified as GURU: created 3 test pengumuman (target=Guru/Siswa/Ortu). GET returned only `[{id:1,target:Semua},{id:2,target:Guru}]` — `target=Siswa` and `target=Ortu` correctly hidden from guru.
5. **Dashboard as GURU shows pengumuman card** — verified: GET /api/dashboard as guru returned `recentPengumuman` array with 2 entries (Test Guru Only + Selamat Datang). Dashboard UI snapshot showed `<h4>Test Guru Only</h4>` and `<h4>Selamat Datang Tahun Ajaran 2025/2026</h4>` inside "Pengumuman Terbaru" card.
6. **Generate Kelas UI button** — verified as admin: navigated to "Master Akademik" → "Tahun Ajaran & Semester" tab. Top of tab shows new "Generate Kelas (Kenaikan Kelas)" card with "Generate Kelas" button. Clicking opens dialog with two comboboxes (Tahun Ajaran Lama/Baru) + "Jalankan Generate" button.
7. **Demo data cleanup**: After testing, restored siswa status (Lulus→Aktif, 2 rows), deleted 3 test pengumuman, deleted test TA "2026/2027" — DB is back to pre-test state.

### Side Effects / Notes
- `getAllowedSiswaIds()` throws `UNAUTHORIZED`/`NO_ORTU`/`NO_SISWA` if session is missing the required linkage. In the API routes I wrapped calls in `.catch(() => null)` for `getCurrentSekolahId()` (consistent with existing patterns), but kept `getAllowedSiswaIds()` without try/catch since a failure there means the user shouldn't see anything anyway (the outer try/catch returns 500).
- For ORTU users with no children linked (empty array from `getAllowedSiswaIds()`), penilaian/absensi GET now returns `[]` (early return) — graceful degradation.
- The `allowedTargetsForRole` helper is duplicated between `/api/pengumuman/route.ts` and `/api/dashboard/route.ts` — kept duplication intentionally for minimal-edit policy. Could be extracted to `auth-helpers.ts` in a future refactor.
- The "Generate Kelas" UI lives in its own Card above the TahunAjaranTab CrudTable (instead of next to the inline "Tambah" button) because CrudTable's "Tambah" button is encapsulated and the spec's "next to" was interpreted loosely as "in the same TA tab". This placement is more discoverable.

### Compliance Update (vs AUDIT-1 scorecard)
- **3.6 PWA-level data isolation** → now PARTIAL→COMPLIANT for penilaian + absensi-siswa (was CRITICAL MISSING). Tagihan/pembayaran Ortu isolation was NOT in scope for FIX-1 (still PARTIAL).
- **5.1b Generate Kelas** → MISSING→COMPLIANT (PRD Alur 1 fully implemented end-to-end: endpoint + UI button).
- **5.6a Pengumuman target×role filter** → PARTIAL→COMPLIANT.
- **5.6b Dashboard for ortu/siswa pengumuman** → MISSING→COMPLIANT (GURU/SISWA/ORTU now see "Pengumuman Terbaru" card with top 3 most recent).
- **BUG #3 Pengeluaran role check** → FIXED (POST SUPER_ADMIN/KEUANGAN only, GET SUPER_ADMIN/KEUANGAN/TU, nominal positive-integer validation added).
- **BUG #4 Penilaian/Absensi role check** → FIXED (POST SUPER_ADMIN/TU/GURU only on both).
- **BUG #5 Pengumuman target filter** → FIXED (see 5.6a above).

### Not in scope for FIX-1 (deferred to next iteration)
- Zod input validation (PRD §3) — still absent.
- Middleware role-based URL protection (still cookie-only).
- Ortu/Siswa isolation for `/api/tagihan` and `/api/pembayaran` (Alur 3) — penilaian & absensi done, but tagihan/pembayaran still need same treatment.
- Track read status of pengumuman (PengumumanRead table) — PRD mentions "pengumuman baru yang belum dibaca".

## Task ID: FIX-2-ZOD
Agent: code-agent (Zod validation rollout)
Task: Tambahkan validasi Zod ke 9 API route yang belum pakai schema (pembayaran & pengeluaran sudah jadi referensi pattern).

Work Log:
- Membaca `src/lib/schemas/index.ts` dan 2 route referensi (pembayaran, pengeluaran) untuk memahami pattern.
- Membaca 9 route target dan `src/lib/auth-helpers.ts` untuk konteks.
- Pattern diterapkan ke setiap route: import schema → safeParse dengan Number() conversion untuk numeric fields → 400 + `Validasi gagal` + `details` jika gagal → destructured `parsed.data` untuk logic berikutnya.
- File modified (9):
  1. `src/app/api/pengumuman/route.ts` — pengumumanSchema (judul/isi/target enum)
  2. `src/app/api/tagihan/route.ts` — tagihanSchema (preserve isolation di GET)
  3. `src/app/api/generate-tagihan/route.ts` — generateTagihanSchema (+ business rule BULAN_LIST enum tetap dipertahankan post-parse)
  4. `src/app/api/generate-kelas/route.ts` — generateKelasSchema (+ business rule "TAs must differ" tetap dipertahankan post-parse)
  5. `src/app/api/penilaian/route.ts` — penilaianSchema (array; normalize body ke array dulu; tahunAjaranId & tanggal diambil dari rawArr karena tidak ada di schema — diberi komentar)
  6. `src/app/api/absensi-siswa/route.ts` — absensiSiswaSchema (array; normalize; semua field ada di schema)
  7. `src/app/api/siswa/route.ts` — siswaSchema
  8. `src/app/api/pegawai/route.ts` — pegawaiSchema (orgLevel/orgOrder/parentId di-Number() sebelum parse)
  9. `src/app/api/user/route.ts` — userSchema (password optional di schema; POST tambah check `if (!password)` setelah parse)
- Preserve semua auth check, sekolahId filter, role check, transaction, isolation, fallback pegawaiId, kodeKwitansi generation, email uniqueness check, role existence check, dll. Hanya blok manual validation yang diganti dengan Zod.
- Lint: `bun run lint` → exit 0, 0 errors, 0 warnings.
- Smoke test via agent-browser (login admin@nusantarajaya.sch.id): navigate ke Pengumuman module → list loads. Direct API probe ke 9 endpoint dengan input invalid & valid → Zod correctly returns 400 `Validasi gagal` untuk invalid, 200/created untuk valid. Termasuk penilaian & absensi-siswa (array schema), user (password required on POST), pegawai (NaN orgLevel).
- Pre-existing issue (NOT introduced by task ini): `POST /api/pengumuman` as SUPER_ADMIN mengembalikan 400 `sekolahId wajib untuk super admin` karena frontend tidak kirim `sekolahId` di body dan route force `sekolahId = undefined` untuk SUPER_ADMIN. Block ini preserved verbatim dari kode original; bukan di scope FIX-2-ZOD.
- Work record: `/agent-ctx/FIX-2-ZOD-code-agent.md`

Outcome: Semua 9 API route kini konsisten memakai shared Zod schemas. PRD §3 (strict input validation) sudah terpenuhi untuk endpoint POST utama. Lint bersih, smoke test pass.

## Task ID: FIX-3-SEKOLAH
Agent: code-agent (Super Admin sekolahId fallback fix)
Task: Bug — 16 API route punya pattern `if (!sid) return NextResponse.json({ error: "sekolahId wajib untuk super admin" }, { status: 400 });` yang mem-block Super Admin (tidak punya sekolahId di session) dari create data.

Work Log:
- Membaca worklog.md (konteks FIX-1 + FIX-2-ZOD). FIX-2-ZOD sudah menandai bug ini sebagai pre-existing issue di /api/pengumuman yang out-of-scope saat itu. /api/tahun-ajaran dan /api/pengumuman sudah di-fix sebelumnya dengan pattern fallback `db.sekolah.findFirst()`.
- Grep verifikasi: semua 16 file target memakai pattern identik `const sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);` + single-line `if (!sid) return ...`. Tidak ada variasi nama variabel (semua `sid`, bukan `sekolahIdFinal`). Tidak ada pattern di PUT/PATCH handler tambahan (masing-masing file hanya 1 occurence di POST).
- Apply fix ke 16 file (single Edit per file — tidak butuh MultiEdit karena hanya 1 occurence per file):
  ```ts
  // Resolve sekolahId: from session, or body, or fallback to first sekolah for super admin
  let sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
  if (!sid) {
    const firstSekolah = await db.sekolah.findFirst({ select: { id: true } });
    if (!firstSekolah) return NextResponse.json({ error: "Belum ada sekolah terdaftar" }, { status: 400 });
    sid = firstSekolah.id;
  }
  ```
  Key: `const` → `let` (reassign), tambah fallback query, error message baru "Belum ada sekolah terdaftar".

Files modified (16):
1. `src/app/api/kategori-mapel/route.ts`
2. `src/app/api/mapel/route.ts`
3. `src/app/api/tarif-pembayaran/route.ts`
4. `src/app/api/siswa/route.ts`
5. `src/app/api/jurusan/route.ts`
6. `src/app/api/kelas/route.ts`
7. `src/app/api/pegawai/route.ts`
8. `src/app/api/pos-anggaran/route.ts`
9. `src/app/api/kategori-barang/route.ts`
10. `src/app/api/ruangan/route.ts`
11. `src/app/api/ortu/route.ts`
12. `src/app/api/barang/route.ts`
13. `src/app/api/galeri/route.ts`
14. `src/app/api/tingkat/route.ts`
15. `src/app/api/komponen-nilai/route.ts`
16. `src/app/api/jenis-pembayaran/route.ts`

Lint Result:
- `bun run lint` exit 0 — 0 errors, 0 warnings.

Verification Results:
1. Login as admin@nusantarajaya.sch.id / admin123 → HTTP 302 (success).
2. POST /api/tahun-ajaran `{"nama":"2026/2027","statusAktif":false}` → 200 dengan `{"id":3,"sekolahId":1,"nama":"2026/2027",...}` (sebelumnya di test FIX-1 sempat return 400 — sekarang success).
3. POST /api/kategori-mapel `{"nama":"Test Kategori"}` → 200 dengan `{"id":2,"sekolahId":1,"nama":"Test Kategori","keterangan":null,"_count":{"mapels":0}}`. Tidak ada lagi "sekolahId wajib untuk super admin".
4. Cleanup: DELETE /api/tahun-ajaran/3 → `{"ok":true}`; DELETE /api/kategori-mapel/2 → `{"ok":true}`.
5. Verifikasi GET post-cleanup: kategori-mapel hanya `[{"id":1,"nama":"Wajib (A)"}]`; tahun-ajaran hanya `[{"id":1,"nama":"2025/2026"}]`. DB kembali ke pre-test state.

Side Effects / Notes:
- Pattern fix konsisten dengan /api/tahun-ajaran dan /api/pengumuman yang sudah di-fix sebelumnya — sekarang total 18 endpoint pakai fallback yang sama.
- Behavior change: kalau database benar-benar kosong (tidak ada Sekolah sama sekali), endpoint return 400 "Belum ada sekolah terdaftar" (lebih user-friendly dari error lama). Edge case ini sangat jarang karena seed endpoint selalu bikin minimal 1 sekolah.
- Tidak ada change ke auth check, role check, Zod validation, transaction, atau logic bisnis. Hanya 2 baris lama (`const sid` + single-line `if`) diganti jadi 7 baris baru.
- Pattern `let sid = ...; if (!sid) { firstSekolah fallback }` di-duplicate di 18 file. Refactor ke helper `resolveSekolahId(session, body)` di auth-helpers.ts bisa dilakukan di iterasi berikutnya, tapi duplication sengaja dipertahankan untuk minimal-edit policy sesuai task brief.
- Work record: `/agent-ctx/FIX-3-SEKOLAH-code-agent.md`

Outcome: BUG #6 (Super Admin blocked from creating data) — FIXED. Semua 16 endpoint master data sekarang gracefully fallback ke sekolah pertama kalau Super Admin tidak specify `sekolahId` di session/body. Lint bersih, smoke test pass untuk 2 endpoint sample (tahun-ajaran + kategori-mapel), test data sudah di-cleanup.

## Task ID: BATCH1-API-SEED
Agent: code-agent (Batch 1 API re-implementation: TingkatMapel/GuruMapel/Ekstrakurikuler/RiwayatKepalaSekolah/Jadwal tipe/Penilaian semester + seed MI+MTs Al-Hidayah)
Task: Implement 28 missing APIs (routes for tingkat-mapel, ekstrakurikuler, jadwal options/export, penilaian rekap/export, riwayat-kepala-sekolah, ortu/check-nik, sekolah/list) + UPDATE master DELETE→soft delete + GET→statusAktif filter + UPDATE guru-mapel/jadwal/penilaian/sekolah/tingkat/tahun-ajaran routes + REWRITE seed route (MI Al-Hidayah + MTs Al-Hidayah) + CREATE scripts/generate-dummy-nilai.js.

### Work Log
- Read worklog.md (full history AUDIT-1, FIX-1, FIX-2-ZOD, FIX-3-SEKOLAH) + schema.prisma (37 models, v2.0 with TingkatMapel/GuruMapel/Ekstrakurikuler/RiwayatKepalaSekolah SCD Type 2/JadwalPelajaran with tipeJadwal/Penilaian with semesterId).
- Read src/lib/db.ts, session.ts, auth-helpers.ts — confirmed `import { db } from "@/lib/db"` + `import { auth } from "@/lib/session"` + getAllowedSiswaIds/getCurrentSekolahId/getCurrentPegawaiId helpers.
- Audited all 28 target files; verified pre-existing state of each (most already partially/fully implemented per prior tasks).
- Identified deltas needed:
  - tingkat.ts → add JENJANG_OPTIONS constant
  - riwayat-kepala-sekolah POST → auto-close old + sekolah-list GET → _count + ortu/check-nik → anakAnak + kelas GET → search filter + pengumuman/galeri/semester GET → statusAktif filter + pengumuman/galeri/tahun-ajaran/semester DELETE → soft delete + jadwal/options → exact spec shape + seed route → full rewrite for MI+MTs + scripts/generate-dummy-nilai.js → new

### Files Modified (12)
1. **src/lib/tingkat.ts** — added `JENJANG_OPTIONS` constant (7 entries: SD/MI/SMP/MTs/MA/SD-SMP/MI-MTs).
2. **src/app/api/riwayat-kepala-sekolah/route.ts** — GET: `?sekolahId=` filter. POST: auto-close previous `status="Aktif"` (set `status="Selesai"` + `tanggalSelesai=newMulai`) before inserting new record. Auto-sync `sekolah.kepalaSekolah + nipKepala` preserved.
3. **src/app/api/riwayat-kepala-sekolah/[id]/route.ts** — DELETE: blocks if `status="Aktif"` (400 with message). Hard-delete preserved for non-active (riwayat = audit log).
4. **src/app/api/ortu/check-nik/route.ts** — response now `{ found, exists (alias), ortu (full fields), anakAnak: [{id,nama,nis,nisn,status,hubungan}] }`.
5. **src/app/api/sekolah/list/route.ts** — GET includes `_count` (siswas, pegawais, users, kelases, tahunAjarans, mapels) for both SUPER_ADMIN and non-super branches.
6. **src/app/api/kelas/route.ts** — GET: added `?search=` filter (OR on nama/tingkat.nama/jurusan.nama/walikelas.nama).
7. **src/app/api/pengumuman/route.ts** — GET: signature → `GET(req)`, added `?statusAktif=` + `?sekolahId=` filters. Preserves `target×role` filter from FIX-1.
8. **src/app/api/pengumuman/[id]/route.ts** — DELETE → soft delete (`statusAktif: false`).
9. **src/app/api/galeri/route.ts** — GET: signature → `GET(req)`, added `?statusAktif=`, `?sekolahId=`, `?kategori=` filters.
10. **src/app/api/galeri/[id]/route.ts** — DELETE → soft delete.
11. **src/app/api/semester/route.ts** — GET: added `?statusAktif=` + `?tahunAjaranId=` filters.
12. **src/app/api/semester/[id]/route.ts** — DELETE → soft delete (blocks if Penilaian references it).
13. **src/app/api/tahun-ajaran/[id]/route.ts** — DELETE → soft delete (keeps existing block-if-has-semester-or-kelas check).
14. **src/app/api/jadwal/options/route.ts** — response shape: `{ kelas, tingkat, availableMapels, availableGurusByMapel (Record<mapelId, Pegawai[]>), availableEkskul, allPegawai (bonus) }`.

### Files Rewritten (1)
15. **src/app/api/seed/route.ts** — Complete rewrite. Creates: 6 roles + 2 sekolah (MI Al-Hidayah jenjang=MI + MTs Al-Hidayah jenjang=MTs, same yayasan) + super admin user. For each sekolah via `seedSekolah()` helper: autoGenerateTingkat (6 for MI, 3 for MTs), TahunAjaran 2025/2026 (statusAktif=true, tanggalMulai/selesai), 2 Semesters (Ganjil aktif + Genap non-aktif, both with tanggalMulai/selesai), KategoriMapel + 4 Mapels, 4 KomponenNilai, 3 Pegawai (Kepala/Wakasek/Guru), 1 RiwayatKepalaSekolah (status="Aktif"), TingkatMapel (4 mapels × tingkat akhir), GuruMapel (with tingkatId not kelasId), 3 Ekstrakurikuler (Pramuka/Tahfidz/Drumband), 1 Kelas, 2 Siswa + KelasSiswa, 1 Ortu + link, 3 Jadwal (pelajaran + ekskul + khusus "Upacara Bendera"), Master Sarana (1 ruangan/kategori/barang), Master Keuangan (1 jenis/tarif + 4 pos anggaran), 1 Pengumuman, 3 demo users (tu/keuangan/guru) per sekolah.

### Files Created (1)
16. **scripts/generate-dummy-nilai.js** — Bun/Node script (CommonJS with eslint-disable for require). For each sekolah: finds active TA + both semesters, loads KomponenNilai + Siswa status="Aktif" with kelasSiswas, resolves each siswa's tingkat via most-recent kelas, loads TingkatMapel at that tingkat, then upserts Penilaian for every (semester × tingkatMapel × komponenNilai) with random nilai 60-95. Uses semesterId (required for `@@unique([siswaId, mapelId, komponenNilaiId, semesterId])`).

### Files Verified Pre-existing (no changes needed — 14 routes)
- tingkat-mapel route + [id], tingkat/auto-generate, ekstrakurikuler route + [id] + [id]/siswa, jadwal route + export, penilaian route + rekap-kelas + rekap-siswa + export, guru-mapel route + [id], sekolah route, tingkat route, tahun-ajaran route + [id], all other master [id] routes (mapel, komponen-nilai, kategori-mapel, tingkat, ortu, jenis-pembayaran, tarif-pembayaran, pos-anggaran, ruangan, kategori-barang, barang, jadwal, ekstrakurikuler, kelas) — already had soft delete + statusAktif filter per prior tasks (FIX-1/FIX-2-ZOD/FIX-3-SEKOLAH + master-data code-agent).

### Lint Result
- `bun run lint` → exit 0, 0 errors, 0 warnings.

### E2E Verification (bun -e smoke tests, no test code committed)
1. **autoGenerateTingkat(MI)** → created 6 tingkat (1-6, jenjang="MI") ✓
2. **autoGenerateTingkat(MTs)** → created 3 tingkat (7-9, jenjang="MTs") ✓
3. **riwayat-kepala-sekolah auto-close**: created first Aktif riwayat, then created second → first auto-closed (status=Selesai, tanggalSelesai set to second's tanggalMulai), second remains Aktif ✓
4. **block-if-active DELETE**: identified active riwayat id correctly (would be blocked) ✓
5. **generate-dummy-nilai.js**: created 4 Penilaian records (1 siswa × 1 mapel × 2 komponen × 2 semesters), each with correct semesterId (1 for Ganjil, 2 for Genap), tahunAjaranId set, nilai in 60-95 range ✓
6. All test data cleaned up after verification; DB now empty (all 18 tables 0 rows).

### Side Effects / Notes
- The OLD seed route had a bug: it inserted GuruMapel with `kelasId` (column no longer exists in v2.0 schema — uses `tingkatId`). New seed uses correct `tingkatId`. DB currently empty (schema reset+pushed per task context), so user needs to run `POST /api/seed` (auto-triggered on /login mount) then `bun scripts/generate-dummy-nilai.js` for dummy nilai.
- `ortu/check-nik` returns both `found` (new, spec-compliant) and `exists` (legacy alias) for backward compat.
- `jadwal/options` keeps `allPegawai` as bonus field (used by frontend jadwal-section for khusus/ekskul pembina picker); 4 spec-required fields all present.
- `riwayat-kepala-sekolah/[id]` DELETE is intentionally hard-delete for non-active records (riwayat is SCD audit log; soft-delete would corrupt history). Only "Aktif" is blocked per spec.
- Demo credentials after fresh seed:
  - admin@alhidayah.sch.id / admin123 (SUPER_ADMIN, linked to MI)
  - tu@mialhidayah.sch.id / tu123, keuangan@mialhidayah.sch.id / keuangan123, guru@mialhidayah.sch.id / guru123 (MI)
  - mts-tu@mtsalhidayah.sch.id / tu123, mts-keuangan@mtsalhidayah.sch.id / keuangan123, mts-guru@mtsalhidayah.sch.id / guru123 (MTs)
- Work record: `/agent-ctx/BATCH1-API-SEED-code-agent.md`

Outcome: All 28 task items completed. 12 files modified, 1 rewritten (seed), 1 created (dummy-nilai script), 14 verified pre-existing. Lint clean (0 errors). E2E smoke tests pass for autoGenerateTingkat (MI/MTs), riwayat auto-close SCD logic, and generate-dummy-nilai.js (creates Penilaian with semesterId for both semesters).

## Task ID: BATCH2-UI
Agent: code-agent (BATCH2-UI)
Task: Update 10 UI components for master akademik refactor (Tingkat/Kelas/Mapel-per-Tingkat/GuruMapel-by-tingkat), jadwal multi-tipe, penilaian cascade filter, sekolah jenjang+yayasan+riwayat kepala sekolah, rekap nilai, ekskul, ortu statusAktif badge, and page.tsx menu restructure.

Work Log:
- Read worklog.md and existing components in `/src/components/_common/`
- Verified all required APIs exist: `/api/tingkat-mapel`, `/api/riwayat-kepala-sekolah`, `/api/penilaian/{rekap-kelas,rekap-siswa,export}`, `/api/jadwal/export`
- Verified schema: `TingkatMapel` (tingkatId+mapelId), `GuruMapel` (pegawaiId+mapelId+tingkatId), `RiwayatKepalaSekolah` (SCD Type 2), `JadwalPelajaran` (tipeJadwal, judulKhusus, ekstrakurikulerId)

Files Created (1):
- `/src/components/_common/rekap-nilai-section.tsx` — Per kelas/siswa rekap with cascade filters + PDF/Excel export

Files Modified (9):
- `tingkat-section.tsx` — Reordered columns (No/Nama/Jenjang/Urutan/Jml Kelas/Jml Mapel/Status/Aksi) + jenjang color badges (MI=emerald, MTs=blue, SD/SMP=slate)
- `kelas-section.tsx` — Added No + Ruangan columns; statusAktif toggle → Switch
- `ekstrakurikuler-section.tsx` — Added No + Tempat columns; statusAktif toggle → Switch
- `akademik-section.tsx` — Removed TingkatTab; renamed tab "Tingkat & Jurusan" → "Jurusan"; added new "Mapel per Tingkat" tab (TingkatMapelTab); GuruMapelTab rewritten to use tingkatId (was kelasId) with edit capability + statusAktif badge/toggle; KomponenNilai statusAktif badge + Switch; sekolah filter at top; all sub-tabs accept sekolahId prop
- `jadwal-section.tsx` — Full rewrite. tipeJadwal radio (Pelajaran/Ekskul/Khusus) with conditional form; Export dialog (per kelas/tingkat + PDF/CSV); Tipe column with badge + filter
- `penilaian-section.tsx` — Full rewrite with cascade filter (Sekolah/Jenjang→Tingkat→Kelas→Mapel→Komponen→Semester); auto-detect semester by current date; GURU restricted to GuruMapel; semesterId+tahunAjaranId in POST payload
- `sekolah-section.tsx` — Full rewrite. Added jenjang dropdown + yayasan field; new RiwayatKepalaSekolahCard (table with No/Nama/NIP/Periode/Status/Aksi, add/edit/delete); super admin sekolah switcher if multiple
- `ortu-section.tsx` — Added statusAktif to interface + empty record; statusAktif badge in card; Switch in dialog
- `page.tsx` — Added 4 menu items (Master Tingkat, Master Kelas, Rekap Nilai, Ekstrakurikuler); separated "Absensi" group (moved Absensi Siswa + Absensi Pegawai out of Akademik); imported 4 icons + 4 components; new Tab types + titleMap entries

Lint Result:
- `bun run lint` → exit code 0 (0 errors, 0 warnings)

Work record: `/agent-ctx/BATCH2-UI-code-agent.md`

Outcome: All 10 task items completed. 1 file created, 9 modified. Lint clean. UI ready for testing on the preview panel (sidebar with restructured groups: Utama / Master Data / Akademik / Absensi / Keuangan / Sarana / Komunikasi / Sistem).

---
Task ID: SEED-EXTENDED
Agent: main (seed data extender)
Task: Buat data seed tambahan yang lebih komprehensif (user request: "bantu saya buat data seed")

Work Log:
- Baca worklog.md untuk konteks: base seed (/api/seed) hanya membuat 2 siswa/sekolah + 1 kelas/sekolah, banyak tabel transaksi masih kosong (TagihanSiswa, Pembayaran, AbsensiSiswa, AbsensiPegawai, Pengeluaran, PeminjamanBarang, GaleriBerita, EkstrakurikulerSiswa = 0 rows)
- Baca scripts/generate-dummy-nilai.js untuk pattern script standalone (PrismaClient direct, idempotent via upsert)
- Baca prisma/schema.prisma untuk konfirmasi unique constraints: AbsensiSiswa(siswaId,tanggal), AbsensiPegawai(pegawaiId,tanggal), Pembayaran.kodeKwitansi unique, GuruMapel(pegawaiId,mapelId,tingkatId), TingkatMapel(tingkatId,mapelId), EkstrakurikulerSiswa(ekstrakurikulerId,siswaId), KelasSiswa(kelasId,siswaId), OrtuSiswa(ortuId,siswaId)
- Buat scripts/seed-extended.js dengan 9 tahap per sekolah:
  1. Tambah 6 pegawai baru (4 guru mapel + 1 TU + 1 keuangan) dengan NIP deterministik untuk idempotency
  2. Generate kelas A di setiap tingkat (MI: 6 kelas, MTs: 3 kelas) dengan walikelas
  3. Pastikan TingkatMapel & GuruMapel untuk semua tingkat (round-robin guru assignment)
  4. Generate siswa per kelas A (MI: 18/kelas, MTs: 22/kelas) + ortu (ayah) + KelasSiswa + OrtuSiswa
  5. Generate TagihanSiswa SPP untuk 3 bulan (Juli/Agustus/September) dengan jatuh tempo akhir bulan
  6. Generate Pembayaran untuk 60% tagihan Juli + 40% Agustus + 15% September (dengan retry on kodeKwitansi collision)
  7. Generate AbsensiSiswa untuk 5 hari kerja terakhir (3 kelas sample per sekolah)
  8. Generate AbsensiPegawai untuk 5 hari kerja terakhir (semua pegawai, jamMasuk/jamPulang random 07:00-15:30)
  9. Generate Pengeluaran (8/sekolah), PeminjamanBarang (3/sekolah mix Dipinjam/Dikembalikan), GaleriBerita (5/sekolah), EkstrakurikulerSiswa (5-10 per ekskul)
- Bug fix #1: kwitansiCounter di-reset per sekolah → collision di MTs. Fix: pindahkan ke scope script-global + retry 3x on P2002
- Bug fix #2: tgl.setHours() memutasikan Date di array hariKerja → collision pegawaiId_tanggal. Fix: gunakan startOfDay(tglOriginal) untuk copy fresh + buat jamMasuk/jamPulang dari komponen tgl (tidak mutasi)
- Bug fix #3: NIP memakai existingPegawai.length+1 → tidak idempotent (tiap run bikin pegawai baru). Fix: NIP deterministik pattern `${sekolah.id}-GURU-BIN-01` etc.
- Cleanup 18 pegawai duplikat dari 2 run sebelumnya (NIP non-deterministic)
- Re-run script sukses: 12 pegawai baru (6 per sekolah), 36 GuruMapel, 120 TagihanSiswa, 43 Pembayaran, 600 AbsensiSiswa, 113 AbsensiPegawai, 16 Pengeluaran, 4 PeminjamanBarang, 10 GaleriBerita, 73 EkstrakurikulerSiswa
- Re-run scripts/generate-dummy-nilai.js: 5568 Penilaian (3456 MI + 2112 MTs) untuk 174 siswa × 4 mapel × 4 komponen × 2 semester

Files Created:
- scripts/seed-extended.js (548 lines)

Stage Summary:
- DB final state: 2 sekolah, 174 siswa, 18 pegawai, 9 kelas, 174 KelasSiswa, 172 Ortu+OrtuSiswa, 36 TingkatMapel, 44 GuruMapel, 6 Ekstrakurikuler, 73 EkstrakurikulerSiswa, 120 TagihanSiswa (60 lunas/60 belum), 43 Pembayaran, 600 AbsensiSiswa, 113 AbsensiPegawai, 5568 Penilaian, 16 Pengeluaran, 4 PeminjamanBarang, 10 GaleriBerita, 2 Pengumuman, 2 RiwayatKepalaSekolah
- Per sekolah: MI (108 siswa, 6 kelas, 54 tagihan, 19 pembayaran, 270 absensi siswa), MTs (66 siswa, 3 kelas, 66 tagihan, 24 pembayaran, 330 absensi siswa)
- Sample kwitansi: KWT-20250903-00043, Rp250.000, Debit, siswa "Umar Syukur"
- Script idempotent: aman dijalankan berulang (cek existing data sebelum create, upsert untuk Penilaian)
- Untuk menjalankan ulang: `bun scripts/seed-extended.js` lalu `bun scripts/generate-dummy-nilai.js`

---
Task ID: BACKUP-CHECKPOINT
Agent: main (data backup)
Task: Push lengkap semua perubahan ke remote + buat branch checkpoint + dump database sebagai titik pemulihan terakhir.

Work Log:
- Investigasi working tree: hanya ada perubahan dari commit sebelumnya (sudah clean)
- Cek db/custom.db: ternyata sudah di-commit di commit 081dc2f (868 KB, hash git a845dfd) — file binary yang sama dengan filesystem
- Buat scripts/dump-database.js: dump seluruh database SQLite ke SQL INSERT statements
  - Awalnya pakai better-sqlite3 (npm) — bun crash karena NAPI issue
  - Rewrite pakai bun:sqlite native module — sukses
- Jalankan dump: 37 tables, 7428 rows, 1.9 MB → db/dump.sql
- Buat branch baru: backup/checkpoint-2026-09-06-v2
- Commit 3 file baru (db/dump.sql, scripts/dump-database.js, bun.lock cleanup)
- Push 3 branch ke remote origin:
  * backup/checkpoint-2026-09-06-v2 (NEW — checkpoint titik pemulihan)
  * main (update dari cd58090 → a8b4f3e, fast-forward)
  * feature/scd-nilai (sudah di-push sebelumnya, sama dengan main sekarang)

Files Created:
- db/dump.sql (1978 KB, 7649 lines, 37 tables, 7428 rows)
- scripts/dump-database.js (76 lines, bun:sqlite native)

Branches di Remote (3 total):
- main (default) → https://github.com/hijau-daun-dev/sekolah/tree/main
- feature/scd-nilai → https://github.com/hijau-daun-dev/sekolah/tree/feature/scd-nilai
- backup/checkpoint-2026-09-06-v2 → https://github.com/hijau-daun-dev/sekolah/tree/backup/checkpoint-2026-09-06-v2

Restore Procedure (kalau database hilang):
  1. cp db/custom.db db/custom.db.bak  (backup file rusak)
  2. rm db/custom.db
  3. bunx prisma db push  (recreate schema kosong)
  4. bun -e "import {Database} from 'bun:sqlite'; const db = new Database('db/custom.db'); const sql = require('fs').readFileSync('db/dump.sql','utf8'); db.exec(sql); db.close();"
     ATAU: sqlite3 db/custom.db < db/dump.sql

Stage Summary:
- 3 layer backup terjamin:
  1. db/custom.db (binary SQLite, di-commit)
  2. db/dump.sql (textual SQL dump, di-commit, 7428 rows)
  3. prisma/schema.prisma (DDL, di-commit sejak lama)
- 3 branch di remote: main, feature/scd-nilai, backup/checkpoint-2026-09-06-v2
- Restore bisa dari salah satu sumber saja (dump.sql paling reliable — bisa di-diff, di-partial restore, dll)
- Token classic ghp_9cmkPZUgb4V... masih aktif sampai di-revoke user. Wajib revoke setelah yakin semua sudah aman.

---
Task ID: SCHEDULER-DAEMON
Agent: main (auto-backup scheduler)
Task: Setup backup rutin ke GitHub setiap 6 jam + end-of-day, jalan sebagai daemon.

Work Log:
- OS cron (crontab/crond) tidak tersedia di environment ini — cari alternatif
- Library `croner` (Node.js) ditemukan di clawhub, install ke project: `bun add croner`
- Buat scripts/scheduler.js: daemon yang jalan 24/7 dengan Cron pattern
  - Backup setiap 6 jam: pattern `0 */6 * * *`
  - Backup end-of-day: pattern `59 23 * * *`
  - Backup on-start (configurable): langsung backup sekali saat scheduler start
  - Heartbeat setiap 1 jam untuk verifikasi scheduler masih hidup
  - Auto-rotate log file jika > 10 MB
  - Graceful shutdown pada SIGTERM/SIGINT/SIGHUP
- Buat scripts/start-services.sh: startup script idempotent yang start dev server + scheduler bersamaan
- Tambah config di .env.local: BACKUP_INTERVAL_HOURS=6, BACKUP_ON_START=true
- Test: scheduler jalan sebagai daemon dengan setsid, PID 6711, backup on-start sukses dalam 4.3s
- Verifikasi: cron pattern terdaftar, end-of-day job terdaftar, log file ter-generate

Files Created:
- scripts/scheduler.js (110 lines, croner-based daemon)
- scripts/start-services.sh (47 lines, idempotent service starter)

Files Modified:
- .env.local: tambah BACKUP_INTERVAL_HOURS + BACKUP_ON_START config
- package.json: tambah dependency croner@10.0.1

Schedule Aktif:
- Backup setiap 6 jam (00:00, 06:00, 12:00, 18:00 UTC)
- Backup end-of-day (23:59 UTC)
- Backup on-start saat scheduler baru dijalankan
- Total: 5 backup per hari (jika scheduler terus jalan)

Cara Start/Ulang Scheduler:
  bash scripts/start-services.sh  # start dev server + scheduler
  # atau scheduler saja:
  nohup setsid -f bash -c 'cd /home/z/my-project && exec bun scripts/scheduler.js' < /dev/null > /dev/null 2>&1 &

Cara Cek Status:
  pgrep -af "bun scripts/scheduler.js"
  tail -50 scheduler.log

Cara Stop:
  pkill -f "bun scripts/scheduler.js"

Stage Summary:
- Daemon scheduler aktif (PID 6711) — akan backup otomatis setiap 6 jam + end-of-day
- Auto-backup script (scripts/auto-backup.js) sudah teruji, eksekusi 4-5 detik per backup
- Branch backup/auto-checkpoint di GitHub selalu update ke kondisi terbaru
- Backup chain: db/custom.db (binary) + db/dump.sql (textual 1.9 MB) + prisma/schema.prisma (DDL) — 3 layer redundancy
- Log monitoring: scheduler.log (auto-rotate 10 MB) + dev.log
- Script start-services.sh idempotent: aman dijalankan ulang kalau server reboot
