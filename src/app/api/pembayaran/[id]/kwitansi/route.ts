import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const fmtIDRServer = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

const fmtDateServer = (d?: Date | null) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

const fmtTimeServer = (d?: Date | null) =>
  d ? new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return new Response("No sekolah", { status: 403 });

    const { id } = await params;
    const data = await db.pembayaran.findFirst({
      where: { id: Number(id), ...(sekolahId ? { tagihanSiswa: { siswa: { sekolahId } } } : {}) },
      include: {
        tagihanSiswa: {
          include: {
            siswa: { select: { id: true, nama: true, nis: true, nisn: true } },
            tarifPembayaran: { include: { jenisPembayaran: { select: { id: true, nama: true } } } },
            tahunAjaran: { select: { id: true, nama: true } },
          },
        },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
      },
    });
    if (!data) return new Response("Pembayaran tidak ditemukan", { status: 404 });

    // Get sekolah info
    const sekolah = sekolahId
      ? await db.sekolah.findUnique({ where: { id: sekolahId } })
      : await db.sekolah.findFirst({
          where: { siswas: { some: { id: data.tagihanSiswa.siswa.id } } },
        });

    const sekolahNama = escapeHtml(sekolah?.nama || "SEKOLAH");
    const sekolahAlamat = escapeHtml(sekolah?.alamat || "");
    const sekolahTelepon = escapeHtml(sekolah?.telepon || "");
    const sekolahEmail = escapeHtml(sekolah?.email || "");
    const kepalaSekolah = escapeHtml(sekolah?.kepalaSekolah || "");
    const logoUrl = sekolah?.logoUrl || "";

    const siswaNama = escapeHtml(data.tagihanSiswa.siswa.nama);
    const siswaNis = escapeHtml(data.tagihanSiswa.siswa.nis || data.tagihanSiswa.siswa.nisn || "-");
    const jenisPembayaran = escapeHtml(data.tagihanSiswa.tarifPembayaran.jenisPembayaran.nama);
    const bulanTagihan = escapeHtml(data.tagihanSiswa.bulanTagihan || "-");
    const tahunAjaran = escapeHtml(data.tagihanSiswa.tahunAjaran.nama);
    const nominalTagihan = data.tagihanSiswa.nominal;
    const jumlahBayar = data.jumlahBayar;
    const metode = escapeHtml(data.metodePembayaran);
    const kodeKwitansi = escapeHtml(data.kodeKwitansi);
    const tanggalBayar = data.tanggalBayar;
    const pegawaiNama = escapeHtml(data.pegawai?.nama || "-");
    const pegawaiJabatan = escapeHtml(data.pegawai?.jabatan || "Petugas");
    const keterangan = data.keterangan ? escapeHtml(data.keterangan) : "";

    const isLunas = jumlahBayar >= nominalTagihan;
    const terbilangStr = `${new Intl.NumberFormat("id-ID").format(jumlahBayar)} Rupiah`;

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>Kwitansi ${kodeKwitansi}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Times New Roman", Georgia, serif;
    color: #1e293b;
    margin: 0;
    padding: 24px;
    background: #fff;
  }
  .receipt {
    max-width: 800px;
    margin: 0 auto;
    border: 2px solid #1e293b;
    padding: 32px;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 3px solid #1e293b;
    padding-bottom: 16px;
    margin-bottom: 16px;
  }
  .logo {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    border: 1px solid #cbd5e1;
  }
  .logo img { width: 100%; height: 100%; object-fit: cover; }
  .logo-placeholder { font-size: 24px; font-weight: bold; color: #475569; }
  .header-text { flex: 1; text-align: center; }
  .header-text h1 { font-size: 22px; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
  .header-text p { margin: 2px 0; font-size: 12px; color: #475569; }
  .title-band {
    background: #1e293b;
    color: #fff;
    text-align: center;
    padding: 8px;
    margin-bottom: 16px;
  }
  .title-band h2 { margin: 0; font-size: 16px; letter-spacing: 2px; text-transform: uppercase; }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 24px;
    margin-bottom: 16px;
    font-size: 13px;
  }
  .info-grid .row {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px dotted #cbd5e1;
    padding: 4px 0;
  }
  .info-grid .label { color: #475569; min-width: 100px; }
  .info-grid .value { font-weight: bold; text-align: right; }
  .table-section {
    margin-top: 16px;
  }
  table.items {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  table.items th, table.items td {
    border: 1px solid #cbd5e1;
    padding: 8px;
    text-align: left;
  }
  table.items th {
    background: #f1f5f9;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
  }
  table.items td.right { text-align: right; }
  .total-row td {
    background: #1e293b;
    color: #fff;
    font-weight: bold;
    font-size: 14px;
  }
  .terbilang {
    margin-top: 12px;
    padding: 8px 12px;
    background: #f8fafc;
    border-left: 4px solid #1e293b;
    font-style: italic;
    font-size: 13px;
  }
  .footer {
    margin-top: 32px;
    display: flex;
    justify-content: space-between;
    gap: 32px;
    page-break-inside: avoid;
  }
  .signature {
    text-align: center;
    font-size: 12px;
    min-width: 200px;
  }
  .signature .place { margin-bottom: 60px; }
  .signature .name { font-weight: bold; border-top: 1px solid #1e293b; padding-top: 4px; }
  .status-stamp {
    display: inline-block;
    border: 2px solid ${isLunas ? "#16a34a" : "#e11d48"};
    color: ${isLunas ? "#16a34a" : "#e11d48"};
    padding: 6px 16px;
    font-weight: bold;
    text-transform: uppercase;
    transform: rotate(-6deg);
    font-size: 14px;
    letter-spacing: 1px;
    margin: 8px 0;
  }
  .meta-bar {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #64748b;
    border-top: 1px solid #cbd5e1;
    padding-top: 8px;
    margin-top: 24px;
  }
  @media print {
    body { padding: 0; background: #fff; }
    .no-print { display: none !important; }
    .receipt { border: 2px solid #1e293b; }
  }
  .print-btn {
    position: fixed;
    top: 16px;
    right: 16px;
    background: #1e293b;
    color: #fff;
    border: none;
    padding: 10px 20px;
    font-size: 14px;
    cursor: pointer;
    border-radius: 4px;
    z-index: 100;
  }
  .print-btn:hover { background: #334155; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Cetak / Simpan PDF</button>
<div class="receipt">
  <div class="header">
    <div class="logo">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" />` : `<span class="logo-placeholder">LOGO</span>`}
    </div>
    <div class="header-text">
      <h1>${sekolahNama}</h1>
      ${sekolahAlamat ? `<p>${sekolahAlamat}</p>` : ""}
      ${sekolahTelepon || sekolahEmail ? `<p>Telp: ${sekolahTelepon}${sekolahEmail ? ` &middot; Email: ${sekolahEmail}` : ""}</p>` : ""}
    </div>
    <div style="width: 80px;"></div>
  </div>

  <div class="title-band">
    <h2>Kwitansi Pembayaran</h2>
  </div>

  <div style="text-align: center; margin-bottom: 12px;">
    <div style="font-size: 11px; color: #475569;">No. Kwitansi</div>
    <div style="font-weight: bold; font-size: 14px; letter-spacing: 1px;">${kodeKwitansi}</div>
    <div class="status-stamp">${isLunas ? "Lunas" : "Belum Lunas"}</div>
  </div>

  <div class="info-grid">
    <div class="row"><span class="label">Nama Siswa</span><span class="value">${siswaNama}</span></div>
    <div class="row"><span class="label">NIS/NISN</span><span class="value">${siswaNis}</span></div>
    <div class="row"><span class="label">Tanggal Bayar</span><span class="value">${fmtDateServer(tanggalBayar)} ${fmtTimeServer(tanggalBayar)}</span></div>
    <div class="row"><span class="label">Tahun Ajaran</span><span class="value">${tahunAjaran}</span></div>
    <div class="row"><span class="label">Petugas</span><span class="value">${pegawaiNama}</span></div>
    <div class="row"><span class="label">Metode</span><span class="value">${metode}</span></div>
  </div>

  <div class="table-section">
    <table class="items">
      <thead>
        <tr>
          <th style="width: 40%;">Jenis Pembayaran</th>
          <th style="width: 20%;">Bulan</th>
          <th style="width: 20%;" class="right">Nominal Tagihan</th>
          <th style="width: 20%;" class="right">Jumlah Bayar</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${jenisPembayaran}</td>
          <td>${bulanTagihan}</td>
          <td class="right">${fmtIDRServer(nominalTagihan)}</td>
          <td class="right">${fmtIDRServer(jumlahBayar)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3" style="text-align: right;">TOTAL DITERIMA</td>
          <td class="right">${fmtIDRServer(jumlahBayar)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="terbilang">
    <strong>Terbilang:</strong> ${terbilangStr}
  </div>

  ${keterangan ? `<div style="margin-top: 8px; font-size: 12px;"><strong>Keterangan:</strong> ${keterangan}</div>` : ""}

  <div class="footer">
    <div class="signature">
      <div class="place">Diterima oleh,</div>
      <div style="margin-bottom: 60px;">(____________________)</div>
      <div class="name">Siswa / Wali</div>
    </div>
    <div class="signature">
      <div class="place">${escapeHtml(new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }))}<br/>Petugas,</div>
      <div style="margin-bottom: 60px;">&nbsp;</div>
      <div class="name">${pegawaiNama}</div>
      <div style="font-size: 10px; color: #475569;">${pegawaiJabatan}</div>
    </div>
  </div>

  <div class="meta-bar">
    <span>Kepala Sekolah: ${kepalaSekolah || "-"}</span>
    <span>Dicetak: ${new Date().toLocaleString("id-ID")}</span>
  </div>
</div>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    console.error("GET kwitansi error:", e);
    return new Response("Gagal membuat kwitansi", { status: 500 });
  }
}
