# Task: BATCH2-UI — UI Components Update (10 tasks)

**Agent**: code-agent (BATCH2-UI)
**Date**: 2025-01
**Status**: ✅ Completed (lint: 0 errors)

## Files Created
1. `src/components/_common/rekap-nilai-section.tsx` (NEW) — Rekap nilai per kelas/siswa with cascade filters (sekolah/mode/kelas/siswa/semester), per-kelas table (No, Nama, NIS, mapel columns, Rata-rata), per-siswa detail per komponen, PDF/Excel export buttons → `window.open('/api/penilaian/export?...')`, click siswa name to switch to per-siswa mode.

## Files Modified
2. `src/components/_common/tingkat-section.tsx` — Reordered columns to: No, Nama, Jenjang, Urutan, Jumlah Kelas, Jumlah Mapel, Status, Aksi. Added `jenjangBadgeClass()` helper for color-coded badges (MI=emerald, MTs=blue, SD/SMP=slate). Soft delete + Auto-Generate + sekolah filter already present.
3. `src/components/_common/kelas-section.tsx` — Added No + Ruangan columns. Switched statusAktif toggle in dialog from `<input checkbox>` to `Switch` component.
4. `src/components/_common/ekstrakurikuler-section.tsx` — Added No + Tempat columns. Switched statusAktif toggle to `Switch`. colSpan updated from 7 → 9 to match new column count.
5. `src/components/_common/akademik-section.tsx` — Removed `TingkatTab` function entirely. Renamed tab from "Tingkat & Jurusan" → "Jurusan" (only jurusan management). Added new "Mapel per Tingkat" tab with `TingkatMapelTab` (select tingkat → list assigned mapels → add/remove mapel via /api/tingkat-mapel). Rewrote `GuruMapelTab`: now uses `tingkatId` (was `kelasId`), added edit capability, statusAktif badge column with inline toggle, Switch in dialog. All sub-tabs now accept `sekolahId` prop and pass it via fetchUrl + formatPayload. Added sekolah filter dropdown at top (visible when >1 sekolah). Added `Switch` import. Added `TingkatMapel` interface. Updated `KomponenNilai` interface to include `statusAktif`. Added statusAktif badge + Switch in KomponenNilai form. Added `SekolahOpt` interface.
6. `src/components/_common/jadwal-section.tsx` — Complete rewrite. Added `tipeJadwal` radio (Pelajaran/Ekstrakurikuler/Khusus) using `RadioGroup`. Conditional form: Pelajaran → kelas+mapel+guru; Ekskul → ekskul+kelas optional (pembina auto-assigned); Khusus → judulKhusus+kelas optional. Added "Export" button with dialog for per kelas/tingkat + PDF/Excel options (`window.open('/api/jadwal/export?...')`). Added "Tipe" column with badge (Pelajaran=slate, Ekskul=amber, Khusus=purple) + filter dropdown. Table now shows Tipe/Judul column with mapel/ekskul/judulKhusus appropriately.
7. `src/components/_common/penilaian-section.tsx` — Complete rewrite with cascade filter: Sekolah → Jenjang (auto-display) → Tingkat → Kelas → Mapel → Komponen → Semester. Each filter disabled until previous selected. Auto-detects semester by current date (checks `tanggalMulai`/`tanggalSelesai`); falls back to active semester. Fetches `/api/auth/me` for role + pegawaiId. GURU role restricted to mapels they teach (filter via `/api/guru-mapel?pegawaiId=X`). POST payload includes `semesterId` and `tahunAjaranId` (auto-detected from selected kelas).
8. `src/components/_common/sekolah-section.tsx` — Complete rewrite. Added jenjang dropdown (SD/MI/SMP/MTs/MA/SD-SMP/MI-MTs) + yayasan field. Added "Riwayat Kepala Sekolah" card below the form (new `RiwayatKepalaSekolahCard` component) with table (No, Nama, NIP, Periode, Status, Aksi). Add riwayat: select pegawai (any pegawai; auto-fills namaSnapshot+nipSnapshot), tanggalMulai, status. Auto-close old riwayat handled by API. For super admin with multiple sekolah: shows sekolah switcher dropdown at top.
9. `src/components/_common/ortu-section.tsx` — Added `statusAktif` to Ortu interface + empty record. Added statusAktif badge next to "X anak" badge in card (Aktif=emerald, Nonaktif=slate). Added `Switch` import + Switch toggle in dialog for statusAktif.
10. `src/app/page.tsx` — Added 4 new menu items: Master Tingkat (group: Master Data, before Master Akademik, icon: Layers, roles: SUPER_ADMIN/TU); Master Kelas (after Master Akademik, icon: DoorOpen, roles: SUPER_ADMIN/TU); Rekap Nilai (after Penilaian, group: Akademik, icon: ClipboardList, roles: SUPER_ADMIN/TU/GURU/SISWA/ORTU); Ekstrakurikuler (after Absensi Pegawai, group: Akademik, icon: Trophy, roles: SUPER_ADMIN/TU/GURU/SISWA/ORTU). Separated "Absensi" group (Absensi Siswa + Absensi Pegawai moved out of Akademik). Imported 4 new icons (Layers, ClipboardList, Trophy; DoorOpen already imported). Imported 4 new components (TingkatSection, KelasSection, RekapNilaiSection, EkstrakurikulerSection). Added new Tab types (`tingkat`, `kelas`, `rekap-nilai`, `ekstrakurikuler`). Updated titleMap for new tabs.

## Lint Result
```
$ eslint .
EXIT_CODE=0
```
**0 errors, 0 warnings.**

## API Dependencies Used (all pre-existing)
- `/api/sekolah/list` — array of sekolahs
- `/api/sekolah?sekolahId=X` — single sekolah detail
- `/api/riwayat-kepala-sekolah?sekolahId=X` + `/{id}` (GET/POST/PUT/DELETE)
- `/api/tingkat?sekolahId=X&statusAktif=true` — list tingkats
- `/api/tingkat/auto-generate` (POST) — auto-generate tingkat by jenjang
- `/api/tingkat-mapel?tingkatId=X` + `/{id}` (GET/POST/PUT/DELETE)
- `/api/kelas?sekolahId=X` — list kelas
- `/api/ekstrakurikuler?statusAktif=true` — list ekskul
- `/api/ekstrakurikuler/{id}/siswa` — manage peserta
- `/api/jadwal?tipeJadwal=X` + `/{id}` (GET/POST/PUT/DELETE)
- `/api/jadwal/export?format=pdf|csv&kelasId=X or &tingkatId=X`
- `/api/penilaian/rekap-kelas?kelasId=X&semesterId=Y`
- `/api/penilaian/rekap-siswa?siswaId=X&semesterId=Y`
- `/api/penilaian/export?format=pdf|csv&kelasId=X or &siswaId=X&semesterId=Y`
- `/api/guru-mapel?pegawaiId=X&sekolahId=Y&statusAktif=true` + `/{id}` (GET/POST/PUT/DELETE)
- `/api/komponen-nilai?sekolahId=X` + `/{id}` (GET/POST/PUT/DELETE)
- `/api/semester?sekolahId=X` — list semesters (with tanggalMulai/selesai for auto-detect)
- `/api/auth/me` — for role + pegawaiId

## Notes
- All tabs in AkademikSection now properly cascade the sekolahId from parent (only shown when >1 sekolah).
- RekapNilaiSection: clicking a siswa name in per-kelas mode switches to per-siswa mode and pre-selects that siswa.
- JadwalSection: pembina ekskul auto-assigned as pegawaiId when tipe=ekskul.
- PenilaianSection: GURU sees only mapels they teach at the selected tingkat; if no GuruMapel exists for that tingkat, the mapel dropdown shows "Tidak ada mapel di tingkat ini".
- All statusAktif toggles use shadcn `Switch` component (consistent UX).
- All date inputs use `<Input type="date">` with ISO yyyy-mm-dd values; conversions to Date ISO handled at API layer.
