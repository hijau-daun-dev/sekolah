"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DoorOpen, Plus, Pencil, Trash2, Loader2, SearchX } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface Kelas {
  id: number; nama: string; tingkatId: number; jurusanId?: number | null; tahunAjaranId: number;
  walikelasId?: number | null; ruangan?: string | null; kapasitas?: number | null; statusAktif: boolean;
  tingkat?: { id: number; nama: string; jenjang?: string | null };
  jurusan?: { id: number; kode: string; nama: string } | null;
  tahunAjaran?: { id: number; nama: string; statusAktif: boolean };
  walikelas?: { id: number; nama: string; jabatan?: string | null } | null;
  _count?: { kelasSiswas: number };
}
interface Opt { value: string; label: string }
interface SekolahOpt { id: number; nama: string }

export function KelasSection() {
  const [list, setList] = useState<Kelas[]>([]);
  const [sekolahList, setSekolahList] = useState<SekolahOpt[]>([]);
  const [sekolahId, setSekolahId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tingkatList, setTingkatList] = useState<Opt[]>([]);
  const [jurusanList, setJurusanList] = useState<Opt[]>([]);
  const [taList, setTaList] = useState<Opt[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Kelas> | null>(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Kelas | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sekolahId) params.set("sekolahId", sekolahId);
      if (statusFilter !== "all") params.set("statusAktif", statusFilter);
      const r = await fetch(`/api/kelas?${params.toString()}`);
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat kelas", variant: "destructive" });
    } finally { setLoading(false); }
  }, [sekolahId, statusFilter, toast]);

  useEffect(() => {
    fetch("/api/sekolah/list").then((r) => r.json()).then((d: SekolahOpt[]) => {
      if (Array.isArray(d)) {
        setSekolahList(d);
        if (d.length > 0 && !sekolahId) setSekolahId(String(d[0].id));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!sekolahId) return;
    const sid = Number(sekolahId);
    Promise.all([
      fetch(`/api/tingkat?sekolahId=${sid}`).then((r) => r.json()),
      fetch(`/api/jurusan?sekolahId=${sid}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/tahun-ajaran?sekolahId=${sid}`).then((r) => r.json()),
      fetch(`/api/pegawai?sekolahId=${sid}`).then((r) => r.json()),
    ]).then(([t, j, ta, pg]: [
      { id: number; nama: string; jenjang?: string | null }[],
      { id: number; kode: string; nama: string }[],
      { id: number; nama: string; statusAktif: boolean }[],
      { id: number; nama: string; jabatan?: string | null }[]
    ]) => {
      if (Array.isArray(t)) setTingkatList(t.map((x) => ({ value: String(x.id), label: `${x.nama}${x.jenjang ? ` (${x.jenjang})` : ""}` })));
      if (Array.isArray(j)) setJurusanList(j.map((x) => ({ value: String(x.id), label: `${x.kode} - ${x.nama}` })));
      if (Array.isArray(ta)) setTaList(ta.map((x) => ({ value: String(x.id), label: x.nama + (x.statusAktif ? " (Aktif)" : "") })));
      if (Array.isArray(pg)) setPegawaiList(pg.map((x) => ({ value: String(x.id), label: x.nama + (x.jabatan ? ` (${x.jabatan})` : "") })));
    }).catch(() => {});
  }, [sekolahId]);

  const filtered = useMemo(() => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((k) => k.nama.toLowerCase().includes(q) || (k.tingkat?.nama || "").toLowerCase().includes(q));
  }, [list, search]);

  const handleAdd = () => {
    const aktifTa = taList.find((t) => t.label.includes("Aktif")) || taList[0];
    setEditing({
      nama: "", tingkatId: undefined, jurusanId: null,
      tahunAjaranId: aktifTa ? Number(aktifTa.value) : undefined,
      walikelasId: null, ruangan: "", kapasitas: null, statusAktif: true,
    });
    setDialogOpen(true);
  };
  const handleEdit = (k: Kelas) => { setEditing({ ...k }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing?.nama?.trim()) { toast({ title: "Nama wajib", variant: "destructive" }); return; }
    if (!editing.tingkatId) { toast({ title: "Tingkat wajib", variant: "destructive" }); return; }
    if (!editing.tahunAjaranId) { toast({ title: "Tahun ajaran wajib", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nama: editing.nama,
        tingkatId: Number(editing.tingkatId),
        jurusanId: editing.jurusanId ? Number(editing.jurusanId) : null,
        tahunAjaranId: Number(editing.tahunAjaranId),
        walikelasId: editing.walikelasId ? Number(editing.walikelasId) : null,
        ruangan: editing.ruangan || null,
        kapasitas: editing.kapasitas ?? null,
        statusAktif: editing.statusAktif !== undefined ? !!editing.statusAktif : true,
      };
      if (sekolahId) payload.sekolahId = Number(sekolahId);
      const url = editing.id ? `/api/kelas/${editing.id}` : "/api/kelas";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "Kelas diperbarui" : "Kelas ditambahkan" });
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      const r = await fetch(`/api/kelas/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Kelas dinonaktifkan" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const update = (k: keyof Kelas, v: unknown) => setEditing((p) => p ? { ...p, [k]: v } : p);

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <DoorOpen className="h-4 w-4" /> Master Kelas
            </h3>
            <p className="text-xs text-slate-500">Kelas per tahun ajaran & tingkat</p>
          </div>
          <Button size="sm" onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {sekolahList.length > 0 && (
            <Select value={sekolahId} onValueChange={setSekolahId}>
              <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Sekolah" /></SelectTrigger>
              <SelectContent>
                {sekolahList.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="true">Aktif</SelectItem>
              <SelectItem value="false">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 max-w-sm">
            <Input placeholder="Cari kelas..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada kelas.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-10">No</th>
                  <th className="text-left px-3 py-2 font-medium">Nama</th>
                  <th className="text-left px-3 py-2 font-medium">Tingkat</th>
                  <th className="text-left px-3 py-2 font-medium">Jurusan</th>
                  <th className="text-left px-3 py-2 font-medium">TA</th>
                  <th className="text-left px-3 py-2 font-medium">Walikelas</th>
                  <th className="text-left px-3 py-2 font-medium">Ruangan</th>
                  <th className="text-left px-3 py-2 font-medium">Siswa</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((k, idx) => (
                  <tr key={k.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{k.nama}</td>
                    <td className="px-3 py-2">{k.tingkat?.nama || "-"}</td>
                    <td className="px-3 py-2">{k.jurusan?.nama || "-"}</td>
                    <td className="px-3 py-2">{k.tahunAjaran?.nama}{k.tahunAjaran?.statusAktif && <Badge className="ml-1 bg-emerald-100 text-emerald-700 text-[10px]">Aktif</Badge>}</td>
                    <td className="px-3 py-2">{k.walikelas?.nama || "-"}</td>
                    <td className="px-3 py-2 text-slate-600">{k.ruangan || "-"}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{k._count?.kelasSiswas ?? 0} siswa</Badge></td>
                    <td className="px-3 py-2">
                      {k.statusAktif
                        ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Aktif</Badge>
                        : <Badge className="bg-slate-200 text-slate-600 text-[10px]">Nonaktif</Badge>}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(k)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => setDelTarget(k)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Kelas" : "Tambah Kelas"}</DialogTitle>
            <DialogDescription>Kelas per tahun ajaran & tingkat</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              <div className="sm:col-span-2">
                <Label className="text-sm">Nama Kelas *</Label>
                <Input value={editing.nama || ""} onChange={(e) => update("nama", e.target.value)} placeholder="cth: 6A" />
              </div>
              <div>
                <Label className="text-sm">Tingkat *</Label>
                <Select value={editing.tingkatId ? String(editing.tingkatId) : "none"} onValueChange={(v) => update("tingkatId", v === "none" ? null : Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tingkat" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>— Pilih —</SelectItem>
                    {tingkatList.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Jurusan</Label>
                <Select value={editing.jurusanId ? String(editing.jurusanId) : "none"} onValueChange={(v) => update("jurusanId", v === "none" ? null : Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Tidak ada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {jurusanList.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Tahun Ajaran *</Label>
                <Select value={editing.tahunAjaranId ? String(editing.tahunAjaranId) : "none"} onValueChange={(v) => update("tahunAjaranId", v === "none" ? null : Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih TA" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>— Pilih —</SelectItem>
                    {taList.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Walikelas</Label>
                <Select value={editing.walikelasId ? String(editing.walikelasId) : "none"} onValueChange={(v) => update("walikelasId", v === "none" ? null : Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Tidak ada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {pegawaiList.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Ruangan</Label>
                <Input value={editing.ruangan || ""} onChange={(e) => update("ruangan", e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Kapasitas</Label>
                <Input type="number" value={String(editing.kapasitas ?? "")} onChange={(e) => update("kapasitas", e.target.value === "" ? null : Number(e.target.value))} />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <Switch
                  id="kelasStatusAktif" checked={!!editing.statusAktif}
                  onCheckedChange={(v) => update("statusAktif", v)}
                />
                <Label htmlFor="kelasStatusAktif" className="text-sm">Status Aktif</Label>
              </div>
            </div>
          )}
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
            <AlertDialogTitle>Nonaktifkan kelas?</AlertDialogTitle>
            <AlertDialogDescription>
              Kelas <b>{delTarget?.nama}</b> akan dinonaktifkan (soft delete).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Nonaktifkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default KelasSection;
