"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, Plus, Pencil, Trash2, Loader2, UserCircle, Phone, MapPin, BookOpen } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "./image-upload";
import { DataTableShell, EmptyState, SearchInput } from "./data-table-shell";

interface KelasMini { id: number; nama: string; tingkat?: { nama: string } | null; tahunAjaran?: { nama: string; statusAktif: boolean } | null; }
interface Siswa {
  id: number;
  nis?: string | null;
  nisn?: string | null;
  nama: string;
  gender?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  alamat?: string | null;
  telepon?: string | null;
  fotoUrl?: string | null;
  status?: string | null;
  kelasSiswas?: { kelas: KelasMini }[];
}

const empty = (): Partial<Siswa> => ({
  nis: "", nisn: "", nama: "", gender: "", tempatLahir: "", tanggalLahir: "",
  alamat: "", telepon: "", fotoUrl: null, status: "Aktif",
});

const fmtDate = (d?: string | null) => d ? new Date(d).toISOString().split("T")[0] : "";
const fmtDateDisplay = (d?: string | null) => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

const statusColor = (s?: string | null) => {
  if (s === "Aktif") return "bg-emerald-100 text-emerald-700";
  if (s === "Lulus") return "bg-slate-200 text-slate-700";
  if (s === "Pindah") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
};

export function SiswaSection() {
  const [list, setList] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Siswa> | null>(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Siswa | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/siswa");
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat data siswa", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return list.filter((s) => {
      const matchesSearch = !q || [s.nama, s.nis, s.nisn].filter(Boolean).some((x) => (x as string).toLowerCase().includes(q));
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [list, search, statusFilter]);

  const handleAdd = () => { setEditing(empty()); setDialogOpen(true); };
  const handleEdit = (s: Siswa) => {
    setEditing({ ...s, tanggalLahir: fmtDate(s.tanggalLahir) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.nama?.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body = { ...editing, tanggalLahir: editing.tanggalLahir ? new Date(editing.tanggalLahir).toISOString() : null };
      const url = editing.id ? `/api/siswa/${editing.id}` : "/api/siswa";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "Siswa diperbarui" : "Siswa ditambahkan" });
      setDialogOpen(false);
      setEditing(null);
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
      const r = await fetch(`/api/siswa/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Siswa dihapus" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const update = (k: keyof Siswa, v: unknown) => setEditing((p) => p ? { ...p, [k]: v } : p);

  const currentKelas = (s: Siswa) => {
    if (!s.kelasSiswas || s.kelasSiswas.length === 0) return null;
    // find active TA kelas if exists, else first
    const aktif = s.kelasSiswas.find((ks) => ks.kelas.tahunAjaran?.statusAktif) || s.kelasSiswas[0];
    return aktif.kelas;
  };

  return (
    <DataTableShell
      title="Data Siswa"
      description="Master data siswa & status keaktifan"
      icon={GraduationCap}
      loading={loading}
      emptyMessage="Belum ada siswa. Klik Tambah Siswa untuk memulai."
      emptyIcon={UserCircle}
      toolbar={
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nama / NIS / NISN..." />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="Aktif">Aktif</SelectItem>
              <SelectItem value="Lulus">Lulus</SelectItem>
              <SelectItem value="Pindah">Pindah</SelectItem>
              <SelectItem value="Nonaktif">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState icon={UserCircle} message="Tidak ada siswa yang cocok." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const k = currentKelas(s);
            return (
              <Card key={s.id} className="border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {s.fotoUrl ? <img src={s.fotoUrl} alt={s.nama} className="h-full w-full object-cover" /> : <UserCircle className="h-8 w-8 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{s.nama}</p>
                      <p className="text-xs text-slate-500 truncate">{s.nis ? `NIS: ${s.nis}` : "—"} {s.nisn ? ` / NISN: ${s.nisn}` : ""}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.gender && <Badge variant="outline" className="text-[10px]">{s.gender === "L" ? "Laki-laki" : "Perempuan"}</Badge>}
                        {s.status && <Badge className={statusColor(s.status)}>{s.status}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    {s.tanggalLahir && <div>TL: {s.tempatLahir || "-"}, {fmtDateDisplay(s.tanggalLahir)}</div>}
                    {s.telepon && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {s.telepon}</div>}
                    {s.alamat && <div className="flex items-start gap-1.5"><MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" /> <span className="line-clamp-1">{s.alamat}</span></div>}
                    {k && (
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium"><BookOpen className="h-3 w-3" /> Kelas: {k.nama} {k.tingkat ? `(${k.tingkat.nama})` : ""}</div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-slate-100">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(s)} className="flex-1">
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDelTarget(s)} className="text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Siswa" : "Tambah Siswa"}</DialogTitle>
            <DialogDescription>Lengkapi biodata siswa.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <ImageUpload label="Foto" value={editing.fotoUrl ?? null} onChange={(v) => update("fotoUrl", v)} shape="circle" size="md" />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label>Nama Lengkap *</Label>
                    <Input value={editing.nama || ""} onChange={(e) => update("nama", e.target.value)} />
                  </div>
                  <div><Label>NIS</Label><Input value={editing.nis || ""} onChange={(e) => update("nis", e.target.value)} /></div>
                  <div><Label>NISN</Label><Input value={editing.nisn || ""} onChange={(e) => update("nisn", e.target.value)} /></div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Gender</Label>
                  <Select value={editing.gender || ""} onValueChange={(v) => update("gender", v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={editing.status || "Aktif"} onValueChange={(v) => update("status", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aktif">Aktif</SelectItem>
                      <SelectItem value="Lulus">Lulus</SelectItem>
                      <SelectItem value="Pindah">Pindah</SelectItem>
                      <SelectItem value="Nonaktif">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Tempat Lahir</Label><Input value={editing.tempatLahir || ""} onChange={(e) => update("tempatLahir", e.target.value)} /></div>
                <div><Label>Tanggal Lahir</Label><Input type="date" value={editing.tanggalLahir || ""} onChange={(e) => update("tanggalLahir", e.target.value)} /></div>
                <div><Label>Telepon</Label><Input value={editing.telepon || ""} onChange={(e) => update("telepon", e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Alamat</Label><Textarea value={editing.alamat || ""} onChange={(e) => update("alamat", e.target.value)} rows={2} /></div>
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
            <AlertDialogTitle>Hapus Siswa?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin menghapus <b>{delTarget?.nama}</b>? Semua data terkait (nilai, absensi, tagihan) akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DataTableShell>
  );
}
