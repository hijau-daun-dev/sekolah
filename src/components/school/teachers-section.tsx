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
import { Plus, Search, Pencil, Trash2, Loader2, Users, UserCircle2 } from "lucide-react";
import type { Teacher } from "@/lib/types";

const emptyForm: Omit<Teacher, "id" | "createdAt" | "updatedAt"> = {
  nip: "",
  name: "",
  gender: "L",
  birthPlace: "",
  birthDate: "",
  phone: "",
  email: "",
  address: "",
  subject: "",
  position: "",
  photoUrl: null,
  orgLevel: 0,
  orgOrder: 0,
  parentId: null,
};

export function TeachersSection() {
  const { toast } = useToast();
  const [list, setList] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teachers");
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Gagal memuat data guru", variant: "destructive" });
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

  const openEdit = (t: Teacher) => {
    setForm({
      nip: t.nip || "",
      name: t.name,
      gender: t.gender || "L",
      birthPlace: t.birthPlace || "",
      birthDate: t.birthDate || "",
      phone: t.phone || "",
      email: t.email || "",
      address: t.address || "",
      subject: t.subject || "",
      position: t.position || "",
      photoUrl: t.photoUrl || null,
      orgLevel: t.orgLevel ?? 0,
      orgOrder: t.orgOrder ?? 0,
      parentId: t.parentId || null,
    });
    setEditId(t.id);
    setDialogOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Nama guru wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `/api/teachers/${editId}` : "/api/teachers";
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
        description: editId ? "Data guru diperbarui." : "Guru baru ditambahkan.",
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
      const res = await fetch(`/api/teachers/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      toast({ title: "Berhasil", description: "Data guru dihapus." });
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

  // Build map of id -> name for parent select
  const nameById = new Map(list.map((t) => [t.id, t.name]));
  // For parent options, exclude self and descendants of self (when editing)
  const descendantsOf = (id: string): Set<string> => {
    const set = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      set.add(cur);
      list.filter((t) => t.parentId === cur).forEach((c) => stack.push(c.id));
    }
    return set;
  };
  const excluded = editId ? descendantsOf(editId) : new Set<string>();

  const filtered = list.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.nip || "").toLowerCase().includes(q) ||
      (t.subject || "").toLowerCase().includes(q) ||
      (t.position || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Data Guru
              </CardTitle>
              <CardDescription>
                Kelola data guru beserta foto, jabatan, dan posisi dalam struktur organisasi.
              </CardDescription>
            </div>
            <Button onClick={openAdd} className="self-start sm:self-auto">
              <Plus className="h-4 w-4" /> Tambah Guru
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, NIP, mata pelajaran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada data guru. Klik &quot;Tambah Guru&quot; untuk memulai.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[640px] overflow-y-auto pr-1">
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="flex gap-3 p-3 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {t.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.photoUrl} alt={t.name} className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle2 className="h-9 w-9 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.position || t.subject || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground/80 truncate">
                      NIP: {t.nip || "—"}
                    </p>
                    <div className="flex gap-1 mt-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => openEdit(t)}
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteId(t.id);
                          setDeleteName(t.name);
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
            <DialogTitle>{editId ? "Edit Data Guru" : "Tambah Guru Baru"}</DialogTitle>
            <DialogDescription>
              Isi formulir di bawah. Foto guru dapat diunggah dengan drag &amp; drop.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-5">
            <div className="grid md:grid-cols-[auto_1fr] gap-5 items-start">
              <ImageUpload
                label="Foto Guru"
                value={form.photoUrl}
                onChange={(url) => set("photoUrl", url)}
                shape="rounded"
                size="md"
              />
              <div className="grid sm:grid-cols-2 gap-3 w-full">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="t-name">Nama Lengkap *</Label>
                  <Input
                    id="t-name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Nama lengkap guru"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-nip">NIP</Label>
                  <Input
                    id="t-nip"
                    value={form.nip || ""}
                    onChange={(e) => set("nip", e.target.value)}
                    placeholder="Nomor Induk Pegawai"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-gender">Jenis Kelamin</Label>
                  <Select value={form.gender || "L"} onValueChange={(v) => set("gender", v)}>
                    <SelectTrigger id="t-gender"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-bp">Tempat Lahir</Label>
                  <Input
                    id="t-bp"
                    value={form.birthPlace || ""}
                    onChange={(e) => set("birthPlace", e.target.value)}
                    placeholder="Kota kelahiran"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-bd">Tanggal Lahir</Label>
                  <Input
                    id="t-bd"
                    type="date"
                    value={form.birthDate || ""}
                    onChange={(e) => set("birthDate", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="t-subject">Mata Pelajaran / Bidang</Label>
                <Input
                  id="t-subject"
                  value={form.subject || ""}
                  onChange={(e) => set("subject", e.target.value)}
                  placeholder="contoh: Matematika"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-position">Jabatan / Posisi</Label>
                <Input
                  id="t-position"
                  value={form.position || ""}
                  onChange={(e) => set("position", e.target.value)}
                  placeholder="contoh: Wakil Kepala Sekolah"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-phone">Telepon</Label>
                <Input
                  id="t-phone"
                  value={form.phone || ""}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-email">Email</Label>
                <Input
                  id="t-email"
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@sekolah.sch.id"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="t-address">Alamat</Label>
                <Textarea
                  id="t-address"
                  value={form.address || ""}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Alamat tempat tinggal"
                  rows={2}
                />
              </div>
            </div>

            {/* Struktur organisasi fields */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium">Posisi dalam Struktur Organisasi</p>
                <p className="text-xs text-muted-foreground">
                  Atur hierarki: pilih atasan langsung dan level untuk fleksibilitas struktur.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="t-parent">Atasan Langsung</Label>
                  <Select
                    value={form.parentId || "none"}
                    onValueChange={(v) => set("parentId", v === "none" ? null : v)}
                  >
                    <SelectTrigger id="t-parent">
                      <SelectValue placeholder="Tanpa atasan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Tanpa atasan (puncak) —</SelectItem>
                      {list
                        .filter((t) => !excluded.has(t.id))
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} {t.position ? `(${t.position})` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-level">Level (0 = puncak)</Label>
                  <Input
                    id="t-level"
                    type="number"
                    min={0}
                    value={form.orgLevel}
                    onChange={(e) => set("orgLevel", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-order">Urutan</Label>
                  <Input
                    id="t-order"
                    type="number"
                    min={0}
                    value={form.orgOrder}
                    onChange={(e) => set("orgOrder", Number(e.target.value))}
                  />
                </div>
              </div>
              {form.parentId && (
                <p className="text-xs text-muted-foreground">
                  Atasan: <span className="font-medium text-foreground">{nameById.get(form.parentId)}</span>
                </p>
              )}
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
            <AlertDialogTitle>Hapus Data Guru?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus data <strong>{deleteName}</strong>. Tindakan ini tidak dapat dibatalkan.
              Guru yang masih memiliki bawahan tidak dapat dihapus.
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
