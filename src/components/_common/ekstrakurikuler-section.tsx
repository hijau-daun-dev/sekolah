"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trophy, Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight, X, UserPlus, SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface Ekstrakurikuler {
  id: number; nama: string; deskripsi?: string | null;
  pembinaId?: number | null; pembina?: { id: number; nama: string; jabatan?: string | null } | null;
  hari?: string | null; jamMulai?: string | null; jamSelesai?: string | null; tempat?: string | null;
  statusAktif: boolean;
  _count?: { pesertas: number; jadwals: number };
  pesertas?: { id: number; siswaId: number; status: string; siswa: { id: number; nama: string; nis?: string | null; status?: string | null } }[];
}
interface SekolahOpt { id: number; nama: string }
interface PegawaiOpt { id: number; nama: string; jabatan?: string | null }
interface SiswaOpt { id: number; nama: string; nis?: string | null; status?: string | null }

const HARI_OPTS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export function EkstrakurikulerSection() {
  const [list, setList] = useState<Ekstrakurikuler[]>([]);
  const [sekolahList, setSekolahList] = useState<SekolahOpt[]>([]);
  const [sekolahId, setSekolahId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pegawaiList, setPegawaiList] = useState<PegawaiOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Ekstrakurikuler> | null>(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Ekstrakurikuler | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sekolahId) params.set("sekolahId", sekolahId);
      if (statusFilter !== "all") params.set("statusAktif", statusFilter);
      const r = await fetch(`/api/ekstrakurikuler?${params.toString()}`);
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat ekstrakurikuler", variant: "destructive" });
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
    fetch(`/api/pegawai?sekolahId=${sekolahId}`).then((r) => r.json()).then((d: PegawaiOpt[]) => {
      if (Array.isArray(d)) setPegawaiList(d);
    }).catch(() => {});
  }, [sekolahId]);

  const filtered = useMemo(() => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((e) => e.nama.toLowerCase().includes(q) || (e.deskripsi || "").toLowerCase().includes(q));
  }, [list, search]);

  const toggleExpand = (id: number) => {
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleAdd = () => {
    setEditing({ nama: "", deskripsi: "", pembinaId: null, hari: "", jamMulai: "", jamSelesai: "", tempat: "", statusAktif: true });
    setDialogOpen(true);
  };
  const handleEdit = (e: Ekstrakurikuler) => { setEditing({ ...e }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing?.nama?.trim()) { toast({ title: "Nama wajib", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nama: editing.nama,
        deskripsi: editing.deskripsi || null,
        pembinaId: editing.pembinaId ? Number(editing.pembinaId) : null,
        hari: editing.hari || null,
        jamMulai: editing.jamMulai || null,
        jamSelesai: editing.jamSelesai || null,
        tempat: editing.tempat || null,
        statusAktif: editing.statusAktif !== undefined ? !!editing.statusAktif : true,
      };
      if (sekolahId) payload.sekolahId = Number(sekolahId);
      const url = editing.id ? `/api/ekstrakurikuler/${editing.id}` : "/api/ekstrakurikuler";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "Ekstrakurikuler diperbarui" : "Ekstrakurikuler ditambahkan" });
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
      const r = await fetch(`/api/ekstrakurikuler/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Ekstrakurikuler dinonaktifkan" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const update = (k: keyof Ekstrakurikuler, v: unknown) => setEditing((p) => p ? { ...p, [k]: v } : p);

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Ekstrakurikuler
            </h3>
            <p className="text-xs text-slate-500">Daftar ekskul & peserta</p>
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
            <Input placeholder="Cari ekskul..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada ekstrakurikuler.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-8"></th>
                  <th className="text-left px-3 py-2 font-medium w-10">No</th>
                  <th className="text-left px-3 py-2 font-medium">Nama</th>
                  <th className="text-left px-3 py-2 font-medium">Pembina</th>
                  <th className="text-left px-3 py-2 font-medium">Hari/Jam</th>
                  <th className="text-left px-3 py-2 font-medium">Tempat</th>
                  <th className="text-left px-3 py-2 font-medium">Peserta</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((e, idx) => (
                  <>
                    <tr key={`r-${e.id}`} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2">
                        <button onClick={() => toggleExpand(e.id)} className="text-slate-500 hover:text-slate-700">
                          {expanded.has(e.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{e.nama}</td>
                      <td className="px-3 py-2">{e.pembina?.nama || "-"}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {e.hari ? <span>{e.hari}</span> : null}
                        {e.jamMulai && e.jamSelesai ? <span> {e.jamMulai}-{e.jamSelesai}</span> : null}
                        {!e.hari && !e.jamMulai && "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{e.tempat || "-"}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{e._count?.pesertas ?? 0} siswa</Badge></td>
                      <td className="px-3 py-2">
                        {e.statusAktif
                          ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Aktif</Badge>
                          : <Badge className="bg-slate-200 text-slate-600 text-[10px]">Nonaktif</Badge>}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => setDelTarget(e)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </td>
                    </tr>
                    {expanded.has(e.id) && (
                      <tr key={`expand-${e.id}`}>
                        <td colSpan={9} className="px-3 py-3 bg-slate-50/40 border-t border-slate-100">
                          <PesertaManager ekskulId={e.id} ekskulNama={e.nama} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Ekstrakurikuler" : "Tambah Ekstrakurikuler"}</DialogTitle>
            <DialogDescription>Data ekskul & jadwal</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              <div className="sm:col-span-2">
                <Label className="text-sm">Nama Ekskul *</Label>
                <Input value={editing.nama || ""} onChange={(e) => update("nama", e.target.value)} placeholder="cth: Pramuka" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm">Deskripsi</Label>
                <Textarea value={editing.deskripsi || ""} onChange={(e) => update("deskripsi", e.target.value)} rows={2} />
              </div>
              <div>
                <Label className="text-sm">Pembina</Label>
                <Select value={editing.pembinaId ? String(editing.pembinaId) : "none"} onValueChange={(v) => update("pembinaId", v === "none" ? null : Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Tidak ada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {pegawaiList.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nama}{p.jabatan ? ` (${p.jabatan})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Hari</Label>
                <Select value={editing.hari || "none"} onValueChange={(v) => update("hari", v === "none" ? null : v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Tidak ada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {HARI_OPTS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Jam Mulai</Label>
                <Input type="time" value={editing.jamMulai || ""} onChange={(e) => update("jamMulai", e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Jam Selesai</Label>
                <Input type="time" value={editing.jamSelesai || ""} onChange={(e) => update("jamSelesai", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm">Tempat</Label>
                <Input value={editing.tempat || ""} onChange={(e) => update("tempat", e.target.value)} placeholder="cth: Lapangan" />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <Switch
                  id="ekskulStatusAktif" checked={!!editing.statusAktif}
                  onCheckedChange={(v) => update("statusAktif", v)}
                />
                <Label htmlFor="ekskulStatusAktif" className="text-sm">Status Aktif</Label>
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
            <AlertDialogTitle>Nonaktifkan ekskul?</AlertDialogTitle>
            <AlertDialogDescription>
              Ekskul <b>{delTarget?.nama}</b> akan dinonaktifkan (soft delete).
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

function PesertaManager({ ekskulId, ekskulNama }: { ekskulId: number; ekskulNama: string }) {
  const [list, setList] = useState<{ id: number; siswaId: number; status: string; siswa: { id: number; nama: string; nis?: string | null; status?: string | null } }[]>([]);
  const [allSiswa, setAllSiswa] = useState<SiswaOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/ekstrakurikuler/${ekskulId}/siswa`).then((r) => r.json()),
        fetch("/api/siswa").then((r) => r.json()),
      ]);
      if (Array.isArray(r1)) setList(r1);
      if (Array.isArray(r2)) setAllSiswa(r2);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [ekskulId]);

  useEffect(() => { load(); }, [load]);

  const linkedIds = new Set(list.map((x) => x.siswaId));
  const available = allSiswa.filter((s) => !linkedIds.has(s.id));

  const handleAdd = async () => {
    if (!pick) return;
    setAdding(true);
    try {
      const r = await fetch(`/api/ekstrakurikuler/${ekskulId}/siswa`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siswaId: Number(pick) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menambah");
      setPick("");
      await load();
      toast({ title: "Peserta ditambahkan" });
    } catch (e) {
      toast({ title: "Gagal menambah", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setAdding(false); }
  };

  const handleRemove = async (siswaId: number, nama: string) => {
    try {
      const r = await fetch(`/api/ekstrakurikuler/${ekskulId}/siswa?siswaId=${siswaId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Gagal menghapus");
      await load();
      toast({ title: `${nama} dihapus dari ${ekskulNama}` });
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-slate-500" /></div>;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5" /> Kelola Peserta</p>
      <div className="flex flex-col sm:flex-row gap-2 items-end">
        <div className="flex-1 w-full">
          <Label className="text-xs">Tambah Siswa</Label>
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Pilih siswa..." /></SelectTrigger>
            <SelectContent>
              {available.length === 0 ? (
                <SelectItem value="_none" disabled>Tidak ada siswa tersedia</SelectItem>
              ) : available.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.nama} {s.nis ? `(${s.nis})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={adding || !pick || pick === "_none"} className="bg-slate-700 hover:bg-slate-800">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Tambah
        </Button>
      </div>
      <div className="border border-slate-200 rounded-md max-h-60 overflow-y-auto">
        {list.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-500">Belum ada peserta.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-slate-100 text-slate-600 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium">Nama</th>
                <th className="text-left px-2 py-1.5 font-medium">NIS</th>
                <th className="text-left px-2 py-1.5 font-medium">Status</th>
                <th className="text-right px-2 py-1.5 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-2 py-1.5 font-medium text-slate-800">{p.siswa?.nama}</td>
                  <td className="px-2 py-1.5 text-slate-600">{p.siswa?.nis || "-"}</td>
                  <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px]">{p.status}</Badge></td>
                  <td className="px-2 py-1.5 text-right">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-600" onClick={() => handleRemove(p.siswaId, p.siswa?.nama || "")}>
                      <X className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default EkstrakurikulerSection;
