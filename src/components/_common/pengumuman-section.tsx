"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, Plus, Pencil, Trash2, Loader2, SearchX } from "lucide-react";
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
import { fmtDateDisplay } from "./_format";

interface Pengumuman {
  id: number;
  judul: string;
  isi: string;
  target: string;
  tanggalPosting: string;
  pegawai: { id: number; nama: string; jabatan?: string | null } | null;
}

const TARGET_LIST = ["Semua", "Siswa", "Ortu", "Guru"];
const TARGET_COLOR: Record<string, string> = {
  Semua: "bg-slate-700 text-white",
  Siswa: "bg-emerald-100 text-emerald-700",
  Ortu: "bg-amber-100 text-amber-700",
  Guru: "bg-violet-100 text-violet-700",
};

export function PengumumanSection() {
  const [list, setList] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Pengumuman>>({});
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Pengumuman | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/pengumuman");
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat pengumuman", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((p) => p.judul.toLowerCase().includes(q) || p.isi.toLowerCase().includes(q));
  }, [list, search]);

  const handleAdd = () => {
    setEditing({ judul: "", isi: "", target: "Semua" });
    setDialogOpen(true);
  };
  const handleEdit = (p: Pengumuman) => {
    setEditing({ ...p });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing.judul || !editing.isi) {
      toast({ title: "Judul dan isi wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        judul: editing.judul,
        isi: editing.isi,
        target: editing.target || "Semua",
      };
      const url = editing.id ? `/api/pengumuman/${editing.id}` : "/api/pengumuman";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "Pengumuman diperbarui" : "Pengumuman ditambahkan" });
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
      const r = await fetch(`/api/pengumuman/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Pengumuman dihapus" });
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
              <Megaphone className="h-4 w-4" /> Pengumuman
            </h3>
            <p className="text-xs text-slate-500">Broadcast informasi ke warga sekolah</p>
          </div>
          <Button size="sm" onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>

        <div className="relative w-full max-w-md">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <Input placeholder="Cari judul/isi..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada pengumuman.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map((p) => (
              <div key={p.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm leading-snug">{p.judul}</h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className={`${TARGET_COLOR[p.target] || ""} text-[10px]`}>{p.target}</Badge>
                      <span className="text-[10px] text-slate-500">{fmtDateDisplay(p.tanggalPosting)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => setDelTarget(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 line-clamp-3 whitespace-pre-wrap">{p.isi}</p>
                <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                  Diposting oleh: {p.pegawai?.nama || "-"}{p.pegawai?.jabatan ? ` (${p.pegawai.jabatan})` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing({}); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit Pengumuman" : "Tambah Pengumuman"}</DialogTitle>
            <DialogDescription>Broadcast informasi ke target tertentu</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Judul *</Label>
              <Input value={String(editing.judul ?? "")} onChange={(e) => setEditing((p) => ({ ...p, judul: e.target.value }))} placeholder="Judul pengumuman" />
            </div>
            <div>
              <Label className="text-sm">Target</Label>
              <Select value={String(editing.target ?? "Semua")} onValueChange={(v) => setEditing((p) => ({ ...p, target: v }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TARGET_LIST.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Isi *</Label>
              <Textarea value={String(editing.isi ?? "")} onChange={(e) => setEditing((p) => ({ ...p, isi: e.target.value }))} rows={6} placeholder="Isi pengumuman..." />
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
            <AlertDialogTitle>Hapus pengumuman?</AlertDialogTitle>
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

export default PengumumanSection;
