"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Plus, Pencil, Trash2, Loader2, SearchX } from "lucide-react";
import Image from "next/image";
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
import { fmtDateDisplay } from "./_format";

interface Galeri {
  id: number;
  judul: string;
  konten: string;
  gambarUrl?: string | null;
  kategori?: string | null;
  tanggalPosting: string;
}

const KATEGORI_LIST = ["Berita", "Galeri", "Pengumuman"];
const KATEGORI_COLOR: Record<string, string> = {
  Berita: "bg-slate-700 text-white",
  Galeri: "bg-violet-100 text-violet-700",
  Pengumuman: "bg-amber-100 text-amber-700",
};

export function GaleriSection() {
  const [list, setList] = useState<Galeri[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKat, setFilterKat] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Galeri>>({});
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Galeri | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/galeri");
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat galeri", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (filterKat === "all") return list;
    return list.filter((g) => g.kategori === filterKat);
  }, [list, filterKat]);

  const handleAdd = () => {
    setEditing({ judul: "", konten: "", kategori: "Berita", gambarUrl: null });
    setDialogOpen(true);
  };
  const handleEdit = (g: Galeri) => {
    setEditing({ ...g });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing.judul || !editing.konten) {
      toast({ title: "Judul dan konten wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        judul: editing.judul,
        konten: editing.konten,
        kategori: editing.kategori || "Berita",
        gambarUrl: editing.gambarUrl || null,
      };
      const url = editing.id ? `/api/galeri/${editing.id}` : "/api/galeri";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "Item diperbarui" : "Item ditambahkan" });
      setDialogOpen(false);
      setEditing({});
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
      const r = await fetch(`/api/galeri/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Item dihapus" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Galeri & Berita
            </h3>
            <p className="text-xs text-slate-500">Publikasi berita & dokumentasi sekolah</p>
          </div>
          <Button size="sm" onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>

        <Select value={filterKat} onValueChange={setFilterKat}>
          <SelectTrigger className="w-full sm:w-48 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {KATEGORI_LIST.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
          </SelectContent>
        </Select>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada item.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map((g) => (
              <div key={g.id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow flex flex-col">
                <div className="relative aspect-video bg-slate-100">
                  {g.gambarUrl ? (
                    <Image src={g.gambarUrl} alt={g.judul} fill unoptimized className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge className={`${KATEGORI_COLOR[g.kategori || ""] || ""} text-[10px]`}>{g.kategori || "-"}</Badge>
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <h4 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">{g.judul}</h4>
                  <p className="text-xs text-slate-500 mt-1">{fmtDateDisplay(g.tanggalPosting)}</p>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 flex-1">{g.konten}</p>
                  <div className="flex gap-1 mt-2 pt-2 border-t border-slate-100">
                    <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => handleEdit(g)}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-600 hover:bg-rose-50" onClick={() => setDelTarget(g)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Hapus
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing({}); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit Item" : "Tambah Item"}</DialogTitle>
            <DialogDescription>Buat berita/galeri/pengumuman baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Judul *</Label>
              <Input value={String(editing.judul ?? "")} onChange={(e) => setEditing((p) => ({ ...p, judul: e.target.value }))} placeholder="Judul berita/galeri" />
            </div>
            <div>
              <Label className="text-sm">Kategori</Label>
              <Select value={String(editing.kategori ?? "Berita")} onValueChange={(v) => setEditing((p) => ({ ...p, kategori: v }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KATEGORI_LIST.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Konten *</Label>
              <Textarea value={String(editing.konten ?? "")} onChange={(e) => setEditing((p) => ({ ...p, konten: e.target.value }))} rows={5} placeholder="Isi berita/konten..." />
            </div>
            <div>
              <Label className="text-sm">Gambar</Label>
              <ImageUpload
                value={editing.gambarUrl ?? null}
                onChange={(url) => setEditing((p) => ({ ...p, gambarUrl: url }))}
                shape="rounded"
                size="md"
              />
            </div>
          </div>
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
            <AlertDialogTitle>Hapus item?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin menghapus "{delTarget?.judul}"? Tindakan tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default GaleriSection;
