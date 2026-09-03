# Task ID: FIX-3-SEKOLAH
Agent: code-agent (Super Admin sekolahId fallback fix)

## Task
Bug: 16 API route files punya pattern `if (!sid) return NextResponse.json({ error: "sekolahId wajib untuk super admin" }, { status: 400 });` yang mem-block Super Admin (yang tidak punya sekolahId di session karena manage multiple sekolah) dari create data.

## Root Cause Analysis
- Membaca `/home/z/my-project/worklog.md` — konteks dari FIX-1 (data isolation + generate-kelas) dan FIX-2-ZOD (Zod validation rollout).
- FIX-2-ZOD worklog sudah menandai pre-existing issue ini secara eksplisit: "POST /api/pengumuman as SUPER_ADMIN mengembalikan 400 `sekolahId wajib untuk super admin` ... Block ini preserved verbatim dari kode original; bukan di scope FIX-2-ZOD."
- Bug ini juga sudah di-fix sebelumnya di `/api/tahun-ajaran/route.ts` dan `/api/pengumuman/route.ts` (keduanya sudah pakai `let sid` + `db.sekolah.findFirst` fallback). Pattern fix yang sama harus diterapkan ke 16 file lainnya.
- Grep verifikasi: semua 16 file target memakai pattern IDENTIK tanpa variasi:
  ```ts
  const sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
  if (!sid) return NextResponse.json({ error: "sekolahId wajib untuk super admin" }, { status: 400 });
  ```
- Tidak ada satupun file yang punya pattern ini di handler PUT/PATCH tambahan (masing-masing hanya 1 occurence di POST). Tidak ada variasi `sekolahIdFinal`.

## Fix Applied
Untuk setiap 16 file, ganti 2 baris `const sid` + single-line `if (!sid) return ...` menjadi 7 baris:
```ts
// Resolve sekolahId: from session, or body, or fallback to first sekolah for super admin
let sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
if (!sid) {
  const firstSekolah = await db.sekolah.findFirst({ select: { id: true } });
  if (!firstSekolah) return NextResponse.json({ error: "Belum ada sekolah terdaftar" }, { status: 400 });
  sid = firstSekolah.id;
}
```
Key change: `const sid` → `let sid` (karena di-reassign); tambah fallback query `db.sekolah.findFirst` saat sid kosong; error message baru "Belum ada sekolah terdaftar" (400) hanya muncul bila benar-benar tidak ada sekolah sama sekali.

## Files Modified (16)
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

(Total 16 file — semua dengan single edit. Tidak diperlukan MultiEdit karena masing-masing file hanya punya 1 occurence pattern.)

## Verification
### Lint
```
$ cd /home/z/my-project && bun run lint
$ eslint .
(exit 0, no output, 0 errors, 0 warnings)
```

### Grep verification
- `grep -rn "sekolahId wajib untuk super admin" /home/z/my-project/src/app/api/` → 0 matches (semua sudah hilang)
- `grep -rn "const sid = sekolahId" /home/z/my-project/src/app/api/` → 0 matches (semua sudah jadi `let sid`)
- `grep -rln "Belum ada sekolah terdaftar" /home/z/my-project/src/app/api/` → 18 file (16 baru di-fix + tahun-ajaran + pengumuman yang sudah di-fix sebelumnya)

### Functional test (login sebagai Super Admin admin@nusantarajaya.sch.id)
```bash
# 1. Auth login (HTTP 302 redirect = success)
rm -f /tmp/c8.txt
CSRF=$(curl -s -c /tmp/c8.txt http://localhost:3000/api/auth/csrf | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -b /tmp/c8.txt -c /tmp/c8.txt -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@nusantarajaya.sch.id&password=admin123&csrfToken=$CSRF&redirect=false" -o /dev/null
# → HTTP 302

# 2. POST /api/tahun-ajaran (sudah di-fix sebelumnya, kontrol positif)
curl -s -b /tmp/c8.txt -X POST http://localhost:3000/api/tahun-ajaran \
  -H "Content-Type: application/json" \
  -d '{"nama":"2026/2027","statusAktif":false}'
# → {"id":3,"sekolahId":1,"nama":"2026/2027","tanggalMulai":null,"tanggalSelesai":null,"statusAktif":false,"createdAt":"2026-09-03T09:56:35.168Z","_count":{"semesters":0,"kelases":0}}

# 3. POST /api/kategori-mapel (baru di-fix di task ini)
curl -s -b /tmp/c8.txt -X POST http://localhost:3000/api/kategori-mapel \
  -H "Content-Type: application/json" \
  -d '{"nama":"Test Kategori"}'
# → {"id":2,"sekolahId":1,"nama":"Test Kategori","keterangan":null,"_count":{"mapels":0}}
```
**Hasil**: kedua POST return 200 dengan data baru (bukan 400 "sekolahId wajib untuk super admin"). `sekolahId: 1` di response membuktikan fallback ke `db.sekolah.findFirst()` bekerja dengan benar.

### Cleanup
```bash
# Delete test tahun-ajaran id=3
curl -s -b /tmp/c8.txt -X DELETE http://localhost:3000/api/tahun-ajaran/3
# → {"ok":true} (HTTP 200)

# Delete test kategori-mapel id=2
curl -s -b /tmp/c8.txt -X DELETE http://localhost:3000/api/kategori-mapel/2
# → {"ok":true} (HTTP 200)

# Verifikasi GET
curl -s -b /tmp/c8.txt http://localhost:3000/api/kategori-mapel
# → [{"id":1,"sekolahId":1,"nama":"Wajib (A)",...}]  (Test Kategori hilang)

curl -s -b /tmp/c8.txt http://localhost:3000/api/tahun-ajaran
# → [{"id":1,"sekolahId":1,"nama":"2025/2026",...}]  (2026/2027 hilang)
```

## Side Effects / Notes
- Fix konsisten dengan pattern yang sudah ada di `/api/tahun-ajaran/route.ts` dan `/api/pengumuman/route.ts` (yang sudah di-fix sebelumnya — kemungkinan sebagai bagian dari FIX-2-ZOD side work). Sekarang semua 18 endpoint yang punya pattern `sid = sekolahId ?? body.sekolahId` sudah konsisten pakai fallback ke `db.sekolah.findFirst()`.
- Behavior change: jika database benar-benar tidak ada Sekolah sama sekali (kasus edge, biasanya seed endpoint sudah bikin minimal 1 sekolah), endpoint akan return 400 "Belum ada sekolah terdaftar" — bukan lagi "sekolahId wajib untuk super admin". Pesan lebih user-friendly.
- Tidak ada change ke auth check, role check, Zod validation, transaction, atau logic bisnis lainnya. Hanya blok `const sid` + single-line `if (!sid)` yang diganti.
- Variabel `sid` tetap namanya (task brief menyebut kemungkinan variasi `sekolahIdFinal`, tapi ternyata semua 16 file pakai `sid` — tidak ada rename).
- Tidak ada perubahan ke import statement (`db` memang sudah di-import di semua file).

## Compliance Update (vs AUDIT-1 + FIX-2 scorecard)
- **BUG #6 Super Admin blocked from creating data** → FIXED (16 endpoint sekarang gracefully fallback ke sekolah pertama).
- PRD §3.6 (PWA-level data isolation) — tidak diubah; Super Admin tetap bisa span multiple sekolah (correct behavior).
- PRD §3 (strict input validation) — tidak diubah; Zod validation dari FIX-2 preserved verbatim.

## Not in scope (deferred)
- Refactor: extract pattern `let sid = ...; if (!sid) { firstSekolah fallback }` ke helper `resolveSekolahId(session, body)` di `auth-helpers.ts`. Saat ini pattern di-duplicate di 18 file. Bisa di-refactor di iterasi berikutnya untuk DRYness, tapi duplication sengaja dipertahankan untuk minimal-edit policy sesuai task brief.
- Edge case: Super Admin yang ingin create data di sekolah SPESIFIK (bukan first sekolah) tetap bisa lewat `body.sekolahId` — ini sudah supported di kode lama, tidak diubah.
