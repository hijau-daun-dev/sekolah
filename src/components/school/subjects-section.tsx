"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Pencil, Trash2, Loader2, BookOpen, Clock, Hash, Library,
} from "lucide-react";
import type { Subject } from "@/lib/types";

const emptyForm = {
  code: "",
  name: "",
  category: "none",
  durationHours: "" as string | number,
  description: "",
};

// Predefined categories commonly used in Indonesian schools
const categoryOptions = [
  "Wajib (A)",
  "Pilihan (B)",
  "Muatan Lokal (C)",
  "Pengembangan Diri (D)",
  "Akademik",
  "Vokasi",
  "Agama",
  "Lainnya",
];

const categoryColor: Record<string, string> = {
  "Wajib (A)": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "Pilihan (B)": "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  "Muatan Lokal (C)": "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  "Pengembangan Diri (D)": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Akademik: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  Vokasi: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  Agama: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  Lainnya: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

export function SubjectsSection() {
  const { toast } = useToast();
  const [list, setList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subjects");
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Gagal memuat data mata pelajaran", variant: "destructive" });
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

  const openEdit = (s: Subject) => {
    setForm({
      code: s.code || "",
      name: s.name,
      category: s.category || "none",
      durationHours: s.durationHours ?? "",
      description: s.description || "",
    });
    setEditId(s.id);
    setDialogOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Nama mata pelajaran wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        durationHours: form.durationHours === "" ? null : Number(form.durationHours),
        category: form.category === "none" ? null : form.category,
      };
      const url = editId ? `/api/subjects/${editId}` : "/api/subjects";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast({
        title: "Berhasil",
        description: editId ? "Data mata pelajaran diperbarui." : "Mata pelajaran baru ditambahkan.",
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
      const res = await fetch(`/api/subjects/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      toast({ title: "Berhasil", description: "Data mata pelajaran dihapus." });
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

  const filtered = list.filter((s) => {
    if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.code || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> Data Mata Pelajaran
              </CardTitle>
              <CardDescription>
                Kelola daftar mata pelajaran beserta kode, kategori, dan jumlah jam pelajaran.
              </CardDescription>
            </div>
            <Button onClick={openAdd} className="self-start sm:self-auto">
              <Plus className="h-4 w-4" /> Tambah Mapel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau kode mata pelajaran..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Semua kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada data mata pelajaran. Klik &quot;Tambah Mapel&quot; untuk memulai.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Kode</TableHead>
                      <TableHead>Nama Mata Pelajaran</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-center">JP / Minggu</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          {s.code ? (
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-medium">
                              <Hash className="h-3 w-3 text-muted-foreground" />
                              {s.code}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          {s.category ? (
                            <span className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${categoryColor[s.category] || categoryColor.Lainnya}`}>
                              {s.category}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {s.durationHours ? (
                            <span className="inline-flex items-center gap-1 text-sm">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {s.durationHours}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {s.description || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteId(s.id);
                              setDeleteName(s.name);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Summary footer */}
          {!loading && list.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Library className="h-3.5 w-3.5" />
                Total: <strong className="text-foreground">{list.length}</strong> mata pelajaran
              </span>
              <span>
                Total JP/Minggu: <strong className="text-foreground">
                  {list.reduce((sum, s) => sum + (s.durationHours || 0), 0)}
                </strong>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Data Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}</DialogTitle>
            <DialogDescription>
              Lengkapi formulir di bawah. Kode mata pelajaran harus unik (opsional).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-code">Kode Mata Pelajaran</Label>
                <Input
                  id="s-code"
                  value={form.code}
                  onChange={(e) => set("code", e.target.value)}
                  placeholder="contoh: MAT-XII-01"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-category">Kategori</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger id="s-category"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="s-name">Nama Mata Pelajaran *</Label>
                <Input
                  id="s-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="contoh: Matematika Peminatan"
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="s-hours">Jumlah Jam Pelajaran per Minggu (JP)</Label>
                <Input
                  id="s-hours"
                  type="number"
                  min={0}
                  value={form.durationHours}
                  onChange={(e) => set("durationHours", e.target.value)}
                  placeholder="contoh: 4"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="s-desc">Keterangan</Label>
                <Textarea
                  id="s-desc"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Deskripsi singkat mata pelajaran"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</>
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
            <AlertDialogTitle>Hapus Data Mata Pelajaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus mata pelajaran <strong>{deleteName}</strong>. Tindakan ini tidak dapat dibatalkan.
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
