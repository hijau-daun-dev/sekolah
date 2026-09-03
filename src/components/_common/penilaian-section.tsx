"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileBarChart, Loader2, Save, SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface KelasOpt { id: number; nama: string; tingkat?: { nama: string } | null }
interface MapelOpt { id: number; nama: string; kode?: string | null }
interface KomponenOpt { id: number; nama: string; bobot: number }

interface NilaiRow {
  siswaId: number;
  siswaNama: string;
  nis?: string | null;
  nilai: string;
  keterangan?: string | null;
}

export function PenilaianSection() {
  const [kelasOpts, setKelasOpts] = useState<KelasOpt[]>([]);
  const [mapelOpts, setMapelOpts] = useState<MapelOpt[]>([]);
  const [komponenOpts, setKomponenOpts] = useState<KomponenOpt[]>([]);
  const [tahunAjaranId, setTahunAjaranId] = useState<number | null>(null);

  const [kelasId, setKelasId] = useState<string>("");
  const [mapelId, setMapelId] = useState<string>("");
  const [komponenId, setKomponenId] = useState<string>("");

  const [rows, setRows] = useState<NilaiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch("/api/kelas").then((r) => r.json()),
      fetch("/api/mapel").then((r) => r.json()),
      fetch("/api/komponen-nilai").then((r) => r.json()),
      fetch("/api/tahun-ajaran").then((r) => r.json()),
    ]).then(([k, m, kn, t]: [KelasOpt[], MapelOpt[], KomponenOpt[], { id: number; statusAktif: boolean }[]]) => {
      if (Array.isArray(k)) setKelasOpts(k);
      if (Array.isArray(m)) setMapelOpts(m);
      if (Array.isArray(kn)) setKomponenOpts(kn);
      if (Array.isArray(t)) {
        const aktif = t.find((x) => x.statusAktif);
        if (aktif) setTahunAjaranId(aktif.id);
      }
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!kelasId || !mapelId || !komponenId) return;
    setLoading(true);
    setRows([]);
    try {
      const [siswaRes, nilaiRes] = await Promise.all([
        fetch(`/api/kelas-siswa?kelasId=${kelasId}`).then((r) => r.json()),
        fetch(`/api/penilaian?kelasId=${kelasId}&mapelId=${mapelId}&komponenNilaiId=${komponenId}`).then((r) => r.json()),
      ]);
      const kelasSiswas = Array.isArray(siswaRes) ? siswaRes : [];
      const nilais = Array.isArray(nilaiRes) ? nilaiRes : [];
      const nilaiMap = new Map<number, { nilai: number; keterangan?: string | null }>(nilais.map((n: { siswaId: number; nilai: number; keterangan?: string | null }) => [n.siswaId, n]));

      const built: NilaiRow[] = kelasSiswas
        .map((ks: Record<string, unknown>) => {
          const siswaId = Number(ks.siswaId);
          const siswa = ks.siswa as { nama: string; nis?: string | null } | undefined;
          const ex = nilaiMap.get(siswaId);
          return {
            siswaId,
            siswaNama: siswa?.nama || "(tanpa nama)",
            nis: siswa?.nis || null,
            nilai: ex ? String(ex.nilai) : "",
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
  }, [kelasId, mapelId, komponenId, toast]);

  useEffect(() => { if (kelasId && mapelId && komponenId) load(); }, [load, kelasId, mapelId, komponenId]);

  const updateRow = (siswaId: number, patch: Partial<NilaiRow>) => {
    setRows((p) => p.map((r) => r.siswaId === siswaId ? { ...r, ...patch } : r));
  };

  const stats = useMemo(() => {
    const nums = rows.map((r) => Number(r.nilai)).filter((n) => !isNaN(n) && r.nilai !== "");
    if (nums.length === 0) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    return { count: nums.length, avg: sum / nums.length, min: Math.min(...nums), max: Math.max(...nums) };
  }, [rows]);

  const handleSave = async () => {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      const payload = rows
        .filter((r) => r.nilai !== "" && !isNaN(Number(r.nilai)))
        .map((r) => ({
          siswaId: r.siswaId,
          mapelId: Number(mapelId),
          komponenNilaiId: Number(komponenId),
          tahunAjaranId: tahunAjaranId,
          nilai: Number(r.nilai),
          keterangan: r.keterangan || null,
        }));
      if (payload.length === 0) {
        toast({ title: "Tidak ada nilai untuk disimpan", variant: "destructive" });
        setSaving(false);
        return;
      }
      const r = await fetch("/api/penilaian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: `Tersimpan ${d.saved} nilai` });
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
            <FileBarChart className="h-4 w-4" /> Input Penilaian Siswa
          </h3>
          <p className="text-xs text-slate-500">Pilih kelas + mapel + komponen nilai, isi nilai siswa, simpan</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">Kelas</Label>
            <Select value={kelasId} onValueChange={setKelasId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Kelas" /></SelectTrigger>
              <SelectContent>
                {kelasOpts.map((k) => <SelectItem key={k.id} value={String(k.id)}>{k.tingkat?.nama} {k.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Mapel</Label>
            <Select value={mapelId} onValueChange={setMapelId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Mapel" /></SelectTrigger>
              <SelectContent>
                {mapelOpts.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Komponen Nilai</Label>
            <Select value={komponenId} onValueChange={setKomponenId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Komponen" /></SelectTrigger>
              <SelectContent>
                {komponenOpts.map((k) => <SelectItem key={k.id} value={String(k.id)}>{k.nama} ({k.bobot}%)</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={handleSave} disabled={saving || rows.length === 0} className="w-full bg-slate-700 hover:bg-slate-800">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Simpan Semua
            </Button>
          </div>
        </div>

        {stats && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px]">Jumlah: {stats.count}</Badge>
            <Badge className="bg-slate-100 text-slate-700 text-[10px]">Rata-rata: {stats.avg.toFixed(1)}</Badge>
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Tertinggi: {stats.max}</Badge>
            <Badge className="bg-rose-100 text-rose-700 text-[10px]">Terendah: {stats.min}</Badge>
          </div>
        )}

        {(!kelasId || !mapelId || !komponenId) ? (
          <div className="text-center py-8 text-slate-500">
            <FileBarChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Pilih kelas, mapel, dan komponen nilai untuk memulai.</p>
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
                  <th className="text-left px-3 py-2 font-medium w-32">Nilai (0-100)</th>
                  <th className="text-left px-3 py-2 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.siswaId} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-xs text-slate-500">{r.nis || "-"}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{r.siswaNama}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number" min={0} max={100} step="0.1"
                        value={r.nilai}
                        onChange={(e) => updateRow(r.siswaId, { nilai: e.target.value })}
                        className="h-8 text-xs w-24"
                        placeholder="0"
                      />
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

export default PenilaianSection;
