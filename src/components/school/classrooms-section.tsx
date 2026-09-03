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
  Plus, Search, Pencil, Trash2, Loader2, DoorOpen, Users, UserCircle2, Hash, Building2,
} from "lucide-react";
import type { ClassRoom, Teacher } from "@/lib/types";

const emptyForm = {
  name: "",
  grade: "",
  major: "",
  homeroomTeacherId: "none",
  room: "",
  capacity: "" as string | number,
  academicYear: "",
  description: "",
};

const gradeOptions = ["X", "XI", "XII"];

export function ClassroomsSection() {
  const { toast } = useToast();
  const [list, setList] = useState<ClassRoom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        fetch("/api/classrooms"),
        fetch("/api/teachers"),
      ]);
      const cData = await cRes.json();
      const tData = await tRes.json();
      setList(Array.isArray(cData) ? cData : []);
      setTeachers(Array.isArray(tData) ? tData : []);
    } catch {
      toast({ title: "Gagal memuat data kelas", variant: "destructive" });
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

  const openEdit = (c: ClassRoom) => {
    setForm({
      name: c.name,
      grade: c.grade || "",
      major: c.major || "",
      homeroomTeacherId: c.homeroomTeacherId || "none",
      room: c.room || "",
      capacity: c.capacity ?? "",
      academicYear: c.academicYear || "",
      description: c.description || "",
    });
    setEditId(c.id);
    setDialogOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Nama kelas wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        capacity: form.capacity === "" ? null : Number(form.capacity),
        homeroomTeacherId: form.homeroomTeacherId === "none" ? null : form.homeroomTeacherId,
      };
      const url = editId ? `/api/classrooms/${editId}` : "/api/classrooms";
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
        description: editId ? "Data kelas diperbarui." : "Kelas baru ditambahkan.",
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
      const res = await fetch(`/api/classrooms/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      toast({ title: "Berhasil", description: "Data kelas dihapus." });
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

  const filtered = list.filter((c) => {
    if (gradeFilter !== "all" && c.grade !== gradeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.grade || "").toLowerCase().includes(q) ||
      (c.major || "").toLowerCase().includes(q) ||
      (c.room || "").toLowerCase().includes(q) ||
      (c.homeroomTeacher?.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-primary" /> Data Kelas
              </CardTitle>
              <CardDescription>
                Kelola daftar kelas beserta wali kelas, ruangan, kapasitas, dan tahun ajaran.
              </CardDescription>
            </div>
            <Button onClick={openAdd} className="self-start sm:self-auto">
              <Plus className="h-4 w-4" /> Tambah Kelas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama kelas, wali kelas, ruangan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Semua tingkat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tingkat</SelectItem>
                {gradeOptions.map((g) => (
                  <SelectItem key={g} value={g}>Tingkat {g}</SelectItem>
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
              <DoorOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada data kelas. Klik &quot;Tambah Kelas&quot; untuk memulai.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Nama Kelas</TableHead>
                      <TableHead>Tingkat</TableHead>
                      <TableHead>Jurusan</TableHead>
                      <TableHead>Wali Kelas</TableHead>
                      <TableHead>Ruangan</TableHead>
                      <TableHead className="text-center">Kapasitas</TableHead>
                      <TableHead className="text-center">Siswa</TableHead>
                      <TableHead>Tahun Ajaran</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => {
                      const studentCount = c._count?.students ?? 0;
                      const overCapacity = c.capacity && studentCount > c.capacity;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>
                            {c.grade ? (
                              <Badge variant="secondary">Tingkat {c.grade}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>{c.major || <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                          <TableCell>
                            {c.homeroomTeacher ? (
                              <span className="inline-flex items-center gap-1.5 text-sm">
                                <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                                {c.homeroomTeacher.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {c.room ? (
                              <span className="inline-flex items-center gap-1 text-sm">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                {c.room}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{c.capacity ?? "—"}</TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center gap-1 text-sm font-medium ${overCapacity ? "text-destructive" : ""}`}>
                              <Users className="h-3.5 w-3.5" />
                              {studentCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.academicYear || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => openEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeleteId(c.id);
                                setDeleteName(c.name);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Hapus
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Data Kelas" : "Tambah Kelas Baru"}</DialogTitle>
            <DialogDescription>
              Lengkapi formulir di bawah. Wali kelas opsional &mdash; pilih dari daftar guru.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-name">Nama Kelas *</Label>
                <Input
                  id="c-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="contoh: XII IPA 1"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-grade">Tingkat</Label>
                <Select value={form.grade || "none"} onValueChange={(v) => set("grade", v === "none" ? "" : v)}>
                  <SelectTrigger id="c-grade"><SelectValue placeholder="Pilih tingkat" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {gradeOptions.map((g) => (
                      <SelectItem key={g} value={g}>Tingkat {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-major">Jurusan / Program</Label>
                <Input
                  id="c-major"
                  value={form.major}
                  onChange={(e) => set("major", e.target.value)}
                  placeholder="contoh: IPA / IPS / TKJ"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-room">Ruangan</Label>
                <Input
                  id="c-room"
                  value={form.room}
                  onChange={(e) => set("room", e.target.value)}
                  placeholder="contoh: R. 201 Lt. 2"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-capacity">Kapasitas (jumlah siswa)</Label>
                <Input
                  id="c-capacity"
                  type="number"
                  min={0}
                  value={form.capacity}
                  onChange={(e) => set("capacity", e.target.value)}
                  placeholder="contoh: 36"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-year">Tahun Ajaran</Label>
                <Input
                  id="c-year"
                  value={form.academicYear}
                  onChange={(e) => set("academicYear", e.target.value)}
                  placeholder="contoh: 2025/2026"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="c-homeroom">Wali Kelas</Label>
                <Select
                  value={form.homeroomTeacherId || "none"}
                  onValueChange={(v) => set("homeroomTeacherId", v)}
                >
                  <SelectTrigger id="c-homeroom">
                    <SelectValue placeholder="Pilih wali kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada wali kelas —</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.position ? `(${t.position})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="c-desc">Keterangan</Label>
                <Textarea
                  id="c-desc"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Catatan tambahan tentang kelas ini"
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
            <AlertDialogTitle>Hapus Data Kelas?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus kelas <strong>{deleteName}</strong>. Tindakan ini tidak dapat dibatalkan.
              Kelas yang masih memiliki siswa tidak dapat dihapus.
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
