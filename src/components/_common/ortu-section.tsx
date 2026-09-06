"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Plus, Pencil, Trash2, Loader2, UserCircle, Phone, Mail, Briefcase, UserPlus, X } from "lucide-react";
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
import { ImageUpload } from "./image-upload";
import { DataTableShell, EmptyState, SearchInput } from "./data-table-shell";

interface SiswaMini { id: number; nama: string; nis?: string | null; status?: string | null; }
interface AnakRel { id: number; siswaId: number; hubungan: string; siswa: SiswaMini; }
interface Ortu {
  id: number;
  nama: string;
  nik?: string | null;
  telepon?: string | null;
  email?: string | null;
  alamat?: string | null;
  pekerjaan?: string | null;
  fotoUrl?: string | null;
  statusAktif?: boolean;
  anakAnak?: AnakRel[];
  _count?: { anakAnak: number };
}

const empty = (): Partial<Ortu> => ({
  nama: "", nik: "", telepon: "", email: "", alamat: "", pekerjaan: "", fotoUrl: null, statusAktif: true,
});

export function OrtuSection() {
  const [list, setList] = useState<Ortu[]>([]);
  const [allSiswa, setAllSiswa] = useState<SiswaMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Ortu> | null>(null);
  const [editingAnak, setEditingAnak] = useState<AnakRel[]>([]);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Ortu | null>(null);
  // anak form state
  const [anakFormSiswa, setAnakFormSiswa] = useState<string>("");
  const [anakFormHub, setAnakFormHub] = useState<string>("Ayah");
  const [addingAnak, setAddingAnak] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/ortu"),
        fetch("/api/siswa"),
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      if (Array.isArray(d1)) setList(d1);
      if (Array.isArray(d2)) {
        setAllSiswa(d2.map((s: SiswaMini) => ({ id: s.id, nama: s.nama, nis: (s as { nis?: string | null }).nis, status: (s as { status?: string | null }).status })));
      }
    } catch {
      toast({ title: "Gagal memuat data ortu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return list;
    return list.filter((o) => [o.nama, o.nik, o.telepon, o.pekerjaan].filter(Boolean).some((s) => (s as string).toLowerCase().includes(q)));
  }, [list, search]);

  const handleAdd = () => {
    setEditing(empty());
    setEditingAnak([]);
    setDialogOpen(true);
  };
  const handleEdit = (o: Ortu) => {
    setEditing({ ...o });
    setEditingAnak(o.anakAnak || []);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.nama?.trim()) {
      toast({ title: "Nama wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = editing.id ? `/api/ortu/${editing.id}` : "/api/ortu";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "Ortu diperbarui" : "Ortu ditambahkan" });
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnak = async () => {
    if (!editing?.id || !anakFormSiswa) return;
    setAddingAnak(true);
    try {
      const r = await fetch(`/api/ortu/${editing.id}/add-anak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siswaId: Number(anakFormSiswa), hubungan: anakFormHub }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menambah anak");
      setEditingAnak((p) => {
        // replace if exists
        const filtered = p.filter((x) => x.siswaId !== d.siswaId);
        return [...filtered, d];
      });
      setAnakFormSiswa("");
      setAnakFormHub("Ayah");
      toast({ title: "Anak ditambahkan" });
    } catch (e) {
      toast({ title: "Gagal menambah anak", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setAddingAnak(false);
    }
  };

  const handleRemoveAnak = async (siswaId: number) => {
    if (!editing?.id) return;
    try {
      const r = await fetch(`/api/ortu/${editing.id}/remove-anak/${siswaId}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      setEditingAnak((p) => p.filter((x) => x.siswaId !== siswaId));
      toast({ title: "Relasi anak dihapus" });
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      const r = await fetch(`/api/ortu/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Ortu dihapus" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const update = (k: keyof Ortu, v: unknown) => setEditing((p) => p ? { ...p, [k]: v } : p);

  // siswa not yet linked
  const availableSiswa = useMemo(() => {
    if (!editing?.id) return allSiswa; // new ortu — can pick but won't add until save
    const linkedIds = new Set(editingAnak.map((a) => a.siswaId));
    return allSiswa.filter((s) => !linkedIds.has(s.id));
  }, [allSiswa, editingAnak, editing?.id]);

  return (
    <DataTableShell
      title="Data Orang Tua / Wali"
      description="Master data ortu & relasi ke siswa"
      icon={Users}
      loading={loading}
      emptyMessage="Belum ada data ortu. Klik Tambah Ortu untuk memulai."
      emptyIcon={UserCircle}
      toolbar={
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nama / NIK / telepon..." />
          <Button onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState icon={UserCircle} message="Tidak ada ortu yang cocok." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((o) => (
            <Card key={o.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {o.fotoUrl ? <img src={o.fotoUrl} alt={o.nama} className="h-full w-full object-cover" /> : <UserCircle className="h-8 w-8 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{o.nama}</p>
                    <p className="text-xs text-slate-500 truncate">{o.pekerjaan || "-"}</p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {o._count && (
                        <Badge className="bg-slate-100 text-slate-700">{o._count.anakAnak} anak</Badge>
                      )}
                      {o.statusAktif === false
                        ? <Badge className="bg-slate-200 text-slate-600 text-[10px]">Nonaktif</Badge>
                        : <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Aktif</Badge>}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  {o.telepon && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {o.telepon}</div>}
                  {o.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" /> {o.email}</div>}
                  {o.nik && <div className="flex items-center gap-1.5"><Briefcase className="h-3 w-3" /> NIK: {o.nik}</div>}
                </div>
                {o.anakAnak && o.anakAnak.length > 0 && (
                  <div className="text-xs space-y-1 pt-2 border-t border-slate-100">
                    <p className="font-medium text-slate-600">Anak:</p>
                    {o.anakAnak.map((a) => (
                      <div key={a.id} className="flex justify-between">
                        <span>{a.siswa.nama}</span>
                        <Badge variant="outline" className="text-[10px]">{a.hubungan}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(o)} className="flex-1">
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDelTarget(o)} className="text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Ortu/Wali" : "Tambah Ortu/Wali"}</DialogTitle>
            <DialogDescription>
              {editing?.id ? "Perbarui data ortu & kelola relasi anak." : "Lengkapi data ortu terlebih dahulu, lalu simpan untuk menambah relasi anak."}
            </DialogDescription>
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
                  <div><Label>NIK</Label><Input value={editing.nik || ""} onChange={(e) => update("nik", e.target.value)} /></div>
                  <div><Label>Pekerjaan</Label><Input value={editing.pekerjaan || ""} onChange={(e) => update("pekerjaan", e.target.value)} /></div>
                  <div><Label>Telepon</Label><Input value={editing.telepon || ""} onChange={(e) => update("telepon", e.target.value)} /></div>
                  <div><Label>Email</Label><Input type="email" value={editing.email || ""} onChange={(e) => update("email", e.target.value)} /></div>
                  <div className="sm:col-span-2"><Label>Alamat</Label><Textarea value={editing.alamat || ""} onChange={(e) => update("alamat", e.target.value)} rows={2} /></div>
                  <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                    <Switch
                      id="ortuStatusAktif" checked={editing.statusAktif !== false}
                      onCheckedChange={(v) => update("statusAktif", v)}
                    />
                    <Label htmlFor="ortuStatusAktif" className="text-sm cursor-pointer">Status Aktif</Label>
                  </div>
                </div>
              </div>

              {editing.id && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5"><UserPlus className="h-4 w-4" /> Anak / Siswa Terhubung</p>
                  {editingAnak.length === 0 ? (
                    <p className="text-xs text-slate-500 mb-3">Belum ada anak terhubung.</p>
                  ) : (
                    <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                      {editingAnak.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-100">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{a.siswa.nama}</p>
                            <p className="text-[10px] text-slate-500">{a.siswa.nis || "—"} • {a.siswa.status}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{a.hubungan}</Badge>
                          <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-rose-600" onClick={() => handleRemoveAnak(a.siswaId)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2 items-end">
                    <div className="flex-1 w-full">
                      <Label className="text-xs">Tambah Anak</Label>
                      <Select value={anakFormSiswa} onValueChange={setAnakFormSiswa}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Pilih siswa..." /></SelectTrigger>
                        <SelectContent>
                          {availableSiswa.length === 0 ? (
                            <SelectItem value="_none" disabled>Tidak ada siswa tersedia</SelectItem>
                          ) : availableSiswa.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.nama} {s.nis ? `(${s.nis})` : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full sm:w-32">
                      <Label className="text-xs">Hubungan</Label>
                      <Select value={anakFormHub} onValueChange={setAnakFormHub}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ayah">Ayah</SelectItem>
                          <SelectItem value="Ibu">Ibu</SelectItem>
                          <SelectItem value="Wali">Wali</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" size="sm" onClick={handleAddAnak} disabled={addingAnak || !anakFormSiswa || anakFormSiswa === "_none"} className="bg-slate-700 hover:bg-slate-800">
                      {addingAnak ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
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
            <AlertDialogTitle>Hapus Ortu?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin menghapus <b>{delTarget?.nama}</b>? Relasi ke anak juga akan dihapus.
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
