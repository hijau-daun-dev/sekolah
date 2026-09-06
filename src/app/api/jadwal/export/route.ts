import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

const HARI_ORDER = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

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
        kelas: { select: { id: true, nama: true, tingkat: { select: { nama: true } } } },
        mapel: { select: { id: true, nama: true, kode: true } },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
        tahunAjaran: { select: { id: true, nama: true } },
        ekstrakurikuler: { select: { id: true, nama: true } },
      },
    });

    // Group by kelas then hari
    const byKelas: Record<string, { kelas: string; tingkat: string; items: typeof jadwals }> = {};
    jadwals.forEach((j) => {
      const key = `${j.kelas?.tingkat?.nama || ""} ${j.kelas?.nama || ""}`.trim();
      if (!byKelas[key]) byKelas[key] = { kelas: j.kelas?.nama || "", tingkat: j.kelas?.tingkat?.nama || "", items: [] };
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
            csv(g.kelas),
            csv(g.tingkat),
            csv(j.hari),
            j.jamKe,
            csv(j.jamMulai || ""),
            csv(j.jamSelesai || ""),
            csv(j.tipeJadwal),
            csv(judul),
            csv(ekskul),
            csv(j.pegawai?.nama || ""),
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

    // PDF format: return simple HTML printable
    if (format === "pdf") {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Jadwal Pelajaran</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
          h1 { font-size: 18px; margin: 0 0 8px 0; }
          h2 { font-size: 14px; margin: 16px 0 6px 0; background:#f1f5f9; padding:4px 8px; border-radius:4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 4px 8px; text-align: left; }
          th { background: #f8fafc; font-weight: 600; }
        </style></head><body>
        <h1>Jadwal Pelajaran</h1>
        <p style="font-size:12px;color:#64748b;">Diunduh: ${new Date().toLocaleString("id-ID")}</p>
        ${Object.values(byKelas).map((g) => `
          <h2>Kelas ${g.kelas} (Tingkat ${g.tingkat})</h2>
          <table>
            <thead><tr><th>Hari</th><th>Jam</th><th>Jam Ke</th><th>Tipe</th><th>Mapel/Judul</th><th>Ekskul</th><th>Guru</th></tr></thead>
            <tbody>
              ${g.items.map((j) => `<tr>
                <td>${esc(j.hari)}</td>
                <td>${esc(j.jamMulai || "")}-${esc(j.jamSelesai || "")}</td>
                <td>${j.jamKe}</td>
                <td>${esc(j.tipeJadwal)}</td>
                <td>${esc(j.tipeJadwal === "pelajaran" ? (j.mapel?.nama || "") : j.tipeJadwal === "khusus" ? (j.judulKhusus || "") : "-")}</td>
                <td>${esc(j.tipeJadwal === "ekskul" ? (j.ekstrakurikuler?.nama || "") : "-")}</td>
                <td>${esc(j.pegawai?.nama || "-")}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        `).join("")}
        <script>window.onload = () => window.print();</script>
        </body></html>`;
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

function csv(s: string | number): string {
  const v = String(s ?? "");
  if (v.includes(",") || v.includes('"') || v.includes("\n")) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
function esc(s: string | number | null | undefined): string {
  return String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string));
}
