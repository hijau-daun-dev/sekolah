import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

const HARI_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const HARI_DISPLAY = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "csv").toLowerCase();
    const kelasId = searchParams.get("kelasId");
    const tingkatId = searchParams.get("tingkatId");
    const semesterId = searchParams.get("semesterId"); // optional for header info

    if (!kelasId && !tingkatId) {
      return NextResponse.json({ error: "kelasId atau tingkatId wajib" }, { status: 400 });
    }

    // Build where
    const where: Record<string, unknown> = {};
    const whereKelas: Record<string, unknown> = sekolahId ? { sekolahId } : {};
    if (kelasId) where.kelasId = Number(kelasId);
    if (tingkatId) whereKelas.tingkatId = Number(tingkatId);

    const jadwals = await db.jadwalPelajaran.findMany({
      where: { ...where, kelas: whereKelas, statusAktif: true },
      orderBy: [{ hari: "asc" }, { jamKe: "asc" }],
      include: {
        kelas: {
          select: {
            id: true, nama: true,
            tingkat: { select: { nama: true, jenjang: true } },
            walikelas: { select: { nama: true, nip: true } },
            sekolah: {
              select: {
                id: true, nama: true, jenjang: true, yayasan: true, alamat: true,
                telepon: true, email: true, website: true, logoUrl: true,
                kepalaSekolah: true, nipKepala: true,
              },
            },
            tahunAjaran: { select: { id: true, nama: true, statusAktif: true } },
          },
        },
        mapel: { select: { id: true, nama: true, kode: true } },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
        tahunAjaran: { select: { id: true, nama: true } },
        ekstrakurikuler: { select: { id: true, nama: true } },
      },
    });

    if (jadwals.length === 0) {
      return new NextResponse(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Jadwal Kosong</title>
        <style>body{font-family:Arial;padding:40px;text-align:center;color:#64748b;}</style></head>
        <body><h2>Belum ada jadwal untuk filter ini.</h2>
        <p>Silakan tambahkan jadwal pelajaran terlebih dahulu.</p></body></html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Group by kelas (each kelas = 1 page)
    const byKelas: Record<string, {
      kelas: string;
      tingkat: string;
      kelasObj: typeof jadwals[0]["kelas"];
      items: typeof jadwals;
    }> = {};
    jadwals.forEach((j) => {
      const key = `${j.kelas?.tingkat?.nama || ""} ${j.kelas?.nama || ""}`.trim();
      if (!byKelas[key]) byKelas[key] = {
        kelas: j.kelas?.nama || "",
        tingkat: j.kelas?.tingkat?.nama || "",
        kelasObj: j.kelas!,
        items: [],
      };
      byKelas[key].items.push(j);
    });
    Object.values(byKelas).forEach((g) => {
      g.items.sort((a, b) => {
        const ha = HARI_ORDER.indexOf(a.hari);
        const hb = HARI_ORDER.indexOf(b.hari);
        if (ha !== hb) return ha - hb;
        return a.jamKe - b.jamKe;
      });
    });

    if (format === "csv") {
      const rows: string[] = [];
      rows.push("Kelas,Tingkat,Hari,Jam Ke,Jam Mulai,Jam Selesai,Tipe,Judul/Mapel,Ekskul,Guru");
      Object.values(byKelas).forEach((g) => {
        g.items.forEach((j) => {
          const judul = j.tipeJadwal === "pelajaran"
            ? (j.mapel?.nama || "")
            : j.tipeJadwal === "khusus"
              ? (j.judulKhusus || "")
              : "";
          const ekskul = j.tipeJadwal === "ekskul" ? (j.ekstrakurikuler?.nama || "") : "";
          const row = [
            csv(g.kelas), csv(g.tingkat), csv(j.hari), j.jamKe,
            csv(j.jamMulai || ""), csv(j.jamSelesai || ""), csv(j.tipeJadwal),
            csv(judul), csv(ekskul), csv(j.pegawai?.nama || ""),
          ];
          rows.push(row.join(","));
        });
      });
      const csvStr = rows.join("\n");
      return new NextResponse(csvStr, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="jadwal-${kelasId || "tingkat-" + tingkatId}.csv"`,
        },
      });
    }

    // ===== PDF format: MATRIX GRID (seperti format SDN 1 Puunukulu) =====
    if (format === "pdf") {
      const html = generateMatrixHTML(Object.values(byKelas), semesterId || null);
      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({ error: "Format tidak didukung" }, { status: 400 });
  } catch (e) {
    console.error("GET jadwal/export error:", e);
    return NextResponse.json({ error: "Gagal export" }, { status: 500 });
  }
}

// ============================================================
// MATRIX HTML GENERATOR
// Format: NO | HARI/WAKTU | SENIN | SELASA | RABU | KAMIS | JUMAT | SABTU
// - Rows by jamKe + jamMulai/jamSelesai (time slot)
// - Cells contain mapel name + guru name (small)
// - Break rows ("ISTIRAHAT") span all day columns with orange background
// - Kokurikuler/Ekskul cells get light green background
// - Khusus cells (upacara, apel) get light orange background
// - Header: school name, "JADWAL PELAJARAN KURIKULUM MERDEKA", TA, kelas, semester
// - Footer: signatures (Kepala Sekolah + Wali Kelas)
// ============================================================
function generateMatrixHTML(
  kelasGroups: Array<{
    kelas: string;
    tingkat: string;
    kelasObj: any;
    items: any[];
  }>,
  semesterId: string | null
): string {
  // Lookup semester name (optional)
  const semesterName = semesterId ? `Semester ${semesterId}` : "";

  const pagesHtml = kelasGroups.map((g) => {
    const sekolah = g.kelasObj.sekolah;
    const ta = g.kelasObj.tahunAjaran;
    const walikelas = g.kelasObj.walikelas;

    // ===== Build time slots from data =====
    // Each unique (jamMulai, jamSelesai, jamKe) is a row
    // Detect "istirahat" rows by label containing "istirahat"
    type Slot = { jamKe: number; jamMulai: string; jamSelesai: string; isBreak: boolean; label?: string };
    const slotMap = new Map<string, Slot>();
    g.items.forEach((j) => {
      const key = `${j.jamMulai || ""}-${j.jamSelesai || ""}-${j.jamKe}`;
      if (!slotMap.has(key)) {
        // Break = judulKhusus contains "istirahat" (case-insensitive)
        const label = j.tipeJadwal === "khusus" ? (j.judulKhusus || "") : "";
        const isBreak = /istirahat/i.test(label);
        slotMap.set(key, {
          jamKe: j.jamKe,
          jamMulai: j.jamMulai || "",
          jamSelesai: j.jamSelesai || "",
          isBreak,
          label: isBreak ? label.toUpperCase() : undefined,
        });
      }
    });
    // Also detect break slots by gap > 15 min between consecutive slots
    const slots = Array.from(slotMap.values()).sort((a, b) => {
      if (a.jamMulai && b.jamMulai) return a.jamMulai.localeCompare(b.jamMulai);
      return a.jamKe - b.jamKe;
    });

    // ===== Build cell lookup: cells[hari][slotKey] = jadwal =====
    const cells: Record<string, Record<string, any>> = {};
    HARI_ORDER.forEach((h) => { cells[h] = {}; });
    g.items.forEach((j) => {
      const key = `${j.jamMulai || ""}-${j.jamSelesai || ""}-${j.jamKe}`;
      if (cells[j.hari]) cells[j.hari][key] = j;
    });

    // ===== Build table rows =====
    const rowsHtml = slots.map((slot, idx) => {
      const slotKey = `${slot.jamMulai}-${slot.jamSelesai}-${slot.jamKe}`;
      const timeLabel = slot.jamMulai && slot.jamSelesai
        ? `${slot.jamMulai} - ${slot.jamSelesai}`
        : `Jam ke ${slot.jamKe}`;

      // Break row: spans all day columns
      if (slot.isBreak) {
        const label = slot.label || "ISTIRAHAT";
        return `
          <tr class="break-row">
            <td class="cell-no">${idx + 1}</td>
            <td class="cell-time">${esc(timeLabel)}</td>
            <td colspan="6" class="cell-break">${esc(label)}</td>
          </tr>`;
      }

      // Regular row: each day column
      const dayCells = HARI_ORDER.map((h) => {
        const j = cells[h][slotKey];
        if (!j) return `<td class="cell-empty"></td>`;

        // Determine cell content + class
        let content = "";
        let cellClass = "cell-subject";

        if (j.tipeJadwal === "pelajaran") {
          content = `<div class="subj-name">${esc(j.mapel?.nama || "-")}</div>`;
          if (j.pegawai?.nama) {
            content += `<div class="subj-teacher">${esc(j.pegawaiNamaSnapshot || j.pegawai.nama)}</div>`;
          }
        } else if (j.tipeJadwal === "ekskul") {
          cellClass = "cell-ekskul";
          content = `<div class="subj-name">${esc(j.ekstrakurikuler?.nama || "Ekskul")}</div>`;
          if (j.pegawai?.nama) {
            content += `<div class="subj-teacher">${esc(j.pegawaiNamaSnapshot || j.pegawai.nama)}</div>`;
          }
        } else if (j.tipeJadwal === "khusus") {
          cellClass = "cell-khusus";
          content = `<div class="subj-name">${esc(j.judulKhusus || "Khusus")}</div>`;
          if (j.pegawai?.nama) {
            content += `<div class="subj-teacher">${esc(j.pegawaiNamaSnapshot || j.pegawai.nama)}</div>`;
          }
        }

        return `<td class="${cellClass}">${content}</td>`;
      }).join("");

      return `
        <tr>
          <td class="cell-no">${idx + 1}</td>
          <td class="cell-time">${esc(timeLabel)}</td>
          ${dayCells}
        </tr>`;
    }).join("");

    // ===== Header info =====
    const sekolahNama = sekolah?.nama || "SEKOLAH";
    const sekolahAlamat = sekolah?.alamat || "";
    const tahunAjaranNama = ta?.nama || "";
    const kepalaSekolahNama = sekolah?.kepalaSekolah || "-";
    const kepalaSekolahNip = sekolah?.nipKepala || "-";
    const walikelasNama = walikelas?.nama || "-";
    const walikelasNip = walikelas?.nip || "-";

    // Logo (optional)
    const logoHtml = sekolah?.logoUrl
      ? `<img src="${esc(sekolah.logoUrl)}" alt="logo" class="logo" />`
      : `<div class="logo-placeholder">LOGO</div>`;

    // Today's date for signature
    const today = new Date();
    const todayStr = today.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const kotaName = sekolahAlamat.split(",")[0]?.trim() || "_________";

    // ===== Single page (kelas) =====
    return `
      <div class="page">
        <!-- Header / Kop Sekolah -->
        <div class="kop-sekolah">
          ${logoHtml}
          <div class="kop-text">
            <div class="kop-yayasan">${esc(sekolah?.yayasan || "PEMERINTAH")}</div>
            <div class="kop-nama">${esc(sekolahNama)}</div>
            <div class="kop-alamat">${esc(sekolahAlamat)}</div>
            <div class="kop-kontak">
              ${sekolah?.telepon ? `Telp: ${esc(sekolah.telepon)}` : ""}
              ${sekolah?.email ? ` &bull; Email: ${esc(sekolah.email)}` : ""}
              ${sekolah?.website ? ` &bull; Web: ${esc(sekolah.website)}` : ""}
            </div>
          </div>
        </div>
        <div class="garis-pembatas"></div>

        <!-- Title -->
        <div class="judul-utama">JADWAL PELAJARAN</div>
        <div class="judul-sub">TAHUN PELAJARAN ${esc(tahunAjaranNama)}</div>

        <!-- Info Bar -->
        <table class="info-bar">
          <tr>
            <td class="info-label">KELAS</td>
            <td class="info-sep">:</td>
            <td class="info-value">${esc(g.kelas)} (Tingkat ${esc(g.tingkat)})</td>
            <td class="info-spacer"></td>
            <td class="info-label">SEMESTER</td>
            <td class="info-sep">:</td>
            <td class="info-value">${semesterName ? esc(semesterName) : "Ganjil / Genap"}</td>
          </tr>
        </table>

        <!-- Matrix Table -->
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="col-no">NO</th>
              <th class="col-time">HARI / WAKTU</th>
              ${HARI_DISPLAY.map((h) => `<th class="col-day">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Footer / Signatures -->
        <div class="signature-area">
          <div class="signature-col">
            <div class="sig-label">Mengetahui,</div>
            <div class="sig-label">Kepala Sekolah</div>
            <div class="sig-space">&nbsp;</div>
            <div class="sig-name"><u>${esc(kepalaSekolahNama)}</u></div>
            <div class="sig-nip">NIP. ${esc(kepalaSekolahNip)}</div>
          </div>
          <div class="signature-col">
            <div class="sig-label">${esc(kotaName)}, ${esc(todayStr)}</div>
            <div class="sig-label">Wali Kelas ${esc(g.kelas)}</div>
            <div class="sig-space">&nbsp;</div>
            <div class="sig-name"><u>${esc(walikelasNama)}</u></div>
            <div class="sig-nip">NIP. ${esc(walikelasNip)}</div>
          </div>
        </div>

        <div class="watermark">Jadwal Pelajaran</div>
      </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Jadwal Pelajaran - ${kelasGroups.map(g => g.kelas).join(", ")}</title>
<style>
  @page {
    size: A4 landscape;
    margin: 12mm 14mm;
  }
  * { box-sizing: border-box; }
  body {
    font-family: "Times New Roman", Times, serif;
    color: #000;
    margin: 0;
    padding: 0;
    background: #fff;
  }
  .page {
    width: 100%;
    margin: 0 auto 20px auto;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }

  /* ===== KOP SEKOLAH ===== */
  .kop-sekolah {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 4px;
  }
  .logo, .logo-placeholder {
    width: 70px;
    height: 70px;
    flex-shrink: 0;
    object-fit: contain;
  }
  .logo-placeholder {
    border: 1px dashed #999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #999;
    font-weight: bold;
  }
  .kop-text {
    flex: 1;
    text-align: center;
  }
  .kop-yayasan {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .kop-nama {
    font-size: 16px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 2px 0;
  }
  .kop-alamat {
    font-size: 10px;
    font-style: italic;
  }
  .kop-kontak {
    font-size: 10px;
    font-style: italic;
    margin-top: 1px;
  }
  .garis-pembatas {
    border-bottom: 3px double #000;
    margin: 4px 0 16px 0;
  }

  /* ===== TITLE ===== */
  .judul-utama {
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .judul-sub {
    text-align: center;
    font-size: 14px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 14px;
  }

  /* ===== INFO BAR ===== */
  .info-bar {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
    font-size: 12px;
  }
  .info-bar td { padding: 2px 4px; }
  .info-label { font-weight: bold; width: 60px; }
  .info-sep { width: 8px; }
  .info-value { width: 35%; }
  .info-spacer { width: 4%; }

  /* ===== MATRIX TABLE ===== */
  .matrix-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    table-layout: fixed;
  }
  .matrix-table th, .matrix-table td {
    border: 1px solid #000;
    padding: 4px 6px;
    vertical-align: middle;
    word-wrap: break-word;
  }
  .matrix-table thead th {
    background: #e2e8f0;
    font-weight: bold;
    text-align: center;
    text-transform: uppercase;
    font-size: 11px;
    padding: 6px 4px;
  }
  .col-no { width: 5%; }
  .col-time { width: 14%; }
  .col-day { width: 13.5%; }

  .cell-no, .cell-time {
    text-align: center;
    font-weight: 600;
  }
  .cell-time { font-size: 10.5px; }

  /* Subject cell content */
  .cell-subject, .cell-ekskul, .cell-khusul, .cell-empty {
    text-align: center;
  }
  .subj-name {
    font-weight: 600;
    font-size: 11px;
    line-height: 1.2;
  }
  .subj-teacher {
    font-size: 9.5px;
    font-style: italic;
    color: #444;
    margin-top: 2px;
    line-height: 1.1;
  }

  /* Color coding */
  .cell-ekskul {
    background: #D6E8D0; /* light green */
  }
  .cell-khusus {
    background: #FFE4B5; /* light orange/peach */
  }
  .cell-empty {
    background: #fafafa;
  }

  /* Break row */
  .break-row .cell-break {
    background: #FFDAB9;
    text-align: center;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 1px;
    padding: 6px;
  }

  /* ===== SIGNATURE AREA ===== */
  .signature-area {
    display: flex;
    justify-content: space-between;
    margin-top: 28px;
    padding: 0 20px;
    font-size: 12px;
  }
  .signature-col {
    width: 45%;
    text-align: left;
  }
  .signature-col:last-child {
    text-align: left;
  }
  .sig-label { line-height: 1.5; }
  .sig-space { height: 50px; }
  .sig-name {
    font-weight: bold;
    text-decoration: underline;
  }
  .sig-nip {
    font-size: 11px;
    margin-top: 2px;
  }

  /* ===== WATERMARK ===== */
  .watermark {
    text-align: center;
    font-size: 10px;
    font-style: italic;
    color: #888;
    margin-top: 16px;
  }

  /* ===== PRINT BUTTON (hidden on print) ===== */
  .print-btn {
    position: fixed;
    top: 12px;
    right: 12px;
    background: #1e293b;
    color: white;
    border: none;
    padding: 10px 18px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    z-index: 1000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
  }
  .print-btn:hover { background: #334155; }

  @media print {
    .print-btn { display: none; }
    @page { size: A4 landscape; margin: 12mm 14mm; }
  }

  @media screen {
    body { background: #e5e7eb; padding: 20px; }
    .page {
      max-width: 1100px;
      background: white;
      padding: 30px 40px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      border-radius: 4px;
    }
  }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
  ${pagesHtml}
  <script>
    // Auto-trigger print after load (optional)
    // window.onload = () => setTimeout(() => window.print(), 500);
  </script>
</body>
</html>`;
}

function csv(s: string | number): string {
  const v = String(s ?? "");
  if (v.includes(",") || v.includes('"') || v.includes("\n")) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
function esc(s: string | number | null | undefined): string {
  return String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string));
}
