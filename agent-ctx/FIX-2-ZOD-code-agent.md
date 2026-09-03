# Task FIX-2-ZOD — Zod validation rollout to remaining API routes

Agent: code-agent (FIX-2-ZOD)
Task: Tambahkan validasi Zod ke 9 API route yang belum pakai schema (pembayaran & pengeluaran sudah dipakai sebagai referensi pattern).

## Files modified (9 routes)
1. `src/app/api/pengumuman/route.ts` — POST pakai `pengumumanSchema` (judul, isi, target enum).
2. `src/app/api/tagihan/route.ts` — POST pakai `tagihanSchema` (siswaId, tarifPembayaranId, tahunAjaranId, bulanTagihan, nominal, statusLunas, tanggalJatuhTempo). Preserve existing sekolahId filter & getAllowedSiswaIds isolation di GET (tidak diubah).
3. `src/app/api/generate-tagihan/route.ts` — POST pakai `generateTagihanSchema` (tahunAjaranId, bulanTagihan, jenisPembayaranId nullable). Tambahan business rule `BULAN_LIST.includes(bulanTagihan)` tetap dipertahankan setelah parse (di luar cakupan schema).
4. `src/app/api/generate-kelas/route.ts` — POST pakai `generateKelasSchema` (tahunAjaranIdLama, tahunAjaranIdBaru). Tambahan business rule "TAs must differ" dipertahankan setelah parse.
5. `src/app/api/penilaian/route.ts` — POST pakai `penilaianSchema` (array). Body dinormalisasi dulu (array | {items:[...]}), lalu tiap item di-Number() sebelum parse. Field `tahunAjaranId` & `tanggal` tidak ada di schema — diambil dari rawArr berdasarkan index untuk upsert (diberi komentar jelas).
6. `src/app/api/absensi-siswa/route.ts` — POST pakai `absensiSiswaSchema` (array). Sama: normalize → Number() → parse. Semua field (siswaId, kelasId, tanggal, status, keterangan) ada di schema, jadi full gunakan parsed.data.
7. `src/app/api/siswa/route.ts` — POST pakai `siswaSchema`. Semua field ada di schema. `sekolahId` untuk SUPER_ADMIN tetap diambil dari body.sekolahId (di luar schema, preserved existing behavior).
8. `src/app/api/pegawai/route.ts` — POST pakai `pegawaiSchema`. orgLevel/orgOrder/parentId di-Number() sebelum parse (string → number conversion).
9. `src/app/api/user/route.ts` — POST pakai `userSchema`. Password optional di schema — ditambahkan check `if (!password)` setelah parse untuk POST (sesuai instruksi task).

## Pattern applied
```ts
import { schemaName } from "@/lib/schemas";
// ... in POST handler:
const body = await req.json();
const parsed = schemaName.safeParse({ ... }); // Number() conversion if needed
if (!parsed.success) {
  return NextResponse.json({
    error: "Validasi gagal",
    details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
  }, { status: 400 });
}
const { ...fields } = parsed.data;
// use parsed.data fields
```

## Preserved logic (NOT modified)
- All auth checks (session, role-based RBAC, sekolahId filter for SUPER_ADMIN vs others)
- All data isolation (getAllowedSiswaIds for ORTU/SISWA, getCurrentSekolahId)
- All transactions (`db.$transaction`)
- All fallback pegawaiId resolution
- All sekolahId-from-body fallback for SUPER_ADMIN
- All bulk create / upsert patterns
- All additional business rules not in schema (BULAN_LIST enum check, TAs-must-differ check, password-required-on-POST check, email uniqueness, role existence check, kodeKwitansi generation in pembayaran)

## Lint result
`bun run lint` → exit code 0, 0 errors, 0 warnings.

## Smoke test (agent-browser, login as admin@nusantarajaya.sch.id)
- Login → 200 OK, dashboard loads.
- Navigate to Pengumuman → list loads (existing record visible).
- Direct API probes verified Zod behavior end-to-end:
  - `POST /api/pengumuman` empty judul → 400 `{"error":"Validasi gagal","details":"judul: Too small..."}`  ✓
  - `POST /api/pengumuman` invalid target → 400 `target: Invalid option...` ✓
  - `POST /api/pengumuman` valid + sekolahId=1 → 200 created ✓
  - `POST /api/siswa` empty nama → 400 ✓
  - `POST /api/siswa` valid → 200 created ✓
  - `POST /api/penilaian` nilai=150 (out of 0-100) → 400 `0.nilai: Too big...` ✓
  - `POST /api/penilaian` valid array → 200 `{saved:1}` ✓
  - `POST /api/absensi-siswa` invalid status → 400 `0.status: Invalid option...` ✓
  - `POST /api/absensi-siswa` valid array → 200 `{saved:1}` ✓
  - `POST /api/tagihan` nominal=-100 → 400 `nominal: Too small...` ✓
  - `POST /api/generate-kelas` same TA → 400 `Tahun ajaran lama dan baru tidak boleh sama` ✓
  - `POST /api/generate-tagihan` invalid bulan → 400 `bulanTagihan tidak valid...` ✓
  - `POST /api/user` invalid email → 400 `email: Invalid email address` ✓
  - `POST /api/user` missing password → 400 `password wajib diisi` ✓
  - `POST /api/pegawai` orgLevel="bukanangka" → 400 `orgLevel: Invalid input: expected number, received NaN` ✓
  - `POST /api/pegawai` valid → 200 created ✓

## Known pre-existing issue (NOT introduced by this task)
- `POST /api/pengumuman` as SUPER_ADMIN returns 400 `sekolahId wajib untuk super admin` because the frontend doesn't send `sekolahId` in the body, and the route forces `sekolahId = undefined` for SUPER_ADMIN. This block was preserved verbatim from the original code (identical to before the Zod refactor) — confirmed by inspecting git history. Not in scope for FIX-2-ZOD; should be filed as separate task if needed.

## Summary
All 9 API routes now use the shared Zod schemas from `src/lib/schemas/index.ts`. Validation is consistent with the pattern established in pembayaran & pengeluaran routes. Lint clean. Smoke test confirms Zod validation triggers correctly on invalid input and the rest of the handler logic (auth, isolation, transactions, business rules) continues to work for valid input.
