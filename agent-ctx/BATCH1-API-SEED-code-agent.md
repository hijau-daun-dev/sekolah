# Task: BATCH1-API-SEED — code-agent

## Summary
Implemented/updated 28 API endpoints + 1 lib + 1 script for the SIMSEKOLAH schema v2.0 (TingkatMapel, GuruMapel, Ekstrakurikuler, RiwayatKepalaSekolah SCD Type 2, Jadwal with tipeJadwal, Penilaian with semesterId).

## Pre-existing state (already correct, only verified)
- `/api/tingkat-mapel/route.ts` + `[id]/route.ts` — GET/POST/PUT/DELETE already used tingkatId+mapelId, soft delete, statusAktif filter.
- `/api/tingkat/auto-generate/route.ts` — POST with autoGenerateTingkat helper.
- `/api/ekstrakurikuler/route.ts` + `[id]` + `[id]/siswa` — full CRUD with pembina + pesertas.
- `/api/jadwal/export/route.ts` — PDF (HTML print) + CSV.
- `/api/penilaian/rekap-kelas`, `rekap-siswa`, `export` — all working with semesterId + isolation.
- `/api/guru-mapel/route.ts` + `[id]` — already used tingkatId (not kelasId), PUT+soft-delete present.
- `/api/jadwal/route.ts` — POST already accepts tipeJadwal/judulKhusus/ekstrakurikulerId, validates TingkatMapel+GuruMapel for "pelajaran".
- `/api/penilaian/route.ts` — POST accepts semesterId (defaults to active), GET supports ?semesterId=.
- `/api/sekolah/route.ts` — GET returns array for super admin, POST/PUT accept jenjang+yayasan.
- `/api/tingkat/route.ts` — ?sekolahId= filter present.
- `/api/tahun-ajaran/route.ts` + `[id]` — POST/PUT accept kepalaSekolahPegawaiId + kepalaSekolahNama.
- All other master DELETE routes (mapel, komponen-nilai, guru-mapel, tingkat-mapel, kategori-mapel, tingkat, ortu, jenis-pembayaran, tarif-pembayaran, pos-anggaran, ruangan, kategori-barang, barang, jadwal, ekstrakurikuler, kelas) — already soft delete.
- All other master GET routes — already support ?statusAktif= filter.

## Files MODIFIED

### src/lib/tingkat.ts
- Added `JENJANG_OPTIONS` constant (array of `{value, label}`) for dropdowns.

### src/app/api/riwayat-kepala-sekolah/route.ts
- GET: added `?sekolahId=` filter support (for SUPER_ADMIN cross-sekolah view).
- POST: added **auto-close previous active records** (SCD Type 2) — sets `status="Selesai"` + `tanggalSelesai=tanggalMulai` for any existing `status="Aktif"` row in the same sekolah before inserting new one. Kept auto-sync `sekolah.kepalaSekolah + nipKepala`.

### src/app/api/riwayat-kepala-sekolah/[id]/route.ts
- DELETE: now **blocks if status="Aktif"** (returns 400 with message asking to set Selesai first). Hard-delete preserved for non-active records (riwayat is a historical log; only "Aktif" cannot be deleted).

### src/app/api/ortu/check-nik/route.ts
- GET response now returns `{ found, exists (alias), ortu (with full fields), anakAnak }` where `anakAnak` is array of `{id, nama, nis, nisn, status, hubungan}` resolved via `ortuSiswa` relation.

### src/app/api/sekolah/list/route.ts
- GET now includes `_count` (siswas, pegawais, users, kelases, tahunAjarans, mapels) for both SUPER_ADMIN and non-super branches.

### src/app/api/kelas/route.ts
- GET: added `?search=` filter (searches nama kelas, tingkat.nama, jurusan.nama, walikelas.nama via OR).

### src/app/api/pengumuman/route.ts
- GET: signature changed `GET()` → `GET(req: NextRequest)`; added `?statusAktif=` + `?sekolahId=` filters (preserves existing `target×role` filter from FIX-1).

### src/app/api/pengumuman/[id]/route.ts
- DELETE: changed hard-delete → **soft delete** (`statusAktif: false`).

### src/app/api/galeri/route.ts
- GET: signature changed `GET()` → `GET(req: NextRequest)`; added `?statusAktif=`, `?sekolahId=`, `?kategori=` filters.

### src/app/api/galeri/[id]/route.ts
- DELETE: changed hard-delete → **soft delete**.

### src/app/api/semester/route.ts
- GET: added `?statusAktif=` + `?tahunAjaranId=` filters.

### src/app/api/semester/[id]/route.ts
- DELETE: changed hard-delete → **soft delete** (with pre-check: blocks if Penilaian still references the semester).

### src/app/api/tahun-ajaran/[id]/route.ts
- DELETE: changed hard-delete → **soft delete** (keeps existing block-if-has-semester-or-kelas check).

### src/app/api/jadwal/options/route.ts
- Response shape aligned to spec: `{ kelas, tingkat, availableMapels, availableGurusByMapel, availableEkskul, allPegawai }` (bonus `allPegawai` field preserved for khusus/ekskul pembina picker). `availableGurusByMapel` is now a `Record<mapelId, Pegawai[]>`.

### src/app/api/seed/route.ts — **REWRITTEN**
New seed creates:
1. 6 roles
2. **2 sekolah**: MI Al-Hidayah (jenjang=MI) + MTs Al-Hidayah (jenjang=MTs), same yayasan="Yayasan Pendidikan Al-Hidayah"
3. Super admin user (admin@alhidayah.sch.id / admin123) linked to MI
4. For each sekolah (via `seedSekolah()` helper):
   - `autoGenerateTingkat()` → 6 tingkat for MI, 3 for MTs
   - Tahun Ajaran 2025/2026 (statusAktif=true, tanggalMulai/selesai)
   - 2 Semesters (Ganjil aktif + Genap non-aktif) both with tanggalMulai/selesai
   - KategoriMapel + 4 Mapels (MAT, BIN, BIG, IPA)
   - 4 KomponenNilai (Tugas 25, Harian 25, UTS 20, UAS 30)
   - 3 Pegawai (Kepala, Wakasek, Guru)
   - 1 RiwayatKepalaSekolah (status="Aktif", linked to Kepala pegawai)
   - TingkatMapel (4 mapels × 1 tingkat akhir)
   - GuruMapel (guru teaches all 4 mapels at tingkat akhir, **uses tingkatId not kelasId**)
   - 3 Ekstrakurikuler (Pramuka, Tahfidz, Drumband) with pembina=wakasek
   - 1 Kelas (e.g. "6A" for MI, "9A" for MTs)
   - 2 Siswa + KelasSiswa
   - 1 Ortu + OrtuSiswa link
   - 3 Jadwal (1 pelajaran + 1 ekskul + 1 khusus "Upacara Bendera")
   - Master Sarana (1 ruangan, 1 kategori, 1 barang)
   - Master Keuangan (1 jenis, 1 tarif, 4 pos anggaran)
   - 1 Pengumuman sample
   - 3 demo users per sekolah (tu/keuangan/guru) with prefix `mts-` for MTs
5. Response includes summary + all 7 demo credentials.

## Files CREATED

### scripts/generate-dummy-nilai.js
- Bun/Node script using `@prisma/client` (CommonJS, `eslint-disable @typescript-eslint/no-require-imports` at top).
- Iterates all sekolahs; for each:
  - Finds active TahunAjaran → loads both Semesters (Ganjil + Genap)
  - Loads KomponenNilai (statusAktif=true) + Siswa (status="Aktif") with their kelasSiswas
  - For each siswa, resolves their most recent kelas → tingkat → TingkatMapels
  - For each (semester × tingkatMapel × komponenNilai), **upserts** a Penilaian with random nilai 60–95, using `semesterId` (required for `@@unique([siswaId, mapelId, komponenNilaiId, semesterId])`)
- Returns summary table (sekolah, created, skipped, semesters, siswa).
- Verified end-to-end: created 4 records for 1 siswa × 1 mapel × 2 komponen × 2 semesters.

## Lint Result
`bun run lint` → exit 0, 0 errors, 0 warnings.

## E2E Verification (via bun -e)
1. **autoGenerateTingkat(MI)** → created 6 tingkat (1-6, jenjang="MI") ✓
2. **autoGenerateTingkat(MTs)** → created 3 tingkat (7-9, jenjang="MTs") ✓
3. **riwayat-kepala-sekolah auto-close**: created first Aktif riwayat, then created second → first auto-closed (status=Selesai, tanggalSelesai set), second remains Aktif ✓
4. **generate-dummy-nilai.js**: created 4 Penilaian records (1 siswa × 1 mapel × 2 komponen × 2 semesters), each with correct semesterId ✓
5. All test data cleaned up after verification; DB now empty.

## Notes / Side Effects
- The OLD seed route (DB currently has old data) used `kelasId` on GuruMapel — that was broken (schema uses `tingkatId`). New seed uses correct `tingkatId`.
- The DB is currently empty (all tables 0 rows) — schema was reset and pushed per task context. To seed: `POST /api/seed` (or trigger from /login page auto-seed on mount). Then `bun scripts/generate-dummy-nilai.js` for dummy nilai.
- `jadwal/options` keeps `allPegawai` as bonus field (used by frontend jadwal-section for khusus/ekskul pembina picker). The 4 spec-required fields are all present.
- `riwayat-kepala-sekolah/[id]` DELETE is intentionally hard-delete for non-active records (riwayat is an audit log; soft-delete would lose SCD history). Only "Aktif" is blocked per spec.
- `ortu/check-nik` returns both `found` (new, spec-compliant) and `exists` (legacy alias) for backward compat with any existing frontend code.
