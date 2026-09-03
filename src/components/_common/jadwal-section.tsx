"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, Pencil, Trash2, Loader2, SearchX, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface KelasOpt { id: number; nama: string; tingkat?: { nama: string } | null }
interface MapelOpt { id: number; nama: string; kode?: string | null }
interface PegawaiOpt { id: number; nama: string; jabatan?: string | null }
interface TahunOpt { id: number; nama: string; statusAktif: boolean }

interface Jadwal {
  id: number;
  kelasId: number;
  mapelId: number;
  pegawaiId: number;
  tahunAjaranId: number;
  hari: string;
  jamKe: number;
  jamMulai?: string | null;
  jamSelesai?: string | null;
  kelas?: KelasOpt | null;
  mapel?: MapelOpt | null;
  pegawai?: PegawaiOpt | null;
  tahunAjaran?: TahunOpt | null;
}

const HARI_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export function JadwalSection() {
  return <JadwalTab />;
}

function JadwalTab() {
  const [list, setList] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKelas, setFilterKelas] = useState<string>("all");
  const [filterHari, setFilterHari] = useState<string>("all");
  const [kelasOpts, setKelasOpts] = useState<KelasOpt[]>([]);
  const [mapelOpts, setMapelOpts] = useState<MapelOpt[]>([]);
  const [pegawaiOpts, setPegawaiOpts] = useState<PegawaiOpt[]>([]);
  const [tahunOpts, setTahunOpts] = useState<TahunOpt[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Jadwal>>({});
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Jadwal | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch("/api/kelas").then((r) => r.json()),
      fetch("/api/mapel").then((r) => r.json()),
      fetch("/api/pegawai").then((r) => r.json()),
      fetch("/api/tahun-ajaran").then((r) => r.json()),
    ]).then(([k, m, p, t]: [KelasOpt[], MapelOpt[], PegawaiOpt[], TahunOpt[]]) => {
      if (Array.isArray(k)) setKelasOpts(k);
      if (Array.isArray(m)) setMapelOpts(m);
      if (Array.isArray(p)) setPegawaiOpts(p);
      if (Array.isArray(t)) setTahunOpts(t);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterKelas !== "all") params.set("kelasId", filterKelas);
      if (filterHari !== "all") params.set("hari", filterHari);
      const r = await fetch(`/api/jadwal?${params.toString()}`);
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat jadwal", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filterKelas, filterHari, toast]);

  useEffect(() => { load(); }, [load]);

  // Group by hari for display
  const grouped = useMemo(() => {
    const g: Record<string, Jadwal[]> = {};
    HARI_LIST.forEach((h) => g[h] = []);
    list.forEach((j) => {
      if (!g[j.hari]) g[j.hari] = [];
      g[j.hari].push(j);
    });
    Object.values(g).forEach((arr) => arr.sort((a, b) => a.jamKe - b.jamKe));
    return g;
  }, [list]);

  // Per kelas summary card
  const perKelasCount = useMemo(() => {
    const c: Record<number, number> = {};
    list.forEach((j) => { c[j.kelasId] = (c[j.kelasId] || 0) + 1; });
    return c;
  }, [list]);

  const handleAdd = () => {
    const activeTahun = tahunOpts.find((t) => t.statusAktif) || tahunOpts[0];
    setEditing({
      hari: "Senin", jamKe: 1, jamMulai: "07:00", jamSelesai: "07:40",
      tahunAjaranId: activeTahun?.id,
    });
    setDialogOpen(true);
  };
  const handleEdit = (j: Jadwal) => {
    setEditing({ ...j });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing.kelasId || !editing.mapelId || !editing.pegawaiId || !editing.tahunAjaranId || !editing.hari || editing.jamKe == null) {
      toast({ title: "Lengkapi semua field wajib", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kelasId: Number(editing.kelasId),
        mapelId: Number(editing.mapelId),
        pegawaiId: Number(editing.pegawaiId),
        tahunAjaranId: Number(editing.tahunAjaranId),
        hari: editing.hari,
        jamKe: Number(editing.jamKe),
        jamMulai: editing.jamMulai || null,
        jamSelesai: editing.jamSelesai || null,
      };
      const url = editing.id ? `/api/jadwal/${editing.id}` : "/api/jadwal";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "Jadwal diperbarui" : "Jadwal ditambahkan" });
      setDialogOpen(false);
      setEditing({});
      await load();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      const r = await fetch(`/api/jadwal/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Jadwal dihapus" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Jadwal Pelajaran
            </h3>
            <p className="text-xs text-slate-500">Jadwal guru per kelas per hari</p>
          </div>
          <Button size="sm" onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={filterKelas} onValueChange={setFilterKelas}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {kelasOpts.map((k) => (
                <SelectItem key={k.id} value={String(k.id)}>{k.tingkat?.nama || ""} {k.nama}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterHari} onValueChange={setFilterHari}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Semua Hari" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Hari</SelectItem>
              {HARI_LIST.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filterKelas === "all" && list.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {kelasOpts.map((k) => (
              <div key={k.id} className="border border-slate-200 rounded-md p-2 text-xs">
                <div className="font-medium text-slate-700 truncate">{k.tingkat?.nama} {k.nama}</div>
                <div className="text-slate-500">{perKelasCount[k.id] || 0} jadwal</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada jadwal.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {HARI_LIST.filter((h) => (grouped[h] || []).length > 0).map((h) => (
              <div key={h} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                  <span className="text-sm font-semibold text-slate-700">{h}</span>
                  <span className="text-xs text-slate-500 ml-2">({(grouped[h] || []).length} jadwal)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-slate-600 text-xs">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Jam Ke</th>
                        <th className="text-left px-3 py-2 font-medium">Waktu</th>
                        <th className="text-left px-3 py-2 font-medium">Kelas</th>
                        <th className="text-left px-3 py-2 font-medium">Mapel</th>
                        <th className="text-left px-3 py-2 font-medium">Guru</th>
                        <th className="text-right px-3 py-2 font-medium w-20">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(grouped[h] || []).map((j) => (
                        <tr key={j.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">Ke-{j.jamKe}</Badge></td>
                          <td className="px-3 py-2 text-xs text-slate-600">{j.jamMulai || "-"} - {j.jamSelesai || "-"}</td>
                          <td className="px-3 py-2"><span className="font-medium text-slate-800">{j.kelas?.tingkat?.nama} {j.kelas?.nama}</span></td>
                          <td className="px-3 py-2">{j.mapel?.nama}</td>
                          <td className="px-3 py-2 text-slate-600">{j.pegawai?.nama}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(j)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => setDelTarget(j)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing({}); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
            <DialogDescription>Pilih kelas, mapel, guru, hari, dan jam pelajaran</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-sm">Kelas *</Label>
              <Select value={String(editing.kelasId ?? "")} onValueChange={(v) => setEditing((p) => ({ ...p, kelasId: Number(v) }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                <SelectContent>
                  {kelasOpts.map((k) => <SelectItem key={k.id} value={String(k.id)}>{k.tingkat?.nama} {k.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Mapel *</Label>
              <Select value={String(editing.mapelId ?? "")} onValueChange={(v) => setEditing((p) => ({ ...p, mapelId: Number(v) }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                <SelectContent>
                  {mapelOpts.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Guru *</Label>
              <Select value={String(editing.pegawaiId ?? "")} onValueChange={(v) => setEditing((p) => ({ ...p, pegawaiId: Number(v) }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih guru" /></SelectTrigger>
                <SelectContent>
                  {pegawaiOpts.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nama}{p.jabatan ? ` (${p.jabatan})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Tahun Ajaran *</Label>
              <Select value={String(editing.tahunAjaranId ?? "")} onValueChange={(v) => setEditing((p) => ({ ...p, tahunAjaranId: Number(v) }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
                <SelectContent>
                  {tahunOpts.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nama}{t.statusAktif ? " (Aktif)" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Hari *</Label>
              <Select value={String(editing.hari ?? "")} onValueChange={(v) => setEditing((p) => ({ ...p, hari: v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih hari" /></SelectTrigger>
                <SelectContent>
                  {HARI_LIST.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Jam Ke *</Label>
              <Input type="number" min={1} max={20} value={String(editing.jamKe ?? "")} onChange={(e) => setEditing((p) => ({ ...p, jamKe: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-sm">Jam Mulai</Label>
              <Input type="time" value={String(editing.jamMulai ?? "")} onChange={(e) => setEditing((p) => ({ ...p, jamMulai: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Jam Selesai</Label>
              <Input type="time" value={String(editing.jamSelesai ?? "")} onChange={(e) => setEditing((p) => ({ ...p, jamSelesai: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-slate-700 hover:bg-slate-800">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus jadwal?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin menghapus jadwal {delTarget?.mapel?.nama} ({delTarget?.hari})? Tindakan tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel><X className="hidden" />Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default JadwalSection;
