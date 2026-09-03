"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Plus, Search, Pencil, Trash2, Loader2, UserCircle, Mail, Phone, Briefcase, GitBranch } from "lucide-react";
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

interface Pegawai {
  id: number;
  nip?: string | null;
  nama: string;
  gender?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  alamat?: string | null;
  telepon?: string | null;
  email?: string | null;
  jabatan?: string | null;
  bidangStudi?: string | null;
  fotoUrl?: string | null;
  status?: string | null;
  orgLevel: number;
  orgOrder: number;
  parentId?: number | null;
  parent?: { id: number; nama: string; jabatan?: string | null } | null;
  _count?: { children: number };
}

const empty = (): Partial<Pegawai> => ({
  nip: "", nama: "", gender: "", tempatLahir: "", tanggalLahir: "", alamat: "",
  telepon: "", email: "", jabatan: "", bidangStudi: "", fotoUrl: null, status: "Aktif",
  orgLevel: 0, orgOrder: 0, parentId: null,
});

const fmtDate = (d?: string | null) => d ? new Date(d).toISOString().split("T")[0] : "";
const fmtDateDisplay = (d?: string | null) => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

export function PegawaiSection() {
  const [list, setList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Pegawai> | null>(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Pegawai | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/pegawai");
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat data pegawai", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return list;
    return list.filter((p) => [p.nama, p.nip, p.jabatan, p.email].filter(Boolean).some((s) => (s as string).toLowerCase().includes(q)));
  }, [list, search]);

  const handleAdd = () => { setEditing(empty()); setDialogOpen(true); };
  const handleEdit = (p: Pegawai) => {
    setEditing({ ...p, tanggalLahir: fmtDate(p.tanggalLahir) });
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
      const url = editing.id ? `/api/pegawai/${editing.id}` : "/api/pegawai";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "Pegawai diperbarui" : "Pegawai ditambahkan" });
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
      const r = await fetch(`/api/pegawai/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Pegawai dihapus" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  // For parent select: exclude self
  const parentOptions = useMemo(() => {
    if (!editing?.id) return list;
    return list.filter((p) => p.id !== editing.id);
  }, [list, editing?.id]);

  const update = (k: keyof Pegawai, v: unknown) => setEditing((p) => p ? { ...p, [k]: v } : p);

  return (
    <DataTableShell
      title="Data Pegawai"
      description="Guru, staf, & struktur organisasi sekolah"
      icon={Users}
      loading={loading}
      emptyMessage="Belum ada pegawai. Klik Tambah Pegawai untuk memulai."
      emptyIcon={UserCircle}
      toolbar={
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nama / NIP / jabatan..." />
          <Button onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState icon={UserCircle} message="Tidak ada pegawai yang cocok." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {p.fotoUrl ? <img src={p.fotoUrl} alt={p.nama} className="h-full w-full object-cover" /> : <UserCircle className="h-8 w-8 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{p.nama}</p>
                    <p className="text-xs text-slate-500 truncate">{p.jabatan || "-"}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.nip && <Badge variant="outline" className="text-[10px]">NIP: {p.nip}</Badge>}
                      {p.status && (
                        <Badge className={p.status === "Aktif" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>{p.status}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  {p.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 flex-shrink-0" /> {p.email}</div>}
                  {p.telepon && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {p.telepon}</div>}
                  {p.bidangStudi && <div className="flex items-center gap-1.5"><Briefcase className="h-3 w-3" /> {p.bidangStudi}</div>}
                  {p.parent && (
                    <div className="flex items-center gap-1.5"><GitBranch className="h-3 w-3" /> Atasan: <span className="font-medium">{p.parent.nama}</span></div>
                  )}
                  {p._count && p._count.children > 0 && (
                    <div className="text-slate-500">Memiliki {p._count.children} bawahan</div>
                  )}
                </div>
                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(p)} className="flex-1">
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDelTarget(p)} className="text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Pegawai" : "Tambah Pegawai"}</DialogTitle>
            <DialogDescription>Lengkapi data pegawai dan posisi dalam struktur organisasi.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <ImageUpload label="Foto" value={editing.fotoUrl ?? null} onChange={(v) => update("fotoUrl", v)} shape="circle" size="md" />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label>Nama Lengkap *</Label>
                    <Input value={editing.nama || ""} onChange={(e) => update("nama", e.target.value)} placeholder="Nama pegawai" />
                  </div>
                  <div>
                    <Label>NIP</Label>
                    <Input value={editing.nip || ""} onChange={(e) => update("nip", e.target.value)} />
                  </div>
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
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Tempat Lahir</Label>
                  <Input value={editing.tempatLahir || ""} onChange={(e) => update("tempatLahir", e.target.value)} />
                </div>
                <div>
                  <Label>Tanggal Lahir</Label>
                  <Input type="date" value={editing.tanggalLahir || ""} onChange={(e) => update("tanggalLahir", e.target.value)} />
                </div>
                <div>
                  <Label>Telepon</Label>
                  <Input value={editing.telepon || ""} onChange={(e) => update("telepon", e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={editing.email || ""} onChange={(e) => update("email", e.target.value)} />
                </div>
                <div>
                  <Label>Jabatan</Label>
                  <Input value={editing.jabatan || ""} onChange={(e) => update("jabatan", e.target.value)} placeholder="Kepala Sekolah / Guru / TU..." />
                </div>
                <div>
                  <Label>Bidang Studi</Label>
                  <Input value={editing.bidangStudi || ""} onChange={(e) => update("bidangStudi", e.target.value)} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editing.status || "Aktif"} onValueChange={(v) => update("status", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aktif">Aktif</SelectItem>
                      <SelectItem value="Pensiun">Pensiun</SelectItem>
                      <SelectItem value="Resign">Resign</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Alamat</Label>
                  <Textarea value={editing.alamat || ""} onChange={(e) => update("alamat", e.target.value)} rows={2} />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5"><GitBranch className="h-4 w-4" /> Posisi dalam Struktur Organisasi</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Level (0 = Top)</Label>
                    <Input type="number" value={editing.orgLevel ?? 0} onChange={(e) => update("orgLevel", Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Urutan</Label>
                    <Input type="number" value={editing.orgOrder ?? 0} onChange={(e) => update("orgOrder", Number(e.target.value))} />
                  </div>
                  <div className="sm:col-span-1">
                    <Label>Atasan (Parent)</Label>
                    <Select
                      value={editing.parentId ? String(editing.parentId) : "none"}
                      onValueChange={(v) => update("parentId", v === "none" ? null : Number(v))}
                    >
                      <SelectTrigger className="w-full"><SelectValue placeholder="Tidak ada" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Tidak ada —</SelectItem>
                        {parentOptions.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.nama} {p.jabatan ? `(${p.jabatan})` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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

      {/* Delete confirm */}
      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pegawai?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin menghapus <b>{delTarget?.nama}</b>? Tindakan ini tidak dapat dibatalkan. Pegawai dengan bawahan tidak dapat dihapus sampai bawahannya direassign.
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
