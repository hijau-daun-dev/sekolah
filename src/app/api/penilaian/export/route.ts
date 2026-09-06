import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";
import { getAllowedSiswaIds, getCurrentSekolahId } from "@/lib/auth-helpers";

/**
 * GET /api/penilaian/export?format=pdf|csv&kelasId=X or ?siswaId=X&semesterId=Y
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sekolahId = await getCurrentSekolahId().catch(() => null);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) {
      return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    }

    const allowedSiswaIds = await getAllowedSiswaIds().catch(() => null);

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "csv").toLowerCase();
    const kelasId = searchParams.get("kelasId");
    const siswaId = searchParams.get("siswaId");
    const semesterId = searchParams.get("semesterId");
    const sekolah = sekolahId ? await db.sekolah.findUnique({ where: { id: sekolahId }, select: { nama: true, alamat: true } }) : null;
    const semester = semesterId ? await db.semester.findUnique({ where: { id: Number(semesterId) }, select: { nama: true, tahunAjaran: { select: { nama: true } } } }) : null;

    type RekapItem = { siswaId: number; nama: string; nis?: string | null; nilaiPerMapel: { mapelNama: string; mapelKode?: string | null; nilaiAkhir: number | null }[]; rataRata: number | null };

    let title = "Rekap Nilai";
    let kelasNama = "";
    let siswaNama = "";

    if (kelasId) {
      // Per-kelas rekap
      const kelas = await db.kelas.findFirst({
        where: { id: Number(kelasId), ...(sekolahId ? { sekolahId } : {}) },
        select: { id: true, nama: true, tingkatId: true, tingkat: { select: { nama: true } }, tahunAjaran: { select: { nama: true } } },
      });
      if (!kelas) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
      kelasNama = `Kelas ${kelas.nama} (Tingkat ${kelas.tingkat?.nama || ""})`;
      title = `Rekap Nilai - ${kelasNama}`;

      const kelasSiswas = await db.kelasSiswa.findMany({
        where: { kelasId: kelas.id },
        include: { siswa: { select: { id: true, nama: true, nis: true } } },
        orderBy: { siswa: { nama: "asc" } },
      });
      let siswaList = kelasSiswas.map((ks) => ks.siswa);
      if (allowedSiswaIds && allowedSiswaIds.length >= 0) {
        siswaList = siswaList.filter((s) => allowedSiswaIds.includes(s.id));
      }

      const tingkatMapels = await db.tingkatMapel.findMany({
        where: { tingkatId: kelas.tingkatId, statusAktif: true },
        include: { mapel: { select: { id: true, nama: true, kode: true } } },
        orderBy: { mapel: { nama: "asc" } },
      });
      const komponenList = await db.komponenNilai.findMany({
        where: sekolahId ? { sekolahId } : {},
        orderBy: [{ bobot: "desc" }, { nama: "asc" }],
      });

      const penilaians = await db.penilaian.findMany({
        where: { siswaId: { in: siswaList.map((s) => s.id) }, ...(semesterId ? { semesterId: Number(semesterId) } : {}) },
      });
      const grouped: Record<string, Record<number, Record<number, number>>> = {};
      penilaians.forEach((p) => {
        if (!grouped[p.siswaId]) grouped[p.siswaId] = {};
        if (!grouped[p.siswaId][p.mapelId]) grouped[p.siswaId][p.mapelId] = {};
        grouped[p.siswaId][p.mapelId][p.komponenNilaiId] = p.nilai;
      });

      const siswaRekap: RekapItem[] = siswaList.map((s) => {
        const siswaData = grouped[s.id] || {};
        const nilaiPerMapel = tingkatMapels.map((tm) => {
          const mapelData = siswaData[tm.mapelId] || {};
          const komponen = komponenList.map((k) => ({
            komponenNilaiId: k.id,
            bobot: k.bobot,
            nilai: mapelData[k.id] != null ? mapelData[k.id] : null,
          }));
          const totalBobot = komponen.reduce((acc, c) => acc + (c.nilai != null ? c.bobot : 0), 0);
          const weighted = komponen.reduce((acc, c) => acc + (c.nilai != null ? c.nilai * c.bobot : 0), 0);
          const nilaiAkhir = totalBobot > 0 ? weighted / totalBobot : null;
          return { mapelNama: tm.mapel.nama, mapelKode: tm.mapel.kode, nilaiAkhir: nilaiAkhir != null ? Math.round(nilaiAkhir * 100) / 100 : null };
        });
        const validNilai = nilaiPerMapel.filter((n) => n.nilaiAkhir != null).map((n) => n.nilaiAkhir as number);
        const rataRata = validNilai.length > 0 ? Math.round((validNilai.reduce((a, b) => a + b, 0) / validNilai.length) * 100) / 100 : null;
        return { siswaId: s.id, nama: s.nama, nis: s.nis, nilaiPerMapel, rataRata };
      });

      return buildResponse(format, title, siswaRekap, sekolah?.nama || "", semester ? `${semester.tahunAjaran.nama} - ${semester.nama}` : "Semua Semester");
    }

    if (siswaId) {
      // Per-siswa rekap
      const siswa = await db.siswa.findFirst({
        where: { id: Number(siswaId), ...(sekolahId ? { sekolahId } : {}) },
        select: { id: true, nama: true, nis: true, kelasSiswas: { include: { kelas: { select: { id: true, nama: true, tingkatId: true, tingkat: { select: { nama: true } } } } } } },
      });
      if (!siswa) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
      if (allowedSiswaIds && allowedSiswaIds.length >= 0 && !allowedSiswaIds.includes(siswa.id)) {
        return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
      }
      siswaNama = siswa.nama;
      title = `Rekap Nilai - ${siswaNama}`;
      const kelasAktif = siswa.kelasSiswas[siswa.kelasSiswas.length - 1]?.kelas;
      if (!kelasAktif) {
        return buildResponse(format, title, [{ siswaId: siswa.id, nama: siswa.nama, nis: siswa.nis, nilaiPerMapel: [], rataRata: null }], sekolah?.nama || "", semester ? `${semester.tahunAjaran.nama} - ${semester.nama}` : "Semua Semester");
      }

      const tingkatMapels = await db.tingkatMapel.findMany({
        where: { tingkatId: kelasAktif.tingkatId, statusAktif: true },
        include: { mapel: { select: { id: true, nama: true, kode: true } } },
        orderBy: { mapel: { nama: "asc" } },
      });
      const komponenList = await db.komponenNilai.findMany({
        where: sekolahId ? { sekolahId } : {},
        orderBy: [{ bobot: "desc" }, { nama: "asc" }],
      });

      const penilaians = await db.penilaian.findMany({
        where: { siswaId: siswa.id, ...(semesterId ? { semesterId: Number(semesterId) } : {}) },
      });
      const grouped: Record<number, Record<number, number>> = {};
      penilaians.forEach((p) => {
        if (!grouped[p.mapelId]) grouped[p.mapelId] = {};
        grouped[p.mapelId][p.komponenNilaiId] = p.nilai;
      });

      const nilaiPerMapel = tingkatMapels.map((tm) => {
        const mapelData = grouped[tm.mapelId] || {};
        const komponen = komponenList.map((k) => ({ komponenNilaiId: k.id, bobot: k.bobot, nilai: mapelData[k.id] != null ? mapelData[k.id] : null }));
        const totalBobot = komponen.reduce((acc, c) => acc + (c.nilai != null ? c.bobot : 0), 0);
        const weighted = komponen.reduce((acc, c) => acc + (c.nilai != null ? c.nilai * c.bobot : 0), 0);
        const nilaiAkhir = totalBobot > 0 ? weighted / totalBobot : null;
        return { mapelNama: tm.mapel.nama, mapelKode: tm.mapel.kode, nilaiAkhir: nilaiAkhir != null ? Math.round(nilaiAkhir * 100) / 100 : null };
      });
      const validNilai = nilaiPerMapel.filter((n) => n.nilaiAkhir != null).map((n) => n.nilaiAkhir as number);
      const rataRata = validNilai.length > 0 ? Math.round((validNilai.reduce((a, b) => a + b, 0) / validNilai.length) * 100) / 100 : null;

      return buildResponse(format, title, [{ siswaId: siswa.id, nama: siswa.nama, nis: siswa.nis, nilaiPerMapel, rataRata }], sekolah?.nama || "", semester ? `${semester.tahunAjaran.nama} - ${semester.nama}` : "Semua Semester");
    }

    return NextResponse.json({ error: "kelasId atau siswaId wajib" }, { status: 400 });
  } catch (e) {
    console.error("GET penilaian/export error:", e);
    return NextResponse.json({ error: "Gagal export" }, { status: 500 });
  }
}

function buildResponse(format: string, title: string, items: RekapItem[], sekolahNama: string, periode: string) {
  if (format === "csv") {
    // Collect all mapels across items
    const mapelSet: { nama: string; kode?: string | null }[] = [];
    items.forEach((it) => it.nilaiPerMapel.forEach((n) => {
      if (!mapelSet.some((m) => m.nama === n.mapelNama)) mapelSet.push({ nama: n.mapelNama, kode: n.mapelKode });
    }));
    const rows: string[] = [];
    rows.push([csv("NIS"), csv("Nama Siswa"), ...mapelSet.map((m) => csv(m.nama)), csv("Rata-rata")].join(","));
    items.forEach((it) => {
      const row = [
        csv(it.nis || ""),
        csv(it.nama),
        ...mapelSet.map((m) => {
          const v = it.nilaiPerMapel.find((n) => n.mapelNama === m.nama);
          return v?.nilaiAkhir != null ? String(v.nilaiAkhir) : "";
        }),
        it.rataRata != null ? String(it.rataRata) : "",
      ];
      rows.push(row.join(","));
    });
    return new NextResponse(rows.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rekap-nilai.csv"`,
      },
    });
  }
  if (format === "pdf") {
    const mapelSet: { nama: string; kode?: string | null }[] = [];
    items.forEach((it) => it.nilaiPerMapel.forEach((n) => {
      if (!mapelSet.some((m) => m.nama === n.mapelNama)) mapelSet.push({ nama: n.mapelNama, kode: n.mapelKode });
    }));
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
        h1 { font-size: 18px; margin: 0 0 4px 0; }
        .meta { font-size: 12px; color: #64748b; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; }
        th { background: #f1f5f9; font-weight: 600; }
        td.nama { text-align: left; }
      </style></head><body>
      <h1>${esc(title)}</h1>
      <div class="meta">${esc(sekolahNama)} • ${esc(periode)} • Diunduh: ${new Date().toLocaleString("id-ID")}</div>
      <table>
        <thead><tr><th>NIS</th><th>Nama Siswa</th>${mapelSet.map((m) => `<th>${esc(m.nama)}</th>`).join("")}<th>Rata-rata</th></tr></thead>
        <tbody>
          ${items.map((it) => `<tr>
            <td>${esc(it.nis || "")}</td>
            <td class="nama">${esc(it.nama)}</td>
            ${mapelSet.map((m) => {
              const v = it.nilaiPerMapel.find((n) => n.mapelNama === m.nama);
              return `<td>${v?.nilaiAkhir != null ? v.nilaiAkhir : "-"}</td>`;
            }).join("")}
            <td>${it.rataRata != null ? it.rataRata : "-"}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <script>window.onload = () => window.print();</script>
      </body></html>`;
    return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  return NextResponse.json({ error: "Format tidak didukung" }, { status: 400 });
}

interface RekapItem { siswaId: number; nama: string; nis?: string | null; nilaiPerMapel: { mapelNama: string; mapelKode?: string | null; nilaiAkhir: number | null }[]; rataRata: number | null; }

function csv(s: string | number): string {
  const v = String(s ?? "");
  if (v.includes(",") || v.includes('"') || v.includes("\n")) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
function esc(s: string | number | null | undefined): string {
  return String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string));
}
