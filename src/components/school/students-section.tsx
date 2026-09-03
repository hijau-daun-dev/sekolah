"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "./image-upload";
import { Plus, Search, Pencil, Trash2, Loader2, GraduationCap, UserCircle2, Filter } from "lucide-react";
import type { Student } from "@/lib/types";

const emptyForm: Omit<Student, "id" | "createdAt" | "updatedAt"> = {
  nis: "",
  nisn: "",
  name: "",
  gender: "L",
  birthPlace: "",
  birthDate: "",
  phone: "",
  email: "",
  address: "",
  className: "",
  major: "",
  photoUrl: null,
  guardianName: "",
  guardianPhone: "",
  guardianJob: "",
};

export function StudentsSection() {
  const { toast } = useToast();
  const [list, setList] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Gagal memuat data siswa", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: keyof typeof form, value: unknown) =>
    setForm((p) => ({ ...p, [key]: value as never }));

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setDialogOpen(true);
  };

  const openEdit = (s: Student) => {
    setForm({
      nis: s.nis || "",
      nisn: s.nisn || "",
      name: s.name,
      gender: s.gender || "L",
      birthPlace: s.birthPlace || "",
      birthDate: s.birthDate || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      className: s.className || "",
      major: s.major || "",
      photoUrl: s.photoUrl || null,
      guardianName: s.guardianName || "",
      guardianPhone: s.guardianPhone || "",
      guardianJob: s.guardianJob || "",
    });
    setEditId(s.id!);
    setDialogOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Nama siswa wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `/api/students/${editId}` : "/api/students";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast({
        title: "Berhasil",
        description: editId ? "Data siswa diperbarui." : "Siswa baru ditambahkan.",
      });
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({
        title: "Gagal menyimpan",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/students/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      toast({ title: "Berhasil", description: "Data siswa dihapus." });
      load();
    } catch (e) {
      toast({
        title: "Gagal menghapus",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const classes = Array.from(new Set(list.map((s) => s.className).filter(Boolean))).sort();
  const filtered = list.filter((s) => {
    if (classFilter !== "all" && s.className !== classFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.nis || "").toLowerCase().includes(q) ||
      (s.nisn || "").toLowerCase().includes(q) ||
      (s.className || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" /> Data Siswa
              </CardTitle>
              <CardDescription>
                Kelola data siswa beserta foto, kelas, dan informasi wali.
              </CardDescription>
            </div>
            <Button onClick={openAdd} className="self-start sm:self-auto">
              <Plus className="h-4 w-4" /> Tambah Siswa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIS, NISN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="pl-8">
                  <SelectValue placeholder="Semua kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c as string}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada data siswa. Klik &quot;Tambah Siswa&quot; untuk memulai.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[640px] overflow-y-auto pr-1">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="flex gap-3 p-3 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {s.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photoUrl} alt={s.name} className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle2 className="h-9 w-9 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.className || "—"} {s.major ? `· ${s.major}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground/80 truncate">
                      NIS: {s.nis || "—"}
                    </p>
                    <div className="flex gap-1 mt-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteId(s.id!);
                          setDeleteName(s.name);
                        }}
                      >
                        <Trash2 className="h-3 w-3" /> Hapus
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Data Siswa" : "Tambah Siswa Baru"}</DialogTitle>
            <DialogDescription>
              Lengkapi formulir di bawah. Foto siswa dapat diunggah dengan drag &amp; drop.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-5">
            <div className="grid md:grid-cols-[auto_1fr] gap-5 items-start">
              <ImageUpload
                label="Foto Siswa"
                value={form.photoUrl}
                onChange={(url) => set("photoUrl", url)}
                shape="rounded"
                size="md"
              />
              <div className="grid sm:grid-cols-2 gap-3 w-full">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="s-name">Nama Lengkap *</Label>
                  <Input
                    id="s-name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Nama lengkap siswa"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-nis">NIS</Label>
                  <Input
                    id="s-nis"
                    value={form.nis || ""}
                    onChange={(e) => set("nis", e.target.value)}
                    placeholder="Nomor Induk Siswa"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-nisn">NISN</Label>
                  <Input
                    id="s-nisn"
                    value={form.nisn || ""}
                    onChange={(e) => set("nisn", e.target.value)}
                    placeholder="Nomor Induk Siswa Nasional"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-gender">Jenis Kelamin</Label>
                  <Select value={form.gender || "L"} onValueChange={(v) => set("gender", v)}>
                    <SelectTrigger id="s-gender"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-class">Kelas</Label>
                  <Input
                    id="s-class"
                    value={form.className || ""}
                    onChange={(e) => set("className", e.target.value)}
                    placeholder="contoh: XII IPA 1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-bp">Tempat Lahir</Label>
                  <Input
                    id="s-bp"
                    value={form.birthPlace || ""}
                    onChange={(e) => set("birthPlace", e.target.value)}
                    placeholder="Kota kelahiran"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-bd">Tanggal Lahir</Label>
                  <Input
                    id="s-bd"
                    type="date"
                    value={form.birthDate || ""}
                    onChange={(e) => set("birthDate", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="s-major">Jurusan / Program</Label>
                  <Input
                    id="s-major"
                    value={form.major || ""}
                    onChange={(e) => set("major", e.target.value)}
                    placeholder="contoh: IPA / IPS / TKJ"
                  />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-phone">Telepon Siswa</Label>
                <Input
                  id="s-phone"
                  value={form.phone || ""}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-email">Email</Label>
                <Input
                  id="s-email"
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email siswa"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="s-address">Alamat</Label>
                <Textarea
                  id="s-address"
                  value={form.address || ""}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Alamat tempat tinggal"
                  rows={2}
                />
              </div>
            </div>

            {/* Wali / Orang Tua */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium">Data Wali / Orang Tua</p>
                <p className="text-xs text-muted-foreground">
                  Informasi kontak wali untuk keperluan administrasi.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="s-gn">Nama Wali</Label>
                  <Input
                    id="s-gn"
                    value={form.guardianName || ""}
                    onChange={(e) => set("guardianName", e.target.value)}
                    placeholder="Nama orang tua / wali"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-gp">Telepon Wali</Label>
                  <Input
                    id="s-gp"
                    value={form.guardianPhone || ""}
                    onChange={(e) => set("guardianPhone", e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-gj">Pekerjaan Wali</Label>
                  <Input
                    id="s-gj"
                    value={form.guardianJob || ""}
                    onChange={(e) => set("guardianJob", e.target.value)}
                    placeholder="Pekerjaan wali"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  "Simpan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Siswa?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus data <strong>{deleteName}</strong>. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
