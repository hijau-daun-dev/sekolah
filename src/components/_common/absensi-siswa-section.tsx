"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Loader2, Save, SearchX, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { toDateISO } from "./_format";
import { useSekolahFilter, JenjangSekolahFilterDropdowns } from "@/lib/use-sekolah-filter";

interface KelasOpt { id: number; nama: string; tingkat?: { nama: string } | null }
interface SiswaOpt {
  id: number; nama: string; nis?: string | null;
  kelasSiswas?: { kelasId: number }[];
}
interface AbsensiRow {
  id?: number;
  siswaId: number;
  siswaNama: string;
  nis?: string | null;
  status: "Hadir" | "Sakit" | "Izin" | "Alpa";
  keterangan?: string | null;
}

const STATUS_LIST = ["Hadir", "Sakit", "Izin", "Alpa"] as const;
const STATUS_COLOR: Record<string, string> = {
  Hadir: "bg-emerald-100 text-emerald-700",
  Sakit: "bg-amber-100 text-amber-700",
  Izin: "bg-sky-100 text-sky-700",
  Alpa: "bg-rose-100 text-rose-700",
};

export function AbsensiSiswaSection() {
  const sekolahFilter = useSekolahFilter();
  const [kelasOpts, setKelasOpts] = useState<KelasOpt[]>([]);
  const [kelasId, setKelasId] = useState<string>("");
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState<AbsensiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Reload kelas options when sekolah changes
  useEffect(() => {
    if (!sekolahFilter.userRole) return;
    fetch(`/api/kelas${sekolahFilter.sekolahQuery}`)
      .then((r) => r.json())
      .then((d: KelasOpt[]) => { if (Array.isArray(d)) setKelasOpts(d); })
      .catch(() => {});
    // Reset kelasId when sekolah changes
    setKelasId("");
  }, [sekolahFilter.userRole, sekolahFilter.sekolahQuery]);

  const load = useCallback(async () => {
    if (!kelasId || !tanggal) return;
    setLoading(true);
    setRows([]);
    try {
      // 1. Load all siswa of this kelas via kelas-siswa endpoint
      const [siswaRes, absensiRes] = await Promise.all([
        fetch(`/api/kelas-siswa?kelasId=${kelasId}`).then((r) => r.json()),
        fetch(`/api/absensi-siswa?kelasId=${kelasId}&tanggal=${tanggal}${sekolahFilter.effectiveSekolahId ? `&sekolahId=${sekolahFilter.effectiveSekolahId}` : ""}`).then((r) => r.json()),
      ]);
      const kelasSiswas: Array<{ siswaId: number; siswa?: SiswaOpt } | SiswaOpt & { siswaId?: number }> = Array.isArray(siswaRes) ? siswaRes : [];
      const absensi: Array<{ siswaId: number; status: string; keterangan?: string | null; id: number }> = Array.isArray(absensiRes) ? absensiRes : [];
      const absMap = new Map(absensi.map((a) => [a.siswaId, a]));

      const built: AbsensiRow[] = kelasSiswas
        .map((ks) => {
          // kelas-siswa endpoint returns { id, kelasId, siswaId, siswa: {...} }
          const ksAny = ks as Record<string, unknown>;
          const siswaId = Number(ksAny.siswaId);
          const siswa = ksAny.siswa as SiswaOpt | undefined;
          const ex = absMap.get(siswaId);
          return {
            id: ex?.id,
            siswaId,
            siswaNama: siswa?.nama || "(tanpa nama)",
            nis: siswa?.nis || null,
            status: (ex?.status as AbsensiRow["status"]) || "Hadir",
            keterangan: ex?.keterangan || "",
          };
        })
        .sort((a, b) => a.siswaNama.localeCompare(b.siswaNama));
      setRows(built);
    } catch {
      toast({ title: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [kelasId, tanggal, toast]);

  useEffect(() => { if (kelasId && tanggal) load(); }, [load, kelasId, tanggal]);

  const updateRow = (siswaId: number, patch: Partial<AbsensiRow>) => {
    setRows((p) => p.map((r) => r.siswaId === siswaId ? { ...r, ...patch } : r));
  };

  const summary = useMemo(() => {
    const c: Record<string, number> = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
    rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  const handleSave = async () => {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        siswaId: r.siswaId,
        kelasId: Number(kelasId),
        tanggal: toDateISO(tanggal),
        status: r.status,
        keterangan: r.keterangan || null,
      }));
      const r = await fetch("/api/absensi-siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: `Tersimpan ${d.saved} absensi` });
      await load();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Absensi Siswa Harian
          </h3>
          <p className="text-xs text-slate-500">Pilih kelas & tanggal, isi kehadiran, lalu simpan</p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <SearchX className="h-3.5 w-3.5" />
            <span className="font-medium">Filter Absensi:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap items-end">
            {sekolahFilter.isSuperAdmin && (
              <JenjangSekolahFilterDropdowns
                isSuperAdmin={sekolahFilter.isSuperAdmin}
                jenjangOpts={sekolahFilter.jenjangOpts}
                filterJenjang={sekolahFilter.filterJenjang}
                setFilterJenjang={sekolahFilter.setFilterJenjang}
                sekolahOpts={sekolahFilter.sekolahOpts}
                filterSekolah={sekolahFilter.filterSekolah}
                setFilterSekolah={sekolahFilter.setFilterSekolah}
                classNameJenjang="w-full sm:w-40"
                classNameSekolah="w-full sm:w-56"
              />
            )}
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Kelas</Label>
              <Select value={kelasId} onValueChange={setKelasId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                <SelectContent>
                  {kelasOpts.map((k) => <SelectItem key={k.id} value={String(k.id)}>{k.tingkat?.nama} {k.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Tanggal</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <Button size="sm" onClick={handleSave} disabled={saving || rows.length === 0} className="bg-slate-700 hover:bg-slate-800">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Simpan Semua
            </Button>
          </div>
          {sekolahFilter.isSuperAdmin && sekolahFilter.filterSekolah !== "all" && (
            <div className="text-xs text-slate-500">
              Menampilkan absensi untuk sekolah: <span className="font-semibold text-slate-700">
                {sekolahFilter.sekolahOpts.find((s) => String(s.id) === sekolahFilter.filterSekolah)?.nama || sekolahFilter.filterSekolah}
              </span>
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {STATUS_LIST.map((s) => (
              <Badge key={s} className={`${STATUS_COLOR[s]} text-[10px]`}>
                {s}: {summary[s] || 0}
              </Badge>
            ))}
            <Badge variant="outline" className="text-[10px]">Total: {rows.length}</Badge>
          </div>
        )}

        {!kelasId ? (
          <div className="text-center py-8 text-slate-500">
            <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Pilih kelas untuk memulai.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Tidak ada siswa di kelas ini.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">NIS</th>
                  <th className="text-left px-3 py-2 font-medium">Nama Siswa</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.siswaId} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-xs text-slate-500">{r.nis || "-"}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{r.siswaNama}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {STATUS_LIST.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => updateRow(r.siswaId, { status: s })}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${r.status === s ? STATUS_COLOR[s] + " border-current" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={r.keterangan || ""}
                        onChange={(e) => updateRow(r.siswaId, { keterangan: e.target.value })}
                        placeholder="Keterangan..."
                        className="h-8 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AbsensiSiswaSection;
