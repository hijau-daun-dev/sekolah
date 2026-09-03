# Work Record — Task ID: A-master-data

**Agent**: code-agent (master data modules)
**Task**: Build API routes + UI section components for master data modules of the SIMSEKOLAH project.

## What was built

7 master-data modules covering 24 API route files + 7 UI section components + 2 helper components. Every API checks NextAuth session, filters by `sekolahId` for non-SUPER_ADMIN users, and validates ownership on `[id]` routes. All UI components are `"use client"`, slate-themed, responsive, with CRUD dialogs + delete confirmation + toast notifications.

## Files Created

### API routes (24 files)

**Sekolah**
- `src/app/api/sekolah/route.ts` — GET (current user's sekolah) + POST (upsert, SUPER_ADMIN can pick id, others forced to own sekolahId)

**Pegawai** (with org self-relation + cycle detection)
- `src/app/api/pegawai/route.ts` — GET (with `_count.children` + parent), POST
- `src/app/api/pegawai/[id]/route.ts` — GET, PUT (validates parent doesn't form cycle via `wouldCreateCycle` walker), DELETE (blocked if has children)

**Siswa**
- `src/app/api/siswa/route.ts` — GET (with `kelasSiswas.kelas.tingkat.tahunAjaran`), POST
- `src/app/api/siswa/[id]/route.ts` — GET, PUT, DELETE

**Ortu** (with ortu-siswa many-to-many)
- `src/app/api/ortu/route.ts` — GET (with `anakAnak.siswa`), POST
- `src/app/api/ortu/[id]/route.ts` — GET, PUT, DELETE
- `src/app/api/ortu/[id]/add-anak/route.ts` — POST { siswaId, hubungan } (upsert on unique [ortuId, siswaId])
- `src/app/api/ortu/[id]/remove-anak/[siswaId]/route.ts` — DELETE

**Akademik** (10 models)
- `tahun-ajaran/route.ts` + `[id]/route.ts` — POST/PUT use transaction to flip other `statusAktif=false` when setting one active; DELETE blocked if has semester/kelas
- `semester/route.ts` + `[id]/route.ts` — same single-active pattern; auto-fills `sekolahId` from parent TA
- `tingkat/route.ts` + `[id]/route.ts` — DELETE blocked if has kelas
- `jurusan/route.ts` + `[id]/route.ts` — DELETE blocked if has kelas
- `kelas/route.ts` + `[id]/route.ts` — GET with tingkat/jurusan/TA/walikelas + `_count.kelasSiswas`; DELETE blocked if has siswa
- `kelas-siswa/route.ts` + `[id]/route.ts` — supports `?kelasId=` / `?siswaId=` filters
- `kategori-mapel/route.ts` + `[id]/route.ts` — DELETE blocked if has mapel
- `mapel/route.ts` + `[id]/route.ts` — DELETE blocked if has jadwal
- `komponen-nilai/route.ts` + `[id]/route.ts` — validates bobot 0-100; DELETE blocked if has penilaian
- `guru-mapel/route.ts` + `[id]/route.ts` — unique [pegawaiId, mapelId, kelasId]

**Sarana** (3 models)
- `ruangan/route.ts` + `[id]/route.ts`
- `kategori-barang/route.ts` + `[id]/route.ts`
- `barang/route.ts` + `[id]/route.ts` — GET/POST/PUT/DELETE with kategoriBarang + ruangan include

**KeuanganMaster** (3 models)
- `jenis-pembayaran/route.ts` + `[id]/route.ts` — DELETE blocked if has tarif
- `tarif-pembayaran/route.ts` + `[id]/route.ts` — GET with jenisPembayaran/tahunAjaran/tingkat; DELETE blocked if has tagihan
- `pos-anggaran/route.ts` + `[id]/route.ts` — DELETE blocked if has pengeluaran

### UI components (7 + 2 helpers)

- `src/components/_common/sekolah-section.tsx` — single-record form with ImageUpload for logo, all 11 fields, save button
- `src/components/_common/pegawai-section.tsx` — card grid view, search, add/edit dialog with foto upload, gender/jabatan/bidangStudi fields, org position section (parent select excluding self, level, order), delete blocked if has children
- `src/components/_common/siswa-section.tsx` — card grid view, search + status filter, add/edit dialog with foto upload, all fields, current kelas display
- `src/components/_common/ortu-section.tsx` — card grid view, search, add/edit dialog with foto upload; in edit dialog, list of linked siswa with add/remove (select siswa + hubungan)
- `src/components/_common/akademik-section.tsx` — 5 tabs (TA & Semester, Tingkat & Jurusan, Kelas & Siswa, Mata Pelajaran, Komponen Nilai & Guru Mapel) using shadcn Tabs. Each tab has table + add/edit dialog. Kelas tab includes a SiswaManager dialog to add/remove siswa from a kelas.
- `src/components/_common/sarana-section.tsx` — 3 tabs (Ruangan, Kategori Barang, Barang/Inventaris) using shared CrudTable
- `src/components/_common/keuangan-master-section.tsx` — 3 tabs (Jenis Pembayaran, Tarif Pembayaran, Pos Anggaran) using shared CrudTable
- `src/components/_common/_crud-table.tsx` — reusable generic CRUD table component (`CrudTable<T>`) with search, dialog form supporting text/number/date/textarea/select/switch fields, delete confirmation. Used by 9 of the akademik/sarana/keuangan tabs.
- `src/components/_common/_format.ts` — client-side formatting helpers (fmtIDR, fmtDateDisplay, fmtDate, toDateISO)

### Misc
- `src/app/page.tsx` — small fix: extracted `window.location.href = "/login"` from inline render mutation into a `LoginRedirector` component using `useEffect` to satisfy `react-hooks/immutability` lint rule.

## Conventions followed

- All API routes use `import { db } from "@/lib/db"` and `import { auth } from "@/lib/auth"`.
- Auth pattern: `const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);` then `if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return 403`.
- All `[id]` routes use `checkOwnership(id, sekolahId)` helper to verify the resource belongs to the caller's sekolah before any operation.
- DateTime inputs use `<Input type="date">` in forms and `new Date(value).toISOString()` on save; display via `toLocaleDateString("id-ID", ...)`.
- Currency formatted as IDR via `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })`.
- Slate theme throughout — no indigo/blue, no emerald except in pre-existing dashboard.tsx.
- All sections use `'use client'`, `useCallback` for `load` functions, `useToast` for notifications, loading + error states handled.
- Delete operations on parent records ( Pegawai with children, TahunAjaran with semester/kelas, Tingkat/Jurusan with kelas, Kelas with siswa, Mapel with jadwal, KategoriMapel with mapel, KomponenNilai with penilaian, JenisPembayaran with tarif, TarifPembayaran with tagihan, PosAnggaran with pengeluaran ) return HTTP 400 with explanatory message instead of cascading.

## Lint Result

Final `bun run lint` output:
```
✖ 5 problems (0 errors, 5 warnings)
```
**0 errors.** The 5 warnings are all pre-existing "Unused eslint-disable directive" in legacy `src/components/school/*` files that pre-date this task and are out of scope.

## Issues / Notes for downstream agents

1. **Pre-existing legacy files** at `src/app/api/{school,students,teachers,subjects,classrooms}/*` and `src/components/school/*` reference the OLD schema (cuid, `name`/`address`/`principalName` fields) and will fail at runtime. They are not used by my new sections. Should be deleted by orchestrator cleanup at end.

2. **Page.tsx imports** many section components not yet built (`tagihan-section`, `pembayaran-section`, `pengeluaran-section`, `jadwal-section`, `absensi-siswa-section`, `penilaian-section`, `absensi-pegawai-section`, `peminjaman-section`, `pengumuman-section`, `galeri-section`, `org-structure-section`, `user-management-section`). Until those are created by sibling agents, dev server will throw Module not found. My 7 sections + dashboard + providers are present.

3. **CrudTable generic component** at `src/components/_common/_crud-table.tsx` is reusable — sibling agents building transactional sections (jadwal, absensi, penilaian, etc.) are welcome to import `CrudTable`, `ColumnDef`, `FieldDef` from there to save boilerplate.

4. **Active TA / Semester single-active enforcement** is implemented inside the API routes (transaction that flips other rows to `statusAktif=false`). The UI just sends a boolean.

5. **Pegawai cycle detection** walks up `parentId` chain to depth-first detect if candidate parent is a descendant of the node being updated.

6. **`_count` fields** in includes are used by UI to show "X anak", "X bawahan", "X siswa", "X kelas", etc. on cards/tables.

7. **ImageUpload** component already existed — reused as-is. It POSTs to `/api/upload` (already existed, protected by auth).
