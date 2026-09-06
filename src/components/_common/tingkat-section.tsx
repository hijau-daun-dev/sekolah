"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Plus, Pencil, Trash2, Loader2, Wand2, SearchX } from "lucide-react";
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

interface Tingkat {
  id: number; nama: string; jenjang?: string | null; urutan: number; statusAktif: boolean;
  _count?: { kelases: number; tingkatMapels: number; guruMapels: number };
}
interface SekolahOpt { id: number; nama: string; jenjang?: string | null }

const JENJANG_OPTS = [
  { value: "SD", label: "SD" },
  { value: "MI", label: "MI" },
  { value: "SMP", label: "SMP" },
  { value: "MTs", label: "MTs" },
  { value: "MA", label: "MA" },
  { value: "SD-SMP", label: "SD-SMP" },
  { value: "MI-MTs", label: "MI-MTs" },
];

function jenjangBadgeClass(jenjang?: string | null): string {
  const j = (jenjang || "").toUpperCase();
  if (j === "MI" || j === "MI-MTS") return "bg-emerald-100 text-emerald-700";
  if (j === "MTS") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

export function TingkatSection() {
  const [list, setList] = useState<Tingkat[]>([]);
  const [sekolahList, setSekolahList] = useState<SekolahOpt[]>([]);
  const [sekolahId, setSekolahId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Tingkat> | null>(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Tingkat | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [genJenjang, setGenJenjang] = useState<string>("SD");
  const [genLoading, setGenLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sekolahId) params.set("sekolahId", sekolahId);
      if (statusFilter !== "all") params.set("statusAktif", statusFilter);
      const r = await fetch(`/api/tingkat?${params.toString()}`);
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat tingkat", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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

  const filtered = useMemo(() => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((t) => t.nama.toLowerCase().includes(q) || (t.jenjang || "").toLowerCase().includes(q));
  }, [list, search]);

  const handleAdd = () => {
    setEditing({ nama: "", jenjang: "", urutan: list.length, statusAktif: true });
    setDialogOpen(true);
  };
  const handleEdit = (t: Tingkat) => { setEditing({ ...t }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing?.nama?.trim()) { toast({ title: "Nama wajib", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nama: editing.nama,
        jenjang: editing.jenjang || null,
        urutan: Number(editing.urutan ?? 0),
        statusAktif: editing.statusAktif !== undefined ? !!editing.statusAktif : true,
      };
      if (sekolahId) payload.sekolahId = Number(sekolahId);
      const url = editing.id ? `/api/tingkat/${editing.id}` : "/api/tingkat";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "Tingkat diperbarui" : "Tingkat ditambahkan" });
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
      const r = await fetch(`/api/tingkat/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Tingkat dinonaktifkan" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleAutoGenerate = async () => {
    setGenLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      if (sekolahId) payload.sekolahId = Number(sekolahId);
      payload.jenjang = genJenjang;
      const r = await fetch("/api/tingkat/auto-generate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal auto-generate");
      toast({
        title: "Auto-generate selesai",
        description: `Dibuat: ${d.created} • Sudah ada: ${d.skipped} • Total: ${d.total}`,
      });
      setGenOpen(false);
      await load();
    } catch (e) {
      toast({ title: "Gagal auto-generate", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setGenLoading(false); }
  };

  const update = (k: keyof Tingkat, v: unknown) => setEditing((p) => p ? { ...p, [k]: v } : p);

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="h-4 w-4" /> Master Tingkat
            </h3>
            <p className="text-xs text-slate-500">Tingkat kelas per jenjang (SD: 1-6, SMP: 7-9, dst.)</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setGenOpen(true)}>
              <Wand2 className="h-4 w-4 mr-1" /> Auto-Generate
            </Button>
            <Button size="sm" onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-1" /> Tambah
            </Button>
          </div>
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
            <Input placeholder="Cari tingkat..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada tingkat.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-10">No</th>
                  <th className="text-left px-3 py-2 font-medium">Nama</th>
                  <th className="text-left px-3 py-2 font-medium">Jenjang</th>
                  <th className="text-left px-3 py-2 font-medium">Urutan</th>
                  <th className="text-left px-3 py-2 font-medium">Jumlah Kelas</th>
                  <th className="text-left px-3 py-2 font-medium">Jumlah Mapel</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{t.nama}</td>
                    <td className="px-3 py-2">
                      {t.jenjang
                        ? <Badge className={`text-[10px] ${jenjangBadgeClass(t.jenjang)}`}>{t.jenjang}</Badge>
                        : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{t.urutan}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{t._count?.kelases ?? 0}</Badge></td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{t._count?.tingkatMapels ?? 0}</Badge></td>
                    <td className="px-3 py-2">
                      {t.statusAktif
                        ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Aktif</Badge>
                        : <Badge className="bg-slate-200 text-slate-600 text-[10px]">Nonaktif</Badge>}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => setDelTarget(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Tingkat" : "Tambah Tingkat"}</DialogTitle>
            <DialogDescription>Tingkat kelas (cth: 1, 2, ..., 9)</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              <div className="sm:col-span-2">
                <Label className="text-sm">Nama Tingkat *</Label>
                <Input value={editing.nama || ""} onChange={(e) => update("nama", e.target.value)} placeholder="cth: 1, 2, 7" />
              </div>
              <div>
                <Label className="text-sm">Jenjang</Label>
                <Select value={editing.jenjang || "none"} onValueChange={(v) => update("jenjang", v === "none" ? null : v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Tidak ada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {JENJANG_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Urutan</Label>
                <Input type="number" value={String(editing.urutan ?? "")} onChange={(e) => update("urutan", Number(e.target.value))} />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox" id="statusAktif" checked={!!editing.statusAktif}
                  onChange={(e) => update("statusAktif", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="statusAktif" className="text-sm">Status Aktif</Label>
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

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="h-4 w-4" /> Auto-Generate Tingkat</DialogTitle>
            <DialogDescription>Pilih jenjang untuk membuat tingkat otomatis (MI/MTs: 1-9, dst.)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Jenjang</Label>
              <Select value={genJenjang} onValueChange={setGenJenjang}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JENJANG_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              MI/SD: 6 tingkat (1-6). MTs/SMP: 3 tingkat (7-9). MA: 3 tingkat (10-12). MI-MTs: 9 tingkat (1-9).
              Tingkat yang sudah ada akan dilewati.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Batal</Button>
            <Button onClick={handleAutoGenerate} disabled={genLoading} className="bg-slate-700 hover:bg-slate-800">
              {genLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan tingkat?</AlertDialogTitle>
            <AlertDialogDescription>
              Tingkat <b>{delTarget?.nama}</b> akan dinonaktifkan (soft delete). Data terkait tidak ikut terhapus.
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

export default TingkatSection;
