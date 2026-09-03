#!/bin/bash
# Comprehensive module test script
# Tests each module by clicking its nav button and checking for errors

NAV_BUTTONS=(
  "Dashboard"
  "Data Sekolah"
  "Data Pegawai"
  "Data Siswa"
  "Data Ortu/Wali"
  "Master Akademik"
  "Master Sarana"
  "Master Keuangan"
  "Jadwal Pelajaran"
  "Absensi Siswa"
  "Penilaian"
  "Absensi Pegawai"
  "Tagihan Siswa"
  "Pembayaran"
  "Pengeluaran Kas"
  "Peminjaman Barang"
  "Pengumuman"
  "Galeri & Berita"
  "Struktur Organisasi"
  "Manajemen User"
)

PASS=0
FAIL=0
ERRORS=()

for btn in "${NAV_BUTTONS[@]}"; do
  # Click via eval (more reliable than agent-browser click)
  RESULT=$(agent-browser eval "Array.from(document.querySelectorAll('nav button')).find(b => b.textContent === '$btn')?.click(); 'ok'" 2>&1 | tail -1)
  sleep 3
  
  # Check for runtime errors
  ERR_CHECK=$(agent-browser errors 2>&1 | grep -iE "error" | head -1)
  
  # Check page heading
  HEADING=$(agent-browser snapshot 2>&1 | grep -A1 "level=1" | head -2 | tail -1 | sed 's/.*StaticText //' | head -c 40)
  
  # Check for error toast
  TOAST_ERR=$(agent-browser snapshot 2>&1 | grep -iE "gagal|error|failed" | head -1)
  
  if [ -n "$ERR_CHECK" ]; then
    echo "❌ $btn → ERROR: $ERR_CHECK"
    FAIL=$((FAIL+1))
    ERRORS+=("$btn: $ERR_CHECK")
  elif [ -n "$TOAST_ERR" ]; then
    echo "⚠️  $btn → Toast: $TOAST_ERR"
    PASS=$((PASS+1))
  else
    echo "✅ $btn → OK ($HEADING)"
    PASS=$((PASS+1))
  fi
  
  # Clear errors for next iteration
  agent-browser errors --clear 2>&1 > /dev/null
done

echo ""
echo "=== SUMMARY ==="
echo "Passed: $PASS / $((PASS+FAIL))"
if [ $FAIL -gt 0 ]; then
  echo "Failed:"
  printf '  - %s\n' "${ERRORS[@]}"
fi
